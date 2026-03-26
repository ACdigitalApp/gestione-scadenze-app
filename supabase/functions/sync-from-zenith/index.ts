import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  'https://gestionescadenze.app',
  'https://www.gestionescadenze.app',
  'https://fdeaa805-c9b8-4bdb-8faa-04b1243917f8.lovableproject.com',
  'http://localhost:8080',
  'http://localhost:5173',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

interface SyncResult {
  success: boolean;
  synced: {
    transactions: number;
    categories: number;
    reminders: number;
    payment_methods: number;
  };
  errors: string[];
  timestamp: string;
}

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const logId = crypto.randomUUID();
  const startTime = new Date().toISOString();
  
  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get local Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const localSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body for triggeredBy info
    let triggeredBy = 'unknown';
    try {
      const body = await req.json();
      triggeredBy = body.triggeredBy || 'manual';
    } catch {
      triggeredBy = 'manual';
    }

    // Verify user is admin (if not a cron/system call)
    if (triggeredBy !== 'cron') {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await localSupabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authorization' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: isAdmin, error: adminError } = await localSupabase.rpc('is_admin', { _user_id: user.id });
      
      if (adminError || !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get Zenith Supabase credentials
    const zenithUrl = Deno.env.get("ZENITH_SUPABASE_URL") || "https://igptngecujtkofhbzjmj.supabase.co";
    const zenithServiceKey = Deno.env.get("ZENITH_SUPABASE_SERVICE_ROLE_KEY");
    
    if (!zenithServiceKey) {
      throw new Error("ZENITH_SUPABASE_SERVICE_ROLE_KEY not configured");
    }

    // Create Zenith Supabase client
    const zenithSupabase = createClient(zenithUrl, zenithServiceKey);

    // Get last sync time
    const { data: syncSettings } = await localSupabase
      .from('sync_settings')
      .select('last_sync_at')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const lastSyncAt = syncSettings?.last_sync_at || '2000-01-01T00:00:00Z';

    // Initialize sync result
    const result: SyncResult = {
      success: false,
      synced: {
        transactions: 0,
        categories: 0,
        reminders: 0,
        payment_methods: 0,
      },
      errors: [],
      timestamp: new Date().toISOString(),
    };

    // Create sync log entry
    await localSupabase.from('sync_logs').insert({
      id: logId,
      sync_type: 'zenith-import',
      status: 'partial',
      started_at: startTime,
      triggered_by: triggeredBy,
    });

    // Sync categories first (needed for foreign keys)
    try {
      const categoriesCount = await syncCategories(zenithSupabase, localSupabase, lastSyncAt);
      result.synced.categories = categoriesCount;
    } catch (error: any) {
      result.errors.push(`Categories sync error: ${error.message}`);
      console.error('Categories sync error:', error);
    }

    // Sync payment methods
    try {
      const paymentMethodsCount = await syncPaymentMethods(zenithSupabase, localSupabase, lastSyncAt);
      result.synced.payment_methods = paymentMethodsCount;
    } catch (error: any) {
      result.errors.push(`Payment methods sync error: ${error.message}`);
      console.error('Payment methods sync error:', error);
    }

    // Sync transactions
    try {
      const transactionsCount = await syncTransactions(zenithSupabase, localSupabase, lastSyncAt);
      result.synced.transactions = transactionsCount;
    } catch (error: any) {
      result.errors.push(`Transactions sync error: ${error.message}`);
      console.error('Transactions sync error:', error);
    }

    // Sync reminders
    try {
      const remindersCount = await syncReminders(zenithSupabase, localSupabase, lastSyncAt);
      result.synced.reminders = remindersCount;
    } catch (error: any) {
      result.errors.push(`Reminders sync error: ${error.message}`);
      console.error('Reminders sync error:', error);
    }

    // Update sync log and settings
    const totalSynced = Object.values(result.synced).reduce((a, b) => a + b, 0);
    result.success = result.errors.length === 0;
    
    await localSupabase.from('sync_logs').update({
      status: result.success ? 'success' : (totalSynced > 0 ? 'partial' : 'failed'),
      records_synced: totalSynced,
      records_failed: result.errors.length,
      error_details: result.errors.length > 0 ? { errors: result.errors } : null,
      completed_at: new Date().toISOString(),
    }).eq('id', logId);

    await localSupabase.from('sync_settings').update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', '00000000-0000-0000-0000-000000000001');

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-from-zenith function:", error);
    
    // Update sync log as failed
    const localSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await localSupabase.from('sync_logs').update({
      status: 'failed',
      error_details: { error: error.message },
      completed_at: new Date().toISOString(),
    }).eq('id', logId);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function syncCategories(
  zenithSupabase: any,
  localSupabase: any,
  lastSyncAt: string
): Promise<number> {
  let syncedCount = 0;
  let offset = 0;

  while (true) {
    const { data: categories, error } = await zenithSupabase
      .from('categories')
      .select('*')
      .gte('created_at', lastSyncAt)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw error;
    if (!categories || categories.length === 0) break;

    for (const category of categories) {
      try {
        // Check if category already exists
        const { data: existing } = await localSupabase
          .from('categories')
          .select('id, updated_at')
          .eq('zenith_id', category.id)
          .eq('user_id', category.user_id)
          .single();

        const mappedCategory = {
          user_id: category.user_id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          is_default: category.is_default || false,
          parent_id: category.parent_id,
          zenith_id: category.id,
          created_at: category.created_at,
        };

        if (existing) {
          // Update if Zenith version is newer
          const zenithUpdated = new Date(category.created_at);
          const localUpdated = new Date(existing.updated_at);
          
          if (zenithUpdated > localUpdated) {
            await localSupabase
              .from('categories')
              .update(mappedCategory)
              .eq('id', existing.id);
            syncedCount++;
          }
        } else {
          // Insert new category
          await localSupabase
            .from('categories')
            .insert(mappedCategory);
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`Error syncing category ${category.id}:`, error);
      }
    }

    offset += BATCH_SIZE;
  }

  return syncedCount;
}

async function syncPaymentMethods(
  zenithSupabase: any,
  localSupabase: any,
  lastSyncAt: string
): Promise<number> {
  let syncedCount = 0;
  let offset = 0;

  while (true) {
    const { data: methods, error } = await zenithSupabase
      .from('payment_methods')
      .select('*')
      .gte('created_at', lastSyncAt)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw error;
    if (!methods || methods.length === 0) break;

    for (const method of methods) {
      try {
        const { data: existing } = await localSupabase
          .from('payment_methods')
          .select('id, updated_at')
          .eq('zenith_id', method.id)
          .eq('user_id', method.user_id)
          .single();

        const mappedMethod = {
          user_id: method.user_id,
          name: method.name,
          icon: method.icon,
          color: method.color,
          is_default: method.is_default || false,
          zenith_id: method.id,
          created_at: method.created_at,
        };

        if (existing) {
          const zenithUpdated = new Date(method.created_at);
          const localUpdated = new Date(existing.updated_at);
          
          if (zenithUpdated > localUpdated) {
            await localSupabase
              .from('payment_methods')
              .update(mappedMethod)
              .eq('id', existing.id);
            syncedCount++;
          }
        } else {
          await localSupabase
            .from('payment_methods')
            .insert(mappedMethod);
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`Error syncing payment method ${method.id}:`, error);
      }
    }

    offset += BATCH_SIZE;
  }

  return syncedCount;
}

async function syncTransactions(
  zenithSupabase: any,
  localSupabase: any,
  lastSyncAt: string
): Promise<number> {
  let syncedCount = 0;
  let offset = 0;

  while (true) {
    const { data: transactions, error } = await zenithSupabase
      .from('transactions')
      .select('*')
      .gte('created_at', lastSyncAt)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw error;
    if (!transactions || transactions.length === 0) break;

    for (const transaction of transactions) {
      try {
        const { data: existing } = await localSupabase
          .from('transactions')
          .select('id, updated_at')
          .eq('zenith_id', transaction.id)
          .eq('user_id', transaction.user_id)
          .single();

        // Map category_id from Zenith to local if it exists
        let localCategoryId = transaction.category_id;
        if (transaction.category_id) {
          const { data: category } = await localSupabase
            .from('categories')
            .select('id')
            .eq('zenith_id', transaction.category_id)
            .eq('user_id', transaction.user_id)
            .single();
          
          localCategoryId = category?.id || null;
        }

        const mappedTransaction = {
          user_id: transaction.user_id,
          type: transaction.type,
          amount: transaction.amount,
          paid_amount: transaction.paid_amount || 0,
          category_id: localCategoryId,
          description: transaction.description,
          date: transaction.date,
          start_date: transaction.start_date,
          end_date: transaction.end_date,
          is_partial: transaction.is_partial || false,
          recurring: transaction.recurring || 'none',
          attachment_url: transaction.attachment_url,
          zenith_id: transaction.id,
          created_at: transaction.created_at,
        };

        if (existing) {
          const zenithUpdated = new Date(transaction.created_at);
          const localUpdated = new Date(existing.updated_at);
          
          if (zenithUpdated > localUpdated) {
            await localSupabase
              .from('transactions')
              .update(mappedTransaction)
              .eq('id', existing.id);
            syncedCount++;
          }
        } else {
          await localSupabase
            .from('transactions')
            .insert(mappedTransaction);
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`Error syncing transaction ${transaction.id}:`, error);
      }
    }

    offset += BATCH_SIZE;
  }

  return syncedCount;
}

async function syncReminders(
  zenithSupabase: any,
  localSupabase: any,
  lastSyncAt: string
): Promise<number> {
  let syncedCount = 0;
  let offset = 0;

  while (true) {
    const { data: reminders, error } = await zenithSupabase
      .from('reminders')
      .select('*')
      .gte('created_at', lastSyncAt)
      .order('created_at', { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw error;
    if (!reminders || reminders.length === 0) break;

    for (const reminder of reminders) {
      try {
        const { data: existing } = await localSupabase
          .from('reminders')
          .select('id, updated_at')
          .eq('zenith_id', reminder.id)
          .eq('user_id', reminder.user_id)
          .single();

        const mappedReminder = {
          user_id: reminder.user_id,
          title: reminder.title,
          description: reminder.description,
          due_date: reminder.due_date,
          completed: reminder.completed || false,
          zenith_id: reminder.id,
          created_at: reminder.created_at,
        };

        if (existing) {
          const zenithUpdated = new Date(reminder.created_at);
          const localUpdated = new Date(existing.updated_at);
          
          if (zenithUpdated > localUpdated) {
            await localSupabase
              .from('reminders')
              .update(mappedReminder)
              .eq('id', existing.id);
            syncedCount++;
          }
        } else {
          await localSupabase
            .from('reminders')
            .insert(mappedReminder);
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`Error syncing reminder ${reminder.id}:`, error);
      }
    }

    offset += BATCH_SIZE;
  }

  return syncedCount;
}
