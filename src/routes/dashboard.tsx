import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useAuth } from "@/lib/auth";
import { Check, Zap, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Get started — Seeylo AI" },
      { name: "description", content: "Choose your plan and start analyzing charts with AI." },
    ],
  }),
  component: DashboardPage,
});

type Billing = "weekly" | "monthly" | "yearly";

const PRICES: Record<string, Partial<Record<Billing, { id: string; amount: string; note?: string }>>> = {
  basic: {
    weekly:  { id: "price_1TYUz3AFPCa1P8v5KeX2o0t3", amount: "€5.99" },
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

const TIERS = [
  {
    key: "basic",
    name: "Basic",
    tagline: "For casual traders",
    features: [
      "5 analyses per day",
      "Multiple screenshots = 1 analysis",
      "Advanced AI reasoning",
      "Multi-timeframe confluence",
      "Priority analysis speed",
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
      "10 analyses per day",
      "Multiple screenshots = 1 analysis",
      "Everything in Basic",
      "API access",
      "Custom alert webhooks",
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
      "20 analyses per day",
      "Multiple screenshots = 1 analysis",
      "Everything in Pro",
      "Dedicated account manager",
      "Backtesting tools",
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

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading]);

  const handleCheckout = async (planKey: string) => {
    const price = PRICES[planKey]?.[billing] ?? PRICES[planKey]?.monthly;
    if (!price) return;
    setCheckoutLoading(planKey);
    try {
      await startCheckout(price.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setCheckoutLoading(null);
    }
  };

  const getPrice = (planKey: string) => {
    const p = PRICES[planKey]?.[billing] ?? PRICES[planKey]?.monthly;
    return p ?? { amount: "—", note: undefined };
  };

  const billingLabel = (b: Billing) => (b === "weekly" ? "wk" : b === "yearly" ? "yr" : "mo");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        {/* Welcome */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 glass border border-primary/30 text-xs text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Welcome to Seeylo AI
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient">Choose your plan</h1>
          <p className="text-muted-foreground mt-4">Unlock AI-powered chart analysis. Start with a free trial or go all-in.</p>

          {/* Billing toggle */}
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

        {/* Plan cards */}
        <div className="grid sm:grid-cols-3 gap-5 mt-10 max-w-5xl mx-auto">
          {TIERS.map((t) => {
            const price = getPrice(t.key);
            const isLoading = checkoutLoading === t.key;

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
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gradient">{price.amount}</span>
                    <span className="text-muted-foreground text-sm">/{billingLabel(billing)}</span>
                  </div>
                  {price.note && (
                    <div className="text-xs text-bullish mt-1">{price.note}</div>
                  )}
                </div>

                <button
                  onClick={() => handleCheckout(t.key)}
                  disabled={isLoading}
                  className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    t.popular
                      ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground glow-primary-sm hover:glow-primary"
                      : "glass hover:bg-muted/60"
                  }`}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isLoading ? "Redirecting…" : t.cta}
                </button>

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

        {/* Free trial CTA */}
        <div className="text-center mt-8">
          <Link
            to="/analyze"
            className="text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-4"
          >
            Continue with free trial — 3 analyses/day, no card required
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          All paid plans include a 7-day money-back guarantee. Secure checkout powered by Stripe.
        </p>
      </main>
    </div>
  );
}
