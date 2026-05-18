import { useState } from "react";
import type { TradeAnalysis, KeyLevel, TakeProfit } from "@/lib/openai";
import { ConfidenceGauge } from "./ConfidenceGauge";
import {
  ArrowDown, ArrowUp, ChevronDown, Crosshair, Shield, Scale,
  Sparkles, RefreshCw, Clock, TrendingUp, TrendingDown, Layers, Activity,
  Zap, Target,
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
  const isFast = a.entryMode === "fast";

  return (
    <div className="glass-strong rounded-2xl p-5 animate-fade-up space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> GPT-4o · ICT/SMC
            {isFast && (
              <span className="flex items-center gap-1 text-yellow-400 ml-1">
                <Zap className="h-3 w-3" /> Fast Entry
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold">{a.symbol}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{tradeStyle}</span>
            {a.timeframe && a.timeframe !== "—" && (
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {a.timeframe}</span>
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

      {/* $Risk / $Reward / R:R */}
      {(a.riskDollars > 0 || a.rewardDollars > 0) && (
        <div className="grid grid-cols-3 gap-2">
          <DollarCard label="Risk / contract" value={`$${a.riskDollars > 0 ? a.riskDollars.toLocaleString() : "—"}`} color="bearish" />
          <DollarCard label="Reward / contract" value={`$${a.rewardDollars > 0 ? a.rewardDollars.toLocaleString() : "—"}`} color="bullish" />
          <DollarCard label="R:R ratio" value={`1 : ${a.riskReward}`} color="primary" />
        </div>
      )}

      {/* Entry + SL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Crosshair className="h-4 w-4 text-primary" />
            <span>Entry</span>
            {isFast && <span className="text-xs text-yellow-400">market</span>}
            {a.riskPoints > 0 && <span className="text-xs opacity-60">SL: {a.riskPoints}pts</span>}
          </div>
          <span className="font-mono font-bold text-foreground">{fmt(a.entry)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-bearish/30 bg-bearish/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-bearish" /><span>Stop Loss</span>
          </div>
          <span className="font-mono font-bold text-bearish">{fmt(a.stopLoss)}</span>
        </div>
      </div>

      {/* TPs with probability */}
      <div className="space-y-2">
        {a.takeProfits.map((tp, i) => (
          <TPRow key={i} tp={tp} index={i} />
        ))}
      </div>

      {/* Confidence gauge */}
      <div className="flex items-center justify-center py-1">
        <ConfidenceGauge value={a.confidence} />
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
          <button onClick={() => setLevelsOpen(!levelsOpen)} className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition">
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
        <button onClick={() => setReasoningOpen(!reasoningOpen)} className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition">
          <span className="font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Technical Reasoning</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${reasoningOpen ? "rotate-180" : ""}`} />
        </button>
        {reasoningOpen && <p className="mt-3 text-sm leading-relaxed text-muted-foreground animate-fade-up">{a.reasoning}</p>}
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

function DollarCard({ label, value, color }: { label: string; value: string; color: "bullish" | "bearish" | "primary" }) {
  const cls = color === "bullish" ? "bg-bullish/10 border-bullish/25 text-bullish" :
              color === "bearish" ? "bg-bearish/10 border-bearish/25 text-bearish" :
              "bg-primary/8 border-primary/25 text-primary";
  return (
    <div className={`rounded-lg border px-3 py-2.5 text-center ${cls}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="font-mono font-bold">{value}</p>
    </div>
  );
}

function TPRow({ tp, index }: { tp: TakeProfit; index: number }) {
  const price = typeof tp === "number" ? tp : tp.price;
  const prob = typeof tp === "object" ? tp.probability : 70 - index * 20;
  const reason = typeof tp === "object" ? tp.reason : "";
  const probColor = prob >= 65 ? "bg-bullish" : prob >= 45 ? "bg-yellow-400" : "bg-orange-400";

  return (
    <div className="rounded-lg border border-bullish/20 bg-bullish/5 px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4 text-bullish" />
          <span className="text-muted-foreground">TP{index + 1}</span>
          {reason && <span className="text-xs text-muted-foreground opacity-70">· {reason}</span>}
        </div>
        <span className="font-mono font-bold text-bullish">{fmt(price)}</span>
      </div>
      {/* Probability bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full rounded-full ${probColor} transition-all`} style={{ width: `${prob}%` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground w-8 text-right">{prob}%</span>
      </div>
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
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-xs min-w-[42px]">{meta.label}</span>
        <span className="text-muted-foreground truncate">{kl.description}</span>
      </div>
      <span className="font-mono font-semibold text-xs ml-2 flex-shrink-0">
        {isZone ? `${fmt(kl.priceLow)} – ${fmt(kl.priceHigh)}` : fmt(kl.priceHigh)}
      </span>
    </div>
  );
}

function fmt(n: number) {
  if (!n) return "—";
  return n < 10 ? n.toFixed(5) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
