import { useState } from "react";
import type { TradeAnalysis, KeyLevel, TakeProfit } from "@/lib/openai";
import { ConfidenceGauge } from "./ConfidenceGauge";
import {
  ArrowDown, ArrowUp, ChevronDown, Crosshair, Shield,
  Sparkles, RefreshCw, Clock, TrendingUp, TrendingDown,
  Layers, Activity, Zap, Target, Newspaper, Brain,
} from "lucide-react";

interface Props {
  analysis: TradeAnalysis;
  tradeStyle: string;
  onReset: () => void;
  onReanalyze: () => void;
}

function Section({
  icon: Icon, title, badge, defaultOpen = false, children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 hover:bg-muted/40 transition text-sm"
      >
        <span className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          {title}
          {badge && (
            <span className="text-[10px] rounded-full border border-border bg-muted/40 text-muted-foreground px-2 py-0.5">{badge}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 py-3 bg-background/20 animate-fade-up">
          {children}
        </div>
      )}
    </div>
  );
}

export function AnalysisResult({ analysis: a, tradeStyle, onReset, onReanalyze }: Props) {
  const isLong = a.direction === "LONG";
  const dirColor = isLong ? "text-bullish" : "text-bearish";
  const dirBg = isLong
    ? "bg-bullish/15 border-bullish/40 text-bullish"
    : "bg-bearish/15 border-bearish/40 text-bearish";
  const DirectionIcon = isLong ? ArrowUp : ArrowDown;
  const WhyIcon = isLong ? TrendingUp : TrendingDown;
  const isFast = a.entryMode === "fast";

  return (
    <div className="glass-strong rounded-2xl p-4 animate-fade-up space-y-3">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Sparkles className="h-3 w-3 text-primary" />
            GPT-4o · ICT/SMC
            {isFast && <span className="flex items-center gap-1 text-yellow-400"><Zap className="h-3 w-3" />Fast</span>}
            {a.setupType && (
              <span className="rounded-full border border-primary/40 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold">{a.setupType}</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold font-mono">{a.symbol}</h3>
            {a.timeframe && a.timeframe !== "—" && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />{a.timeframe}
              </span>
            )}
          </div>
          {a.symbolDescription && (
            <p className="text-xs text-muted-foreground mt-0.5">{a.symbolDescription}</p>
          )}
        </div>
        <div className={`flex flex-col items-end gap-1.5`}>
          <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${dirBg}`}>
            <DirectionIcon className="h-4 w-4" /> {a.direction}
          </div>
          <div className="text-right">
            <span className={`text-xl font-bold font-mono ${a.confidence >= 70 ? "text-bullish" : a.confidence >= 55 ? "text-yellow-400" : "text-bearish"}`}>
              {a.confidence}%
            </span>
            <p className="text-[10px] text-muted-foreground">confidence</p>
          </div>
        </div>
      </div>

      {/* ── Signal (always visible) ──────────────────────────── */}
      <div className="space-y-2">
        {/* Entry + SL */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <Crosshair className="h-3.5 w-3.5 text-primary" /> Entry
              {isFast && <span className="text-[10px] text-yellow-400">near-mkt</span>}
            </div>
            <span className="font-mono font-bold text-base">{fmt(a.entry)}</span>
            {a.riskPoints > 0 && <p className="text-[10px] text-muted-foreground mt-0.5">SL: {a.riskPoints}pts</p>}
          </div>
          <div className="rounded-lg border border-bearish/30 bg-bearish/5 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
              <Shield className="h-3.5 w-3.5 text-bearish" /> Stop Loss
            </div>
            <span className="font-mono font-bold text-base text-bearish">{fmt(a.stopLoss)}</span>
          </div>
        </div>

        {/* TPs */}
        <div className="space-y-1.5">
          {a.takeProfits.map((tp, i) => <TPRow key={i} tp={tp} index={i} />)}
        </div>

        {/* R:R */}
        {(a.riskDollars > 0 || a.rewardDollars > 0) && (
          <div className="grid grid-cols-3 gap-2">
            <DollarCard label="Risk" value={`$${a.riskDollars > 0 ? a.riskDollars.toLocaleString() : "—"}`} color="bearish" />
            <DollarCard label="Reward" value={`$${a.rewardDollars > 0 ? a.rewardDollars.toLocaleString() : "—"}`} color="bullish" />
            <DollarCard label="R:R" value={`1:${a.riskReward}`} color="primary" />
          </div>
        )}

        {/* Confidence gauge */}
        <div className="flex justify-center py-1">
          <ConfidenceGauge value={a.confidence} />
        </div>
      </div>

      {/* ── Setup ───────────────────────────────────────────── */}
      {a.tradeSetup && (
        <Section icon={Target} title="Trade Setup" defaultOpen={true}>
          <p className="text-sm leading-relaxed text-foreground/90">{a.tradeSetup}</p>
        </Section>
      )}

      {/* ── Why Long/Short ──────────────────────────────────── */}
      {a.whyDirection && (
        <Section icon={WhyIcon} title={isLong ? "Why Long" : "Why Short"} defaultOpen={true}>
          <div className={`rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-line ${isLong ? "bg-bullish/5 border-bullish/20 text-foreground/90" : "bg-bearish/5 border-bearish/20 text-foreground/90"}`}>
            {a.whyDirection}
          </div>
        </Section>
      )}

      {/* ── Market Condition + News Context ─────────────────── */}
      {(a.marketCondition || a.newsContext) && (
        <Section icon={Newspaper} title="Market & News Context">
          <div className="space-y-2 text-sm">
            {a.marketCondition && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market Condition</span>
                <p className="text-foreground/80 mt-1">{a.marketCondition}</p>
              </div>
            )}
            {a.newsContext && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">News Context</span>
                <p className="text-foreground/80 mt-1">{a.newsContext}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Key Levels ──────────────────────────────────────── */}
      {(a.keyLevels?.length ?? 0) > 0 && (
        <Section icon={Layers} title="Key Levels" badge={`${a.keyLevels.length}`} defaultOpen={true}>
          <div className="space-y-1.5">
            {a.keyLevels.map((kl, i) => <KeyLevelRow key={i} kl={kl} />)}
          </div>
        </Section>
      )}

      {/* ── Technical Reasoning ─────────────────────────────── */}
      {a.reasoning && (
        <Section icon={Brain} title="Technical Reasoning">
          <p className="text-sm leading-relaxed text-muted-foreground">{a.reasoning}</p>
        </Section>
      )}

      {/* ── Full AI Analysis ────────────────────────────────── */}
      <Section icon={Activity} title="Full ICT Analysis">
        <div className="space-y-3 text-sm">
          {a.tradeStyle && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Style</span>
              <span className="font-medium">{tradeStyle}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Current Price</span>
            <span className="font-mono font-medium">{fmt(a.currentPrice)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Entry Distance</span>
            <span className="font-mono">{a.currentPrice && a.entry ? fmt(Math.abs(a.currentPrice - a.entry)) + " pts" : "—"}</span>
          </div>
        </div>
      </Section>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          onClick={onReanalyze}
          className="rounded-lg border border-primary/50 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Re-analyze
        </button>
        <button
          onClick={onReset}
          className="rounded-lg bg-gradient-to-r from-primary to-primary/70 px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary-sm hover:glow-primary transition"
        >
          New Chart
        </button>
      </div>
    </div>
  );
}

function DollarCard({ label, value, color }: { label: string; value: string; color: "bullish" | "bearish" | "primary" }) {
  const cls =
    color === "bullish" ? "bg-bullish/10 border-bullish/25 text-bullish" :
    color === "bearish" ? "bg-bearish/10 border-bearish/25 text-bearish" :
    "bg-primary/8 border-primary/25 text-primary";
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${cls}`}>
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className="font-mono font-bold text-sm">{value}</p>
    </div>
  );
}

function TPRow({ tp, index }: { tp: TakeProfit; index: number }) {
  const price = typeof tp === "number" ? tp : tp.price;
  const prob = typeof tp === "object" ? tp.probability : 70 - index * 18;
  const reason = typeof tp === "object" ? tp.reason : "";
  const probColor = prob >= 65 ? "bg-bullish" : prob >= 45 ? "bg-yellow-400" : "bg-orange-400";
  const probText = prob >= 65 ? "text-bullish" : prob >= 45 ? "text-yellow-400" : "text-orange-400";

  return (
    <div className="rounded-lg border border-bullish/20 bg-bullish/5 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Target className="h-3.5 w-3.5 text-bullish" />
          <span className="text-muted-foreground font-medium">TP{index + 1}</span>
          {reason && <span className="text-[11px] text-muted-foreground/60 truncate max-w-[160px]">· {reason}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-mono font-bold ${probText}`}>{prob}%</span>
          <span className="font-mono font-bold text-bullish">{fmt(price)}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${probColor} transition-all`} style={{ width: `${prob}%` }} />
      </div>
    </div>
  );
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  order_block: { label: "OB",    cls: "bg-violet-500/10 border-violet-500/30 text-violet-300" },
  fvg:         { label: "FVG",  cls: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" },
  liquidity:   { label: "LIQ",  cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300" },
  bos:         { label: "BOS",  cls: "bg-orange-500/10 border-orange-500/30 text-orange-300" },
  choch:       { label: "CHoCH",cls: "bg-pink-500/10 border-pink-500/30 text-pink-300" },
  fibonacci:   { label: "FIB",  cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" },
  support:     { label: "S",    cls: "bg-blue-500/10 border-blue-500/30 text-blue-300" },
  resistance:  { label: "R",    cls: "bg-amber-500/10 border-amber-500/30 text-amber-300" },
};

function KeyLevelRow({ kl }: { kl: KeyLevel }) {
  const meta = TYPE_META[kl.type] ?? { label: kl.type.toUpperCase().slice(0, 5), cls: "bg-muted/20 border-border/60 text-foreground" };
  const isZone = kl.priceHigh !== kl.priceLow && kl.priceHigh > 0 && kl.priceLow > 0;
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${meta.cls}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-[11px] min-w-[38px]">{meta.label}</span>
        {kl.timeframe && (
          <span className="text-[10px] rounded border border-current/30 bg-current/10 px-1.5 py-0.5 font-mono opacity-80">{kl.timeframe}</span>
        )}
        <span className="text-muted-foreground text-xs truncate">{kl.description}</span>
      </div>
      <span className="font-mono text-xs ml-2 flex-shrink-0">
        {isZone ? `${fmt(kl.priceLow)}–${fmt(kl.priceHigh)}` : fmt(kl.priceHigh)}
      </span>
    </div>
  );
}

function fmt(n: number) {
  if (!n) return "—";
  return n < 10 ? n.toFixed(5) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
