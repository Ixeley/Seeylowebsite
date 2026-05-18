import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { ArrowRight, Bitcoin, CandlestickChart, LineChart, TrendingUp, Zap, Shield, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seeylo AI — AI-Powered Chart Analysis" },
      { name: "description", content: "Upload any trading chart screenshot and get instant entries, targets, and stop losses with AI confidence scoring." },
      { property: "og:title", content: "Seeylo AI — AI-Powered Chart Analysis" },
      { property: "og:description", content: "Instant trade ideas from any chart screenshot. Forex, futures, crypto, and stocks." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      {/* Hero */}
      <section className="relative">
        <div className="container mx-auto px-6 pt-20 pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs text-muted-foreground mb-8 animate-fade-up">
            <span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse-glow" />
            Powered by next-gen vision AI
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gradient animate-fade-up" style={{ animationDelay: "0.05s" }}>
            AI-Powered Chart Analysis<br className="hidden md:block" /> in Seconds
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "0.15s" }}>
            Upload any trading chart screenshot — get instant entries, targets, and stop losses with AI confidence scoring.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.25s" }}>
            <Link
              to="/analyze"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/70 px-7 py-3.5 text-base font-semibold text-primary-foreground glow-primary animate-pulse-glow hover:scale-[1.03] transition-transform"
            >
              Analyze Your Chart
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition">View pricing →</Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "0.35s" }}>
            {[
              { icon: LineChart, label: "Forex" },
              { icon: CandlestickChart, label: "Futures" },
              { icon: Bitcoin, label: "Crypto" },
              { icon: TrendingUp, label: "Stocks" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="glass rounded-full px-4 py-2 text-xs flex items-center gap-2 text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-primary" /> {label}
              </div>
            ))}
          </div>

          {/* Mockup */}
          <div className="mt-20 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "0.45s" }}>
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Instant Analysis", text: "Drop a screenshot, get a full trade plan in under 5 seconds." },
            { icon: Brain, title: "Confidence Scored", text: "Every signal comes with a 0–100 AI confidence gauge." },
            { icon: Shield, title: "Risk-First", text: "Defined stop loss, take profits, and R:R baked into every plan." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:glow-primary-sm transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="glass-strong rounded-2xl p-4 glow-primary-sm overflow-hidden">
      <div className="flex items-center gap-2 px-2 pb-3">
        <span className="h-2.5 w-2.5 rounded-full bg-bearish/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-bullish/70" />
        <span className="ml-3 text-xs text-muted-foreground font-mono">seeylo.ai / analysis</span>
      </div>
      <div className="grid md:grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-xl bg-background/60 border border-border p-4 relative overflow-hidden h-64 md:h-80">
          <FakeChart />
        </div>
        <div className="rounded-xl glass p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Signal</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bullish/20 text-bullish border border-bullish/40">LONG</span>
          </div>
          {[
            ["Entry", "19,842.50"],
            ["TP1", "19,910.00"],
            ["TP2", "19,975.00"],
            ["SL", "19,798.00"],
            ["R:R", "1 : 2.8"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
          <div className="pt-2">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-bullish animate-shimmer" style={{ width: "87%" }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5 text-muted-foreground">
              <span>Confidence</span><span className="text-foreground font-mono">87%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FakeChart() {
  const candles = Array.from({ length: 40 }).map((_, i) => {
    const up = Math.random() > 0.45;
    const h = 20 + Math.random() * 80;
    const top = Math.random() * (160 - h);
    return { up, h, top, i };
  });
  return (
    <>
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="absolute inset-x-4 bottom-6 flex items-end gap-1 h-44">
        {candles.map((c) => (
          <div key={c.i} className="flex-1 relative" style={{ marginTop: c.top }}>
            <div
              className={`w-full rounded-sm ${c.up ? "bg-bullish" : "bg-bearish"}`}
              style={{ height: c.h, boxShadow: c.up ? "0 0 8px var(--bullish)" : "0 0 8px var(--bearish)" }}
            />
          </div>
        ))}
      </div>
      <div className="absolute left-4 right-4 top-1/2 border-t border-dashed border-primary/60" />
      <div className="absolute left-4 right-4 top-[35%] border-t border-dashed border-bullish/50" />
      <div className="absolute left-4 right-4 top-[68%] border-t border-dashed border-bearish/50" />
      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-primary/20 border border-primary/40 text-xs font-mono text-primary">NQ · 5m</div>
    </>
  );
}
