import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Check, Zap } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Seeylo AI" },
      { name: "description", content: "Simple pricing for traders. Free, Pro, and Elite plans for AI chart analysis." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const [yearly, setYearly] = useState(false);
  const tiers = [
    {
      name: "Free", monthly: 0, yearly: 0, tagline: "Get started",
      features: ["3 analyses per day", "All markets supported", "Basic AI confidence score", "Standard analysis speed"],
      cta: "Start free",
    },
    {
      name: "Pro", monthly: 29, yearly: 23, tagline: "For active traders", popular: true,
      features: ["Unlimited analyses", "Advanced AI reasoning", "Multi-timeframe confluence", "Priority analysis speed", "Save & track history", "Email support"],
      cta: "Upgrade to Pro",
    },
    {
      name: "Elite", monthly: 79, yearly: 63, tagline: "For desks & quants",
      features: ["Everything in Pro", "API access", "Custom alert webhooks", "Backtesting tools", "Priority queue", "Dedicated support"],
      cta: "Go Elite",
    },
  ];

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient">Simple, trader-friendly pricing</h1>
          <p className="text-muted-foreground mt-4">Start free. Upgrade when you're ready to scale your edge.</p>

          <div className="mt-8 inline-flex items-center gap-3 glass rounded-full p-1.5">
            <button onClick={() => setYearly(false)} className={`px-4 py-1.5 text-sm rounded-full transition ${!yearly ? "bg-primary text-primary-foreground glow-primary-sm" : "text-muted-foreground"}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`px-4 py-1.5 text-sm rounded-full transition flex items-center gap-2 ${yearly ? "bg-primary text-primary-foreground glow-primary-sm" : "text-muted-foreground"}`}>
              Yearly <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bullish/20 text-bullish border border-bullish/40">−20%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-6xl mx-auto">
          {tiers.map((t) => {
            const price = yearly ? t.yearly : t.monthly;
            return (
              <div key={t.name} className={`relative rounded-2xl p-7 transition-all hover:-translate-y-1 ${t.popular ? "glass-strong border-primary/50 glow-primary" : "glass hover:glow-primary-sm"}`}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-bullish px-3 py-1 text-xs font-semibold text-primary-foreground glow-primary-sm">
                    <Zap className="h-3 w-3" /> Most popular
                  </div>
                )}
                <div className="text-sm text-muted-foreground">{t.tagline}</div>
                <h3 className="mt-1 text-2xl font-bold">{t.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-gradient">${price}</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
                {yearly && t.monthly > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">billed ${price * 12}/year</div>
                )}
                <button className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition ${t.popular ? "bg-gradient-to-r from-primary to-primary/70 text-primary-foreground glow-primary-sm hover:glow-primary" : "glass hover:bg-muted/60"}`}>
                  {t.cta}
                </button>
                <ul className="mt-6 space-y-3">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${t.popular ? "bg-bullish/20 text-bullish" : "bg-primary/15 text-primary"}`}>
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

        <p className="text-center text-xs text-muted-foreground mt-12">All plans include a 7-day money-back guarantee.</p>
      </main>

      <Footer />
    </div>
  );
}
