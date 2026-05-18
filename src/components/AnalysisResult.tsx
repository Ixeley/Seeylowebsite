import { useState } from "react";
import type { TradeAnalysis, KeyLevel } from "@/lib/openai";
import { ConfidenceGauge } from "./ConfidenceGauge";
import {
  ArrowDown, ArrowUp, ChevronDown, Crosshair, Target, Shield, Scale,
  Sparkles, RefreshCw, Clock, TrendingUp, TrendingDown, Layers, Activity,
  DollarSign,
} from "lucide-react";

interface Props {
  analysis: TradeAnalysis;
  tradeStyle: string;
  onReset: () => void;
  onReanalyze: () => void;
}

export function AnalysisResult({ analysis: a, tradeStyle, onReset, onReanalyze }: Props) {
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [levelsOpen, setLevelsOpen] = useState(true);
  const isLong = a.direction === "LONG";
  const dirColor = isLong ? "text-bullish" : "text-bearish";
  const dirBg = isLong ? "bg-bullish/15 border-bullish/40 glow-bullish" : "bg-bearish/15 border-bearish/40 glow-bearish";
  const DirectionIcon = isLong ? ArrowUp : ArrowDown;
  const WhyIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <div className="glass-strong rounded-2xl p-5 animate-fade-up space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> GPT-4o · ICT/SMC
          </div>
          <h3 className="text-2xl font-bold">{a.symbol}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{tradeStyle}</span>
            {a.timeframe && a.timeframe !== "—" && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {a.timeframe}
              </span>
            )}
            {a.currentPrice > 0 && (
              <span className="font-mono text-foreground font-semibold">{fmt(a.currentPrice)}</span>
            )}
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold ${dirBg} ${dirColor}`}>
          <DirectionIcon className="h-4 w-4" /> {a.direction}
        </div>
      </div>

      {/* Setup trigger */}
      {a.tradeSetup && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Setup · </span>
          <span className="text-sm text-foreground">{a.tradeSetup}</span>
        </div>
      )}

      {/* P&L summary for 1 contract */}
      {(a.riskDollars > 0 || a.rewardDollars > 0) && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-bearish/10 border border-bearish/25 px-3 py-2.5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Risk / contract</p>
            <p className="font-mono font-bold text-bearish">${a.riskDollars > 0 ? a.riskDollars.toLocaleString() : "—"}</p>
          </div>
          <div className="rounded-lg bg-bullish/10 border border-bullish/25 px-3 py-2.5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Reward / contract</p>
            <p className="font-mono font-bold text-bullish">${a.rewardDollars > 0 ? a.rewardDollars.toLocaleString() : "—"}</p>
          </div>
          <div className="rounded-lg bg-primary/8 border border-primary/25 px-3 py-2.5 text-center">
            <p className="text-xs text-muted-foreground mb-0.5">R:R ratio</p>
            <p className="font-mono font-bold text-primary">1 : {a.riskReward}</p>
          </div>
        </div>
      )}

      {/* Price levels + gauge */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 items-center">
        <div className="space-y-2">
          <PriceRow icon={<Crosshair className="h-4 w-4 text-primary" />} label="Entry" value={fmt(a.entry)} sub={a.riskPoints ? `SL: ${a.riskPoints} pts` : undefined} />
          {a.takeProfits.map((tp, i) => (
            <PriceRow key={i} icon={<Target className="h-4 w-4 text-bullish" />} label={`TP${i + 1}`} value={fmt(tp)} accent="bullish" />
          ))}
          <PriceRow icon={<Shield className="h-4 w-4 text-bearish" />} label="Stop Loss" value={fmt(a.stopLoss)} accent="bearish" />
        </div>
        <div className="flex justify-center">
          <ConfidenceGauge value={a.confidence} />
        </div>
      </div>

      {/* Why direction */}
      {a.whyDirection && (
        <div className={`rounded-xl border p-4 ${isLong ? "bg-bullish/5 border-bullish/25" : "bg-bearish/5 border-bearish/25"}`}>
          <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2 ${dirColor}`}>
            <WhyIcon className="h-3.5 w-3.5" /> {isLong ? "Why Long" : "Why Short"}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{a.whyDirection}</p>
        </div>
      )}

      {/* Key levels */}
      {(a.keyLevels?.length ?? 0) > 0 && (
        <div>
          <button
            onClick={() => setLevelsOpen(!levelsOpen)}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition"
          >
            <span className="font-medium flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Key Levels
              <span className="text-xs text-muted-foreground">({a.keyLevels.length})</span>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${levelsOpen ? "rotate-180" : ""}`} />
          </button>
          {levelsOpen && (
            <div className="mt-2 space-y-1.5 animate-fade-up">
              {a.keyLevels.map((kl, i) => <KeyLevelRow key={i} kl={kl} />)}
            </div>
          )}
        </div>
      )}

      {/* Technical reasoning */}
      <div>
        <button
          onClick={() => setReasoningOpen(!reasoningOpen)}
          className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition"
        >
          <span className="font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Technical Reasoning
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${reasoningOpen ? "rotate-180" : ""}`} />
        </button>
        {reasoningOpen && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground animate-fade-up">{a.reasoning}</p>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button onClick={onReanalyze} className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4" /> Re-analyze
        </button>
        <button onClick={onReset} className="rounded-lg bg-gradient-to-r from-primary to-primary/70 px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition">
          New Chart
        </button>
      </div>
    </div>
  );
}

function PriceRow({ icon, label, value, accent, highlight, sub }: {
  icon: React.ReactNode; label: string; value: string;
  accent?: "bullish" | "bearish"; highlight?: boolean; sub?: string;
}) {
  const valColor = accent === "bullish" ? "text-bullish" : accent === "bearish" ? "text-bearish" : "text-foreground";
  return (
    <div className={`flex items-center justify-between rounded-lg border border-border/60 px-4 py-2.5 ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
        {sub && <span className="text-xs opacity-60">{sub}</span>}
      </div>
      <span className={`font-mono font-bold ${valColor}`}>{value}</span>
    </div>
  );
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  order_block:  { label: "OB",    cls: "bg-violet-500/10 border-violet-500/30 text-violet-300" },
  fvg:          { label: "FVG",   cls: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" },
  liquidity:    { label: "LIQ",   cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300" },
  bos:          { label: "BOS",   cls: "bg-orange-500/10 border-orange-500/30 text-orange-300" },
  choch:        { label: "CHoCH", cls: "bg-pink-500/10 border-pink-500/30 text-pink-300" },
  fibonacci:    { label: "FIB",   cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  support:      { label: "S",     cls: "bg-blue-500/10 border-blue-500/30 text-blue-300" },
  resistance:   { label: "R",     cls: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
};

function KeyLevelRow({ kl }: { kl: KeyLevel }) {
  const meta = TYPE_META[kl.type] ?? { label: kl.type.toUpperCase(), cls: "bg-muted/20 border-border/60 text-foreground" };
  const isZone = kl.priceHigh !== kl.priceLow && kl.priceHigh > 0 && kl.priceLow > 0;
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${meta.cls}`}>
      <div className="flex items-center gap-2">
        <span className="font-bold text-xs min-w-[42px]">{meta.label}</span>
        <span className="text-muted-foreground">{kl.description}</span>
      </div>
      <span className="font-mono font-semibold text-xs">
        {isZone ? `${fmt(kl.priceLow)} – ${fmt(kl.priceHigh)}` : fmt(kl.priceHigh)}
      </span>
    </div>
  );
}

function fmt(n: number) {
  if (!n) return "—";
  return n < 10 ? n.toFixed(5) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
