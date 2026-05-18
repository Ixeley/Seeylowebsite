import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  const sig = event.headers["stripe-signature"];
  if (!sig) return { statusCode: 400, body: "Missing signature" };

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body!, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err instanceof Error ? err.message : "unknown"}` };
  }

  const upsertSubscription = async (sub: Stripe.Subscription) => {
    const userId = sub.metadata?.userId ?? (sub as unknown as { client_reference_id?: string }).client_reference_id;
    if (!userId) return;

    const item = sub.items.data[0];
    const plan = sub.metadata?.plan;
    const period = sub.metadata?.period;

    await supabase.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      stripe_subscription_id: sub.id,
      plan: plan ?? null,
      billing_period: period ?? null,
      status: sub.status,
      current_period_end: new Date((item?.current_period_end ?? 0) * 1000).toISOString(),
    }, { onConflict: "user_id" });
  };

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.CheckoutSession;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        // Attach metadata from session to subscription
        if (session.metadata?.userId) {
          await stripe.subscriptions.update(sub.id, {
            metadata: { userId: session.metadata.userId, plan: session.metadata.plan, period: session.metadata.period },
          });
          const updated = await stripe.subscriptions.retrieve(sub.id);
          await upsertSubscription(updated);
        } else {
          await upsertSubscription(sub);
        }
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
      await upsertSubscription(stripeEvent.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted": {
      const sub = stripeEvent.data.object as Stripe.Subscription;
      await supabase.from("subscriptions")
        .update({ status: "canceled" })
        .eq("stripe_subscription_id", sub.id);
      break;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
