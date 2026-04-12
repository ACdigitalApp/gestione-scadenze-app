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

  // Accept either a valid JWT (real admin) or the bypass token
  const authHeader = req.headers.get("authorization") ?? "";
  const bypassToken = req.headers.get("x-admin-token") ?? "";

  const isValidBypass = bypassToken === BYPASS_TOKEN;
  const hasJwt = authHeader.startsWith("Bearer ");

  if (!isValidBypass && !hasJwt) {
    return new Response(JSON.stringify({ error: "Non autorizzato" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Configurazione server mancante" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // If real JWT, verify the user is actually admin before proceeding
  if (hasJwt && !isValidBypass) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ error: "JWT non valido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accesso negato: ruolo admin richiesto" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all auth users (includes email)
    const { data: authData, error: authError } =
      await adminClient.auth.admin.listUsers({ perPage: 1000 });
    if (authError) throw authError;

    const authUsers = authData?.users ?? [];

    // Get all profiles
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select(
        "id, full_name, avatar_url, notification_enabled, whatsapp_number, created_at, updated_at, subscription_plan, subscription_status, stripe_customer_id, trial_end_date"
      );
    if (profilesError) throw profilesError;

    // Get all user roles
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("user_id, role");

    // Build lookup maps
    const profilesMap: Record<string, typeof profiles[0]> = {};
    (profiles ?? []).forEach((p) => {
      profilesMap[p.id] = p;
    });

    const rolesMap: Record<string, string> = {};
    (roles ?? []).forEach((r: { user_id: string; role: string }) => {
      rolesMap[r.user_id] = r.role;
    });

    // Merge auth users with profiles
    const users = authUsers.map((authUser) => {
      const profile = profilesMap[authUser.id] ?? {};
      return {
        id: authUser.id,
        email: authUser.email ?? null,
        full_name: (profile as { full_name?: string | null }).full_name ?? authUser.user_metadata?.full_name ?? null,
        avatar_url: (profile as { avatar_url?: string | null }).avatar_url ?? null,
        notification_enabled: (profile as { notification_enabled?: boolean | null }).notification_enabled ?? false,
        whatsapp_number: (profile as { whatsapp_number?: string | null }).whatsapp_number ?? null,
        created_at: (profile as { created_at?: string | null }).created_at ?? authUser.created_at ?? null,
        updated_at: (profile as { updated_at?: string | null }).updated_at ?? null,
        subscription_plan: (profile as { subscription_plan?: string | null }).subscription_plan ?? "free",
        subscription_status: (profile as { subscription_status?: string | null }).subscription_status ?? "active",
        stripe_customer_id: (profile as { stripe_customer_id?: string | null }).stripe_customer_id ?? null,
        trial_end_date: (profile as { trial_end_date?: string | null }).trial_end_date ?? null,
        role: rolesMap[authUser.id] ?? "user",
        total_paid: 0,
        balance: 0,
      };
    });

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
