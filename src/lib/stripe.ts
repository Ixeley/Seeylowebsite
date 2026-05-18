export async function createCheckoutSession(params: {
  plan: "basic" | "pro" | "platinum";
  period: "weekly" | "monthly" | "yearly";
  userId: string;
  email: string;
}): Promise<string> {
  const res = await fetch("/.netlify/functions/create-checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      successUrl: `${window.location.origin}/profile?checkout=success`,
      cancelUrl: `${window.location.origin}/pricing`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Checkout failed");
  }
  const { url } = await res.json();
  return url;
}

export const PLANS = {
  basic: {
    name: "Basic",
    tagline: "For casual traders",
    color: "text-blue-400",
    border: "border-blue-400/30",
    bg: "bg-blue-400/5",
    daily: 2,
    monthly: 16.99,
    weekly: 5.99,
    yearlyMonthly: 11.99,  // per month billed yearly
    yearlyTotal: 143.88,
    features: [
      "2 analyses per day",
      "Fast & Standard entry modes",
      "TP probability bars",
      "All trade styles (Scalp / Day / Swing)",
      "7-day analysis history",
      "Basic chart annotation",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "For active traders",
    color: "text-primary",
    border: "border-primary/40",
    bg: "bg-primary/8",
    popular: true,
    daily: 10,
    monthly: 27.99,
    weekly: 8.99,
    yearlyMonthly: 19.99,
    yearlyTotal: 239.88,
    features: [
      "10 analyses per day",
      "Everything in Basic",
      "Zone boxes on chart (OB / FVG / S-R)",
      "News impact analysis",
      "Re-analyze same chart",
      "30-day analysis history",
    ],
  },
  platinum: {
    name: "Platinum",
    tagline: "For professional traders",
    color: "text-yellow-400",
    border: "border-yellow-400/30",
    bg: "bg-yellow-400/5",
    daily: 20,
    monthly: 49.99,
    weekly: 14.99,
    yearlyMonthly: 34.99,
    yearlyTotal: 419.88,
    features: [
      "20 analyses per day",
      "Everything in Pro",
      "Unlimited analysis history",
      "Priority AI processing",
      "Multi-timeframe analysis hint",
      "Early access to new features",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type BillingPeriod = "weekly" | "monthly" | "yearly";

export function getPlanPrice(plan: PlanKey, period: BillingPeriod): number {
  const p = PLANS[plan];
  if (period === "weekly") return p.weekly;
  if (period === "yearly") return p.yearlyMonthly;
  return p.monthly;
}

export function getPlanSavings(plan: PlanKey, period: BillingPeriod): string | null {
  if (period === "weekly") return null;
  if (period === "yearly") {
    const monthlyCost = PLANS[plan].monthly * 12;
    const pct = Math.round((1 - PLANS[plan].yearlyTotal / monthlyCost) * 100);
    return `Save ${pct}%`;
  }
  return null;
}
