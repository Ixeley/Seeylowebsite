import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Check, Zap, Star, Crown, Loader2 } from "lucide-react";
import { PLANS, createCheckoutSession, getPlanPrice, getPlanSavings, type PlanKey, type BillingPeriod } from "@/lib/stripe";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Seeylo AI" },
      { name: "description", content: "Basic, Pro, and Platinum plans for AI chart analysis. Start free for 3 days." },
    ],
  }),
  component: PricingPage,
});

const PERIOD_LABELS: Record<BillingPeriod, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const PLAN_ICONS: Record<PlanKey, React.ReactNode> = {
  basic:    <Zap className="h-5 w-5" />,
  pro:      <Star className="h-5 w-5" />,
  platinum: <Crown className="h-5 w-5" />,
};

function PricingPage() {
  const { user, subscription } = useAuth();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const handleUpgrade = async (plan: PlanKey) => {
    if (!user) {
      window.location.href = "/signup";
      return;
    }
    setLoadingPlan(plan);
    try {
      const url = await createCheckoutSession({ plan, period, userId: user.id, email: user.email ?? "" });
      window.location.href = url;
    } catch (err) {
      toast.error("Checkout failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const activePlan = subscription?.status === "active" ? subscription.plan : null;

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            3-day free trial · No card required
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">Simple pricing</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start free for 3 days with full access. After that, choose a plan or keep 1 free analysis per day.
          </p>
        </div>

        {/* Billing period toggle */}
        <div className="flex justify-center mb-10">
          <div className="flex glass rounded-xl p-1 gap-1">
            {(["weekly", "monthly", "yearly"] as BillingPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
                {p === "yearly" && (
                  <span className="ml-1.5 text-xs text-bullish font-semibold">-30%</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const plan = PLANS[key];
            const price = getPlanPrice(key, period);
            const savings = getPlanSavings(key, period);
            const isCurrent = activePlan === key;
            const isLoading = loadingPlan === key;

            return (
              <div
                key={key}
                className={`relative rounded-2xl border p-6 flex flex-col ${plan.bg} ${plan.border} ${"popular" in plan && plan.popular ? "ring-1 ring-primary/40" : ""}`}
              >
                {"popular" in plan && plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Most popular</span>
                  </div>
                )}

                <div className={`flex items-center gap-2 ${plan.color} mb-1`}>
                  {PLAN_ICONS[key]}
                  <span className="font-bold text-lg">{plan.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.tagline}</p>

                <div className="mb-1">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-sm text-muted-foreground">
                    {period === "weekly" ? "/week" : "/mo"}
                  </span>
                </div>
                {period === "yearly" && (
                  <p className="text-xs text-muted-foreground mb-1">${PLANS[key].yearlyTotal}/year</p>
                )}
                {savings ? (
                  <span className="inline-block text-xs font-semibold text-bullish bg-bullish/10 border border-bullish/20 rounded-full px-2 py-0.5 mb-4">
                    {savings}
                  </span>
                ) : <div className="mb-4" />}

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-bullish flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full rounded-xl border border-bullish/40 bg-bullish/10 py-2.5 text-sm font-semibold text-bullish text-center">
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(key)}
                    disabled={isLoading}
                    className={`w-full rounded-xl py-2.5 text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 ${
                      "popular" in plan && plan.popular
                        ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground glow-primary-sm hover:glow-primary"
                        : `border ${plan.border} ${plan.color} hover:bg-white/5`
                    }`}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {user ? `Upgrade to ${plan.name}` : "Start free trial"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Free tier note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Not ready to commit?{" "}
            <Link to="/signup" className="text-primary hover:text-primary/80 transition">
              Start with 3 days free
            </Link>{" "}
            — then keep 1 free analysis/day forever.
          </p>
        </div>

        {/* Feature comparison table */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">What's included</h2>
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-muted-foreground font-medium">Feature</th>
                  <th className="p-4 text-center text-blue-400 font-semibold">Basic</th>
                  <th className="p-4 text-center text-primary font-semibold">Pro</th>
                  <th className="p-4 text-center text-yellow-400 font-semibold">Platinum</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Analyses / day", "2", "10", "20"],
                  ["Fast & Standard entry", "✓", "✓", "✓"],
                  ["TP probability bars", "✓", "✓", "✓"],
                  ["Chart zone boxes (OB/FVG)", "—", "✓", "✓"],
                  ["News impact analysis", "—", "✓", "✓"],
                  ["Re-analyze chart", "—", "✓", "✓"],
                  ["Analysis history", "7 days", "30 days", "Unlimited"],
                  ["Priority AI processing", "—", "—", "✓"],
                  ["Early access features", "—", "—", "✓"],
                ].map(([feature, basic, pro, platinum]) => (
                  <tr key={feature} className="border-b border-border/30 last:border-0">
                    <td className="p-4 text-muted-foreground">{feature}</td>
                    <td className="p-4 text-center text-blue-300">{basic}</td>
                    <td className="p-4 text-center text-primary/90">{pro}</td>
                    <td className="p-4 text-center text-yellow-300">{platinum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
