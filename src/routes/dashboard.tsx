import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { getAnalyses, type Analysis } from "@/lib/mockAnalysis";
import { ArrowDown, ArrowUp, TrendingUp, Target, Activity } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Seeylo AI" },
      { name: "description", content: "Review your past chart analyses, win rate, and confidence stats." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [market, setMarket] = useState("All");
  const [style, setStyle] = useState("All");

  useEffect(() => { setAnalyses(getAnalyses()); }, []);

  const filtered = useMemo(() => analyses.filter(a =>
    (market === "All" || a.market === market) && (style === "All" || a.tradeStyle === style)
  ), [analyses, market, style]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const avgConf = total ? Math.round(filtered.reduce((s, a) => s + a.confidence, 0) / total) : 0;
    const winRate = total ? Math.round(filtered.filter(a => a.confidence >= 70).length / total * 100) : 0;
    return { total, avgConf, winRate };
  }, [filtered]);

  const markets = ["All", ...Array.from(new Set(analyses.map(a => a.market)))];
  const styles = ["All", ...Array.from(new Set(analyses.map(a => a.tradeStyle)))];

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-gradient">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Track your analyses and performance over time.</p>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <StatCard icon={<Activity className="h-5 w-5" />} label="Total Analyses" value={stats.total.toString()} />
          <StatCard icon={<Target className="h-5 w-5" />} label="Avg Confidence" value={`${stats.avgConf}%`} accent />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="High-Conviction Rate" value={`${stats.winRate}%`} bullish />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mt-8">
          <Filter label="Market" value={market} options={markets} onChange={setMarket} />
          <Filter label="Style" value={style} options={styles} onChange={setStyle} />
        </div>

        {/* History */}
        <div className="mt-6">
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
              No analyses yet. Head to <a href="/analyze" className="text-primary hover:underline">/analyze</a> to create your first one.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => <HistoryCard key={a.id} a={a} />)}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value, accent, bullish }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; bullish?: boolean }) {
  return (
    <div className={`glass rounded-2xl p-6 ${accent ? "glow-primary-sm" : ""} ${bullish ? "glow-bullish" : ""}`}>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${bullish ? "bg-bullish/15 text-bullish border border-bullish/30" : "bg-primary/15 text-primary border border-primary/30"}`}>{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-4 text-4xl font-bold text-gradient">{value}</div>
    </div>
  );
}

function Filter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-sm focus:outline-none">
        {options.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
      </select>
    </div>
  );
}

function HistoryCard({ a }: { a: Analysis }) {
  const isLong = a.direction === "LONG";
  const Icon = isLong ? ArrowUp : ArrowDown;
  return (
    <div className="glass rounded-2xl p-5 hover:glow-primary-sm transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold">{a.market}</div>
          <div className="text-xs text-muted-foreground">{a.tradeStyle} · {new Date(a.createdAt).toLocaleDateString()}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${isLong ? "bg-bullish/15 text-bullish border-bullish/40" : "bg-bearish/15 text-bearish border-bearish/40"}`}>
          <Icon className="h-3 w-3" />{a.direction}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Mini label="Entry" value={fmt(a.entry)} />
        <Mini label="TP1" value={fmt(a.takeProfits[0])} />
        <Mini label="SL" value={fmt(a.stopLoss)} />
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Confidence</span><span className="font-mono text-foreground">{a.confidence}%</span></div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-bullish" style={{ width: `${a.confidence}%` }} />
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border/50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function fmt(n: number) { return n < 10 ? n.toFixed(4) : n.toLocaleString(undefined, { maximumFractionDigits: 2 }); }
