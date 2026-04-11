import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product IDs per ogni app (stesso account Stripe)
const APP_PRODUCTS: Record<string, { name: string; productId: string }> = {
  djsengine:        { name: "DJSEngine",          productId: "prod_UJBUiQmIriAp4Y" },
  librifree:        { name: "LibriFree",           productId: "prod_UJCRtdvHaNeVA"  },
  gestionescadenze: { name: "Gestione Scadenze",   productId: "prod_Tr6P4Lko2q1sHh" },
  gestionepassword: { name: "Gestione Password",   productId: "prod_UDBpY5boOmqxe4" },
  speakeasy:        { name: "Speak & Translate",   productId: "prod_UJBcr0HFEhAdTA" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe non configurato" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Recupera tutte le subscription attive (max 100, expand product)
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price.product"],
    });

    // Mappa productId → chiave app
    const productToApp: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(APP_PRODUCTS)) {
      productToApp[cfg.productId] = key;
    }

    // Calcola revenue e utenti per app
    const revenue: Record<string, { amount: number; users: number }> = {};
    for (const key of Object.keys(APP_PRODUCTS)) {
      revenue[key] = { amount: 0, users: 0 };
    }

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const product = item.price.product;
        const productId = typeof product === "string" ? product : (product as Stripe.Product).id;
        const appKey = productToApp[productId];
        if (!appKey) continue;

        revenue[appKey].users++;
        const unitAmount = item.price.unit_amount ?? 0;
        const interval = item.price.recurring?.interval;
        // Normalizza a mensile
        const monthly = interval === "year" ? unitAmount / 12 / 100 : unitAmount / 100;
        revenue[appKey].amount += monthly;
      }
    }

    // Totale generale
    const totalAmount = Object.values(revenue).reduce((s, d) => s + d.amount, 0);
    const totalUsers = Object.values(revenue).reduce((s, d) => s + d.users, 0);

    return new Response(
      JSON.stringify({ revenue, totalAmount, totalUsers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Errore sconosciuto";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
