import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Check, Zap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Seeylo AI" },
      { name: "description", content: "Simple pricing for traders. Free, Basic, Pro, and Platinum plans for AI chart analysis." },
    ],
  }),
  component: Pricing,
});

type Billing = "weekly" | "monthly" | "yearly";

const PRICES: Record<string, Partial<Record<Billing, { id: string; amount: string; note?: string }>>> = {
  basic: {
    monthly: { id: "price_1TYUzdAFPCa1P8v5O41R8crG", amount: "€16.99" },
    yearly:  { id: "price_1TYV0LAFPCa1P8v59mzxNDUL", amount: "€143.88", note: "€11.99/mo" },
  },
  pro: {
    weekly:  { id: "price_1TYV0xAFPCa1P8v596ttjOP3", amount: "€8.99" },
    monthly: { id: "price_1TYV1OAFPCa1P8v5BI27eJXo", amount: "€27.99" },
    yearly:  { id: "price_1TYV1nAFPCa1P8v5KhlUvsv7", amount: "€239.88", note: "€19.99/mo" },
  },
  platinum: {
    weekly:  { id: "price_1TYV29AFPCa1P8v5BdCsFPVU", amount: "€14.99" },
    monthly: { id: "price_1TYV2jAFPCa1P8v5sE3jLzfl", amount: "€49.99" },
    yearly:  { id: "price_1TYV32AFPCa1P8v5aXuG2ugG", amount: "€419.88", note: "€34.99/mo" },
  },
};

async function startCheckout(priceId: string): Promise<void> {
  const res = await fetch("/.netlify/functions/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Something went wrong" }));
    throw new Error(data.error || "Checkout failed");
  }

  const { url } = await res.json();
  window.location.href = url;
}

const TIERS = [
  {
    key: "free",
    name: "Free",
    tagline: "Get started",
    features: [
      "3 analyses per day",
      "All markets supported",
      "Basic AI confidence score",
      "Standard analysis speed",
    ],
    cta: "Start free",
    popular: false,
  },
  {
    key: "basic",
    name: "Basic",
    tagline: "For casual traders",
    features: [
      "Unlimited analyses",
      "Advanced AI reasoning",
      "Multi-timeframe confluence",
      "Priority analysis speed",
      "Save & track history",
      "Email support",
    ],
    cta: "Get Basic",
    popular: false,
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "For active traders",
    features: [
      "Everything in Basic",
      "API access",
      "Custom alert webhooks",
      "Multi-account support",
      "Priority queue",
      "Priority support",
    ],
    cta: "Get Pro",
    popular: true,
  },
  {
    key: "platinum",
    name: "Platinum",
    tagline: "For desks & quants",
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Backtesting tools",
      "Custom integrations",
      "White-label reports",
      "Dedicated support",
    ],
    cta: "Go Platinum",
    popular: false,
  },
];

const BILLING_OPTIONS: { label: string; value: Billing }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
];

function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planKey: string) => {
    const price = PRICES[planKey]?.[billing] ?? PRICES[planKey]?.monthly;
    if (!price) return;
    setLoading(planKey);
    try {
      await startCheckout(price.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setLoading(null);
    }
  };

  const getPrice = (planKey: string) => {
    if (planKey === "free") return { amount: "€0", note: undefined };
    const p = PRICES[planKey]?.[billing] ?? PRICES[planKey]?.monthly;
    return p ?? { amount: "—", note: undefined };
  };

  const billingLabel = (b: Billing) => (b === "weekly" ? "wk" : b === "yearly" ? "yr" : "mo");

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient">Simple, trader-friendly pricing</h1>
          <p className="text-muted-foreground mt-4">Start free. Upgrade when you're ready to scale your edge.</p>

          <div className="mt-8 inline-flex items-center gap-1 glass rounded-full p-1.5">
            {BILLING_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setBilling(value)}
                className={`px-4 py-1.5 text-sm rounded-full transition flex items-center gap-2 ${
                  billing === value
                    ? "bg-primary text-primary-foreground glow-primary-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {value === "yearly" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bullish/20 text-bullish border border-bullish/40">
                    Save ~30%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-12 max-w-7xl mx-auto">
          {TIERS.map((t) => {
            const price = getPrice(t.key);
            const isLoading = loading === t.key;
            const unavailableOnWeekly = billing === "weekly" && t.key === "basic";

            return (
              <div
                key={t.key}
                className={`relative rounded-2xl p-6 transition-all hover:-translate-y-1 ${
                  t.popular
                    ? "glass-strong border-primary/50 glow-primary"
                    : "glass hover:glow-primary-sm"
                }`}
              >
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-bullish px-3 py-1 text-xs font-semibold text-primary-foreground glow-primary-sm whitespace-nowrap">
                    <Zap className="h-3 w-3" /> Most popular
                  </div>
                )}

                <div className="text-xs text-muted-foreground">{t.tagline}</div>
                <h3 className="mt-1 text-xl font-bold">{t.name}</h3>

                <div className="mt-4 min-h-[64px]">
                  {unavailableOnWeekly ? (
                    <p className="text-sm text-muted-foreground pt-3">No weekly plan</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gradient">{price.amount}</span>
                        {t.key !== "free" && (
                          <span className="text-muted-foreground text-sm">/{billingLabel(billing)}</span>
                        )}
                      </div>
                      {price.note && (
                        <div className="text-xs text-bullish mt-1">{price.note}</div>
                      )}
                    </>
                  )}
                </div>

                {t.key === "free" ? (
                  <Link
                    to="/analyze"
                    className="mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition text-center block glass hover:bg-muted/60"
                  >
                    {t.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(t.key)}
                    disabled={isLoading || unavailableOnWeekly}
                    className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      t.popular
                        ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground glow-primary-sm hover:glow-primary"
                        : "glass hover:bg-muted/60"
                    }`}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {isLoading ? "Redirecting…" : t.cta}
                  </button>
                )}

                <ul className="mt-5 space-y-2.5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <div
                        className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          t.popular ? "bg-bullish/20 text-bullish" : "bg-primary/15 text-primary"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <span className="text-foreground/90">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12">
          All paid plans include a 7-day money-back guarantee. Secure checkout powered by Stripe.
        </p>
      </main>

      <Footer />
    </div>
  );
}
