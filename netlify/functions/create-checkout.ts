import type { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

// Price IDs from Stripe dashboard — set these in Netlify env vars
const PRICE_IDS: Record<string, Record<string, string>> = {
  basic:    { weekly: process.env.STRIPE_BASIC_WEEKLY!, monthly: process.env.STRIPE_BASIC_MONTHLY!, yearly: process.env.STRIPE_BASIC_YEARLY! },
  pro:      { weekly: process.env.STRIPE_PRO_WEEKLY!,   monthly: process.env.STRIPE_PRO_MONTHLY!,   yearly: process.env.STRIPE_PRO_YEARLY! },
  platinum: { weekly: process.env.STRIPE_PLATINUM_WEEKLY!, monthly: process.env.STRIPE_PLATINUM_MONTHLY!, yearly: process.env.STRIPE_PLATINUM_YEARLY! },
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const { plan, period, userId, email, successUrl, cancelUrl } = JSON.parse(event.body ?? "{}");

    const priceId = PRICE_IDS[plan]?.[period];
    if (!priceId) return { statusCode: 400, body: JSON.stringify({ error: "Invalid plan or period" }) };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      metadata: { userId, plan, period },
      success_url: successUrl ?? `${process.env.URL}/profile?checkout=success`,
      cancel_url: cancelUrl ?? `${process.env.URL}/pricing`,
      subscription_data: { metadata: { userId, plan, period } },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }
};
