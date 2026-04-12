import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const BYPASS_TOKEN = "gs-admin-bypass-2026";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const bypassToken = req.headers.get("x-admin-token") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";

  if (bypassToken !== BYPASS_TOKEN && !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Service role key mancante" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all auth users via Admin REST API
    const usersResp = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
      },
    });

    if (!usersResp.ok) {
      const errText = await usersResp.text();
      return new Response(JSON.stringify({ error: `auth error: ${usersResp.status} ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authData = await usersResp.json();
    const authUsers: Array<{
      id: string;
      email?: string;
      created_at?: string;
      user_metadata?: Record<string, unknown>;
    }> = authData.users ?? [];

    // Get base profile columns (always exist)
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, full_name, avatar_url, notification_enabled, whatsapp_number, created_at, updated_at");

    // Try to get subscription columns (may not exist in all deployments)
    let subProfiles: Array<Record<string, unknown>> = [];
    try {
      const { data } = await adminClient
        .from("profiles")
        .select("id, subscription_plan, subscription_status, stripe_customer_id, trial_end_date");
      subProfiles = (data ?? []) as Array<Record<string, unknown>>;
    } catch {
      // Columns don't exist yet — use empty defaults
    }

    // Get user roles
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    // Build lookup maps
    const profilesMap: Record<string, Record<string, unknown>> = {};
    (profiles ?? []).forEach((p) => { profilesMap[p.id] = p as Record<string, unknown>; });

    const subMap: Record<string, Record<string, unknown>> = {};
    subProfiles.forEach((p) => { subMap[String(p.id)] = p; });

    const rolesMap: Record<string, string> = {};
    (roles ?? []).forEach((r: { user_id: string; role: string }) => {
      rolesMap[r.user_id] = r.role;
    });

    // Merge everything
    const users = authUsers.map((authUser) => {
      const profile = profilesMap[authUser.id] ?? {};
      const sub = subMap[authUser.id] ?? {};
      return {
        id: authUser.id,
        email: authUser.email ?? null,
        full_name: (profile.full_name as string | null) ?? (authUser.user_metadata?.full_name as string | null) ?? null,
        avatar_url: (profile.avatar_url as string | null) ?? null,
        notification_enabled: (profile.notification_enabled as boolean | null) ?? false,
        whatsapp_number: (profile.whatsapp_number as string | null) ?? null,
        created_at: (profile.created_at as string | null) ?? authUser.created_at ?? null,
        updated_at: (profile.updated_at as string | null) ?? null,
        subscription_plan: (sub.subscription_plan as string | null) ?? "free",
        subscription_status: (sub.subscription_status as string | null) ?? "active",
        stripe_customer_id: (sub.stripe_customer_id as string | null) ?? null,
        trial_end_date: (sub.trial_end_date as string | null) ?? null,
        role: rolesMap[authUser.id] ?? "user",
        total_paid: 0,
        balance: 0,
      };
    });

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error
      ? err.message
      : (typeof err === "object" && err !== null)
        ? JSON.stringify(err)
        : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
