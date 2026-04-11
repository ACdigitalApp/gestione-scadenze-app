import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const APP_PRODUCTS: Record<string, { name: string; productId: string }> = {
  djsengine:        { name: 'DJSEngine',          productId: 'prod_UJBUiQmIriAp4Y' },
  librifree:        { name: 'LibriFree',           productId: 'prod_UJCRtdvHaNeVA'  },
  gestionescadenze: { name: 'Gestione Scadenze',   productId: 'prod_Tr6P4Lko2q1sHh' },
  gestionepassword: { name: 'Gestione Password',   productId: 'prod_UDBpY5boOmqxe4' },
  speakeasy:        { name: 'Speak & Translate',   productId: 'prod_UJBcr0HFEhAdTA' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe non configurato' });
  }

  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
      expand: ['data.items.data.price.product'],
    });

    const productToApp: Record<string, string> = {};
    for (const [key, cfg] of Object.entries(APP_PRODUCTS)) {
      productToApp[cfg.productId] = key;
    }

    const revenue: Record<string, { amount: number; users: number }> = {};
    for (const key of Object.keys(APP_PRODUCTS)) {
      revenue[key] = { amount: 0, users: 0 };
    }

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const product = item.price.product;
        const productId = typeof product === 'string' ? product : (product as Stripe.Product).id;
        const appKey = productToApp[productId];
        if (!appKey) continue;

        revenue[appKey].users++;
        const unitAmount = item.price.unit_amount ?? 0;
        const interval = item.price.recurring?.interval;
        const monthly = interval === 'year' ? unitAmount / 12 / 100 : unitAmount / 100;
        revenue[appKey].amount += monthly;
      }
    }

    const totalAmount = Object.values(revenue).reduce((s, d) => s + d.amount, 0);
    const totalUsers = Object.values(revenue).reduce((s, d) => s + d.users, 0);

    return res.status(200).json({ revenue, totalAmount, totalUsers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return res.status(500).json({ error: message });
  }
}
