import { useState } from "react";
import type { Analysis } from "@/lib/mockAnalysis";
import { ConfidenceGauge } from "./ConfidenceGauge";
import { ArrowDown, ArrowUp, ChevronDown, Crosshair, Target, Shield, Scale, Sparkles } from "lucide-react";

export function AnalysisResult({ a, onReset }: { a: Analysis; onReset: () => void }) {
  const [open, setOpen] = useState(true);
  const isLong = a.direction === "LONG";
  const dirColor = isLong ? "text-bullish" : "text-bearish";
  const dirBg = isLong ? "bg-bullish/15 border-bullish/40 glow-bullish" : "bg-bearish/15 border-bearish/40 glow-bearish";
  const Icon = isLong ? ArrowUp : ArrowDown;

  return (
    <div className="glass-strong rounded-2xl p-6 animate-fade-up">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Analysis
          </div>
          <h3 className="text-xl font-semibold">{a.market} <span className="text-muted-foreground text-sm">· {a.tradeStyle}</span></h3>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${dirBg} ${dirColor}`}>
          <Icon className="h-4 w-4" /> {a.direction}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
        <div className="space-y-3">
          <Row icon={<Crosshair className="h-4 w-4 text-primary" />} label="Entry" value={fmt(a.entry)} />
          {a.takeProfits.map((tp, i) => (
            <Row key={i} icon={<Target className="h-4 w-4 text-bullish" />} label={`TP${i + 1}`} value={fmt(tp)} accent="bullish" />
          ))}
          <Row icon={<Shield className="h-4 w-4 text-bearish" />} label="Stop Loss" value={fmt(a.stopLoss)} accent="bearish" />
          <Row icon={<Scale className="h-4 w-4 text-primary" />} label="Risk / Reward" value={`1 : ${a.riskReward}`} highlight />
        </div>
        <div className="flex justify-center">
          <ConfidenceGauge value={a.confidence} />
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="mt-6 w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition"
      >
        <span className="font-medium">AI Reasoning</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground animate-fade-up">{a.reasoning}</p>
      )}

      <button
        onClick={onReset}
        className="mt-6 w-full rounded-lg bg-gradient-to-r from-primary to-primary/70 px-4 py-3 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition"
      >
        New Analysis
      </button>
    </div>
  );
}

function Row({ icon, label, value, accent, highlight }: { icon: React.ReactNode; label: string; value: string; accent?: "bullish" | "bearish"; highlight?: boolean }) {
  const valColor = accent === "bullish" ? "text-bullish" : accent === "bearish" ? "text-bearish" : "text-foreground";
  return (
    <div className={`flex items-center justify-between rounded-lg border border-border/60 px-4 py-2.5 ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div>
      <span className={`font-mono font-semibold ${valColor}`}>{value}</span>
    </div>
  );
}

function fmt(n: number) {
  return n < 10 ? n.toFixed(4) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
