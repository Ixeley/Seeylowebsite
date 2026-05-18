import { useState } from "react";
import type { DeepSeekAnalysis, KeyLevel } from "@/lib/deepseek";
import { ConfidenceGauge } from "./ConfidenceGauge";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Crosshair,
  Target,
  Shield,
  Scale,
  Sparkles,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface Props {
  analysis: DeepSeekAnalysis;
  market: string;
  tradeStyle: string;
  onReset: () => void;
  onReanalyze: () => void;
}

export function AnalysisResult({ analysis: a, market, tradeStyle, onReset, onReanalyze }: Props) {
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [levelsOpen, setLevelsOpen] = useState(true);
  const isLong = a.direction === "LONG";
  const dirColor = isLong ? "text-bullish" : "text-bearish";
  const dirBg = isLong
    ? "bg-bullish/15 border-bullish/40 glow-bullish"
    : "bg-bearish/15 border-bearish/40 glow-bearish";
  const DirectionIcon = isLong ? ArrowUp : ArrowDown;
  const WhyIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <div className="glass-strong rounded-2xl p-5 animate-fade-up space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Analysis
          </div>
          <h3 className="text-xl font-bold">{a.symbol || market}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{tradeStyle}</span>
            {a.timeframe && a.timeframe !== "—" && (
              <>
                <span className="opacity-40">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {a.timeframe}
                </span>
              </>
            )}
            {a.currentPrice > 0 && (
              <>
                <span className="opacity-40">·</span>
                <span className="font-mono text-foreground">{fmt(a.currentPrice)}</span>
              </>
            )}
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold ${dirBg} ${dirColor}`}>
          <DirectionIcon className="h-4 w-4" /> {a.direction}
        </div>
      </div>

      {/* Trade setup trigger */}
      {a.tradeSetup && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary mr-2">Setup</span>
          <span className="text-foreground">{a.tradeSetup}</span>
        </div>
      )}

      {/* Price levels + gauge */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="space-y-2">
          <PriceRow icon={<Crosshair className="h-4 w-4 text-primary" />} label="Entry" value={fmt(a.entry)} />
          {a.takeProfits.map((tp, i) => (
            <PriceRow key={i} icon={<Target className="h-4 w-4 text-bullish" />} label={`TP${i + 1}`} value={fmt(tp)} accent="bullish" />
          ))}
          <PriceRow icon={<Shield className="h-4 w-4 text-bearish" />} label="Stop Loss" value={fmt(a.stopLoss)} accent="bearish" />
          <PriceRow icon={<Scale className="h-4 w-4 text-primary" />} label="Risk / Reward" value={`1 : ${a.riskReward}`} highlight />
        </div>
        <div className="flex justify-center">
          <ConfidenceGauge value={a.confidence} />
        </div>
      </div>

      {/* Why long/short */}
      {a.whyDirection && (
        <div className={`rounded-xl border p-4 ${isLong ? "bg-bullish/5 border-bullish/25" : "bg-bearish/5 border-bearish/25"}`}>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2 ${dirColor}`}>
            <WhyIcon className="h-3.5 w-3.5" />
            {isLong ? "Why Long" : "Why Short"}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{a.whyDirection}</p>
        </div>
      )}

      {/* Key levels accordion */}
      {((a.supportLevels?.length ?? 0) > 0 || (a.resistanceLevels?.length ?? 0) > 0 || (a.keyLevels?.length ?? 0) > 0) && (
        <div>
          <button
            onClick={() => setLevelsOpen(!levelsOpen)}
            className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition"
          >
            <span className="font-medium flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Key Levels</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${levelsOpen ? "rotate-180" : ""}`} />
          </button>
          {levelsOpen && (
            <div className="mt-2 space-y-1.5 animate-fade-up">
              {a.supportLevels?.map((p, i) => (
                <LevelRow key={`s${i}`} color="blue" label="Support" price={p} />
              ))}
              {a.resistanceLevels?.map((p, i) => (
                <LevelRow key={`r${i}`} color="amber" label="Resistance" price={p} />
              ))}
              {a.keyLevels?.map((kl, i) => (
                <KeyLevelRow key={i} kl={kl} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reasoning accordion */}
      <div>
        <button
          onClick={() => setReasoningOpen(!reasoningOpen)}
          className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm hover:bg-muted/50 transition"
        >
          <span className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-primary" /> Technical Reasoning</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${reasoningOpen ? "rotate-180" : ""}`} />
        </button>
        {reasoningOpen && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground animate-fade-up">{a.reasoning}</p>
        )}
      </div>

      {/* Actions */}
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

function PriceRow({ icon, label, value, accent, highlight }: {
  icon: React.ReactNode; label: string; value: string; accent?: "bullish" | "bearish"; highlight?: boolean;
}) {
  const valColor = accent === "bullish" ? "text-bullish" : accent === "bearish" ? "text-bearish" : "text-foreground";
  return (
    <div className={`flex items-center justify-between rounded-lg border border-border/60 px-4 py-2.5 ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div>
      <span className={`font-mono font-semibold ${valColor}`}>{value}</span>
    </div>
  );
}

function LevelRow({ color, label, price }: { color: "blue" | "amber"; label: string; price: number }) {
  const cls = color === "blue"
    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
    : "bg-amber-500/10 border-amber-500/30 text-amber-400";
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${cls}`}>
      <span className="font-medium">{label}</span>
      <span className="font-mono">{fmt(price)}</span>
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  order_block: "OB",
  fvg: "FVG",
  liquidity: "LIQ",
  bos: "BOS",
  fibonacci: "FIB",
  support: "S",
  resistance: "R",
};

const TYPE_COLORS: Record<string, string> = {
  order_block: "bg-violet-500/10 border-violet-500/30 text-violet-300",
  fvg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  liquidity: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
  bos: "bg-orange-500/10 border-orange-500/30 text-orange-300",
  fibonacci: "bg-pink-500/10 border-pink-500/30 text-pink-300",
  support: "bg-blue-500/10 border-blue-500/30 text-blue-300",
  resistance: "bg-amber-500/10 border-amber-500/30 text-amber-300",
};

function KeyLevelRow({ kl }: { kl: KeyLevel }) {
  const cls = TYPE_COLORS[kl.type] ?? "bg-muted/20 border-border/60 text-foreground";
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 text-sm ${cls}`}>
      <div className="flex items-center gap-2">
        <span className="font-bold text-xs">{TYPE_LABELS[kl.type] ?? kl.type.toUpperCase()}</span>
        <span className="text-muted-foreground">{kl.description}</span>
      </div>
      <span className="font-mono">{fmt(kl.price)}</span>
    </div>
  );
}

function fmt(n: number) {
  if (!n) return "—";
  return n < 10 ? n.toFixed(4) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
