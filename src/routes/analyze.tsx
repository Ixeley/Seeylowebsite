import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnalysisResult } from "@/components/AnalysisResult";
import { ChartCanvas } from "@/components/ChartCanvas";
import {
  analyzeChart, checkNewsForSymbol, getCurrentSession, getPlanSlotCount, SLOT_TIMEFRAMES,
  type TradeAnalysis, type EntryMode, type Plan, type Strategy,
} from "@/lib/openai";
import { saveAnalysis } from "@/lib/mockAnalysis";
import { useAuth } from "@/lib/auth";
import { Upload, Sparkles, X, Zap, BookOpen, Lock, Newspaper, Clock, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  component: AnalyzePage,
});

const STYLES = ["Scalp", "Day Trade", "Swing Trade"] as const;
type Style = (typeof STYLES)[number];

const STRATEGIES: Strategy[] = ["ICT/SMC", "Wyckoff", "Elliott Wave", "Classic TA"];

const STRATEGY_LOADING: Record<Strategy, string[]> = {
  "ICT/SMC": [
    "Reading chart symbol & timeframe...",
    "Mapping market structure & BOS...",
    "Identifying Order Blocks & FVGs...",
    "Locating liquidity pools & targets...",
    "Calculating probabilities & R:R...",
    "Finalizing trade parameters...",
  ],
  "Wyckoff": [
    "Reading chart symbol & timeframe...",
    "Identifying Wyckoff phase...",
    "Detecting Springs & Upthrusts...",
    "Mapping accumulation/distribution...",
    "Calculating cause & effect targets...",
    "Finalizing trade parameters...",
  ],
  "Elliott Wave": [
    "Reading chart symbol & timeframe...",
    "Counting Elliott Wave structure...",
    "Identifying impulse & corrective waves...",
    "Projecting Fibonacci extensions...",
    "Validating wave rules & guidelines...",
    "Finalizing trade parameters...",
  ],
  "Classic TA": [
    "Reading chart symbol & timeframe...",
    "Mapping support & resistance...",
    "Identifying chart patterns...",
    "Checking RSI & momentum...",
    "Calculating targets & invalidation...",
    "Finalizing trade parameters...",
  ],
};

const PLAN_UPGRADE: Record<Plan, string> = {
  free: "Upgrade to Basic",
  basic: "Upgrade to Pro",
  pro: "Upgrade to Platinum",
  platinum: "",
};


const SESSION_COLORS: Record<string, string> = {
  "Asian":            "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  "London":           "text-amber-400 border-amber-400/30 bg-amber-400/10",
  "New York":         "text-green-400 border-green-400/30 bg-green-400/10",
  "London/NY Overlap":"text-violet-400 border-violet-400/30 bg-violet-400/10",
  "Off-hours":        "text-muted-foreground border-border bg-muted/20",
};

function AnalyzePage() {
  const { profile } = useAuth();
  const plan: Plan = "platinum";
  const [tradeStyle, setTradeStyle] = useState<Style>("Day Trade");
  const [strategy, setStrategy] = useState<Strategy>("ICT/SMC");
  const [entryMode, setEntryMode] = useState<EntryMode>("standard");
  const [images, setImages] = useState<(string | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null);
  const [news, setNews] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const session = getCurrentSession();
  const sessionCls = SESSION_COLORS[session] ?? SESSION_COLORS["Off-hours"];
  const unlockedSlots = getPlanSlotCount(plan);
  const slotTFs = SLOT_TIMEFRAMES[tradeStyle]?.[plan] ?? [];
  const uploadedImages = images.filter(Boolean) as string[];

  const handleFile = useCallback((file: File, slot: number) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large — max 20 MB"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImages((prev) => { const next = [...prev]; next[slot] = e.target?.result as string; return next; });
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = (slot: number) => {
    setImages((prev) => { const next = [...prev]; next[slot] = null; return next; });
    setAnalysis(null);
    setNews(null);
  };

  const handleAnalyze = async () => {
    if (uploadedImages.length === 0) return;
    setLoading(true);
    setLoadingStep(0);
    setAnalysis(null);
    setNews(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 900);

    try {
      const result = await analyzeChart(uploadedImages, tradeStyle, entryMode, plan, strategy);
      clearInterval(stepInterval);
      setAnalysis(result);

      if (result.waitForNews && result.upcomingNews) {
        toast.warning("News incoming — hold your entry!", { description: result.upcomingNews, duration: 8000 });
      }
      if (result.noTrade) {
        toast.warning(`No-trade conditions detected`, { description: result.noTradeReason ?? "Check reasoning below" });
      } else {
        saveAnalysis({
          id: crypto.randomUUID(),
          market: result.symbol,
          tradeStyle,
          direction: result.direction,
          entry: result.entry,
          takeProfits: result.takeProfits,
          stopLoss: result.stopLoss,
          riskReward: result.riskReward,
          confidence: result.confidence,
          reasoning: result.reasoning,
          createdAt: new Date().toISOString(),
        });
        toast.success(`${result.symbol} · ${result.direction}`, {
          description: `Entry ${result.entry.toLocaleString()} · ${result.confidence}% confidence`,
        });
      }
    } catch (err) {
      clearInterval(stepInterval);
      toast.error("Analysis failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const handleCheckNews = async () => {
    const symbol = analysis?.symbol ?? "NQ";
    setNewsLoading(true);
    setNews(null);
    try {
      const result = await checkNewsForSymbol(symbol);
      setNews(result);
    } catch (err) {
      toast.error("News check failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setNewsLoading(false);
    }
  };

  const reset = () => { setImages([null, null, null]); setAnalysis(null); setNews(null); };

  const canAnalyze = uploadedImages.length > 0 && !loading;
  const fastLocked = plan === "free" || plan === "basic";

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        {/* Page header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse" />
                GPT-4o Vision · {strategy}
              </div>
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${sessionCls}`}>
                <Clock className="h-3 w-3" /> {session} session
              </div>
              {session === "Off-hours" && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs text-yellow-400">
                  <AlertTriangle className="h-3 w-3" /> Low liquidity
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient">Chart Analysis</h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Upload chart screenshots — AI reads symbol, structure, and gives a professional trade plan.
            </p>
          </div>

          {/* Plan badge */}
          <a
            href="/pricing"
            className="flex items-center gap-2 rounded-xl glass border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/50 transition capitalize"
          >
            <span className="h-2 w-2 rounded-full bg-primary" />
            {plan} plan
            {plan !== "platinum" && <span className="text-xs text-muted-foreground ml-1">· Upgrade</span>}
          </a>
        </div>

        {/* Trade style + strategy + entry mode */}
        <div className="mb-8 flex flex-wrap gap-6 items-start">
          <div className="flex-1 min-w-[220px] max-w-sm">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Trade Style</span>
            <div className="mt-2 flex gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setTradeStyle(s)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    tradeStyle === s
                      ? "bg-primary text-primary-foreground border-primary glow-primary-sm"
                      : "glass border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Strategy</span>
            <div className="mt-2 flex gap-2 flex-wrap">
              {STRATEGIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStrategy(s)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    strategy === s
                      ? "bg-primary/20 border-primary/60 text-primary"
                      : "glass border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              Entry Mode
              {fastLocked && <span className="text-[10px] rounded-full border border-yellow-400/30 bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5">Pro+</span>}
            </span>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => { if (!fastLocked) setEntryMode("fast"); else toast.info("Fast mode requires Pro or Platinum plan"); }}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  entryMode === "fast" && !fastLocked
                    ? "bg-yellow-500/20 border-yellow-400/60 text-yellow-300"
                    : fastLocked
                    ? "glass border-border text-muted-foreground/40 cursor-not-allowed"
                    : "glass border-border text-muted-foreground hover:text-foreground hover:border-yellow-400/30"
                }`}
              >
                {fastLocked ? <Lock className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />} Fast
              </button>
              <button
                onClick={() => setEntryMode("standard")}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                  entryMode === "standard"
                    ? "bg-primary/20 border-primary/60 text-primary"
                    : "glass border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" /> Standard
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {entryMode === "fast" && !fastLocked
                ? <><span className="text-yellow-400 font-medium">Market now</span> — enters at current price</>
                : <><span className="text-primary font-medium">Limit order</span> — waits for OB/FVG pullback</>
              }
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: chart slots + analyze button */}
          <div className="flex flex-col gap-4">
            {/* 3 image slots */}
            <div className={`grid gap-3 ${unlockedSlots >= 2 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1"}`}>
              {[0, 1, 2].map((slot) => {
                const unlocked = slot < unlockedSlots;
                const tf = slotTFs[slot];
                const img = images[slot];

                if (!unlocked) {
                  return (
                    <LockedSlot key={slot} slot={slot} plan={plan} upgrade={PLAN_UPGRADE[plan]} />
                  );
                }

                const isAnnotated = analysis && (analysis.annotateChartIndex ?? uploadedImages.length - 1) === slot;
                return (
                  <ImageSlot
                    key={slot}
                    slot={slot}
                    tf={tf}
                    image={img}
                    analysis={isAnnotated ? analysis : undefined}
                    dragging={draggingSlot === slot}
                    inputRef={inputRefs[slot]}
                    compact={unlockedSlots >= 2}
                    onFile={handleFile}
                    onRemove={removeImage}
                    onDragChange={(v) => setDraggingSlot(v ? slot : null)}
                  />
                );
              })}
            </div>

            {/* Analyze button */}
            {canAnalyze && (
              <button
                onClick={handleAnalyze}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 px-6 py-4 text-base font-semibold text-primary-foreground glow-primary hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                Analyze {uploadedImages.length > 1 ? `${uploadedImages.length} Charts` : "Chart"}
              </button>
            )}
            {loading && <LoadingButton />}
            {!canAnalyze && !loading && uploadedImages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-2">
                Upload {unlockedSlots > 1 ? "at least one chart" : "a chart"} to start analysis
              </div>
            )}
          </div>

          {/* Right: results */}
          <div className="space-y-4">
            {loading && <LoadingState step={loadingStep} chartCount={uploadedImages.length} strategy={strategy} />}
            {!loading && analysis && (
              <>

                {/* News warning */}
                {analysis.waitForNews && analysis.upcomingNews && (
                  <div className="rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-4 py-3 flex items-start gap-3 animate-fade-up">
                    <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-400">Hold your entry — news incoming</p>
                      <p className="text-xs text-yellow-300/80 mt-0.5">{analysis.upcomingNews}</p>
                    </div>
                  </div>
                )}

                {analysis.noTrade ? (
                  <NoTradeCard reason={analysis.noTradeReason ?? "Conditions not favorable"} onReset={reset} />
                ) : (
                  <AnalysisResult
                    analysis={analysis}
                    tradeStyle={tradeStyle}
                    onReset={reset}
                    onReanalyze={handleAnalyze}
                  />
                )}
                {/* News check */}
                <div className="glass-strong rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Newspaper className="h-4 w-4 text-primary" />
                      News · {analysis.symbol}
                    </div>
                    <button
                      onClick={handleCheckNews}
                      disabled={newsLoading}
                      className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-50"
                    >
                      {newsLoading
                        ? <span className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        : <Sparkles className="h-3 w-3" />
                      }
                      {newsLoading ? "Checking..." : "Check News"}
                    </button>
                  </div>
                  {news && <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line animate-fade-up">{news}</p>}
                  {!news && !newsLoading && (
                    <p className="text-xs text-muted-foreground/60">Check for FOMC, CPI, NFP and other events that may affect this pair today.</p>
                  )}
                </div>
              </>
            )}
            {!loading && !analysis && (
              <EmptyState hasImages={uploadedImages.length > 0} style={tradeStyle} session={session} plan={plan} />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ImageSlot({
  slot, tf, image, analysis, dragging, inputRef, compact, onFile, onRemove, onDragChange,
}: {
  slot: number; tf: string; image: string | null; analysis?: TradeAnalysis;
  dragging: boolean; inputRef: React.RefObject<HTMLInputElement | null>; compact: boolean;
  onFile: (f: File, slot: number) => void;
  onRemove: (slot: number) => void;
  onDragChange: (v: boolean) => void;
}) {
  const minH = compact ? "min-h-[140px]" : "min-h-[380px]";

  if (image) {
    return (
      <div className={`glass-strong rounded-2xl p-2 relative group ${minH} flex flex-col`}>
        <div className="flex items-center justify-between px-2 py-1 mb-1">
          <span className="text-[10px] font-mono text-muted-foreground">Chart {slot + 1}</span>
          <div className="flex items-center gap-1.5">
            {analysis && <span className="text-[10px] text-primary font-semibold">● annotated</span>}
            {tf && <span className="text-[10px] rounded-full border border-primary/40 bg-primary/10 text-primary px-2 py-0.5 font-mono">{tf}</span>}
          </div>
        </div>
        {analysis
          ? <ChartCanvas imageUrl={image} analysis={analysis} />
          : <img src={image} alt={`Chart ${slot + 1}`} className="w-full flex-1 rounded-xl object-contain border border-border" style={{ maxHeight: compact ? "120px" : "360px" }} />
        }
        <button
          onClick={() => onRemove(slot)}
          className="absolute top-3 right-3 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-muted"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragChange(true); }}
      onDragLeave={() => onDragChange(false)}
      onDrop={(e) => { e.preventDefault(); onDragChange(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f, slot); }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all glass flex flex-col items-center justify-center text-center ${minH} ${
        dragging ? "border-primary glow-primary scale-[1.01]" : "border-border hover:border-primary/60 hover:glow-primary-sm"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, slot); }}
      />
      <div className={`rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-2 ${compact ? "h-8 w-8" : "h-12 w-12"}`}>
        <Upload className={`text-primary ${compact ? "h-4 w-4" : "h-6 w-6"}`} />
      </div>
      {tf && (
        <span className={`font-mono text-primary font-bold ${compact ? "text-sm" : "text-xl"}`}>{tf}</span>
      )}
      {!compact && <p className="text-xs text-muted-foreground mt-1">Drop chart or click</p>}
      {compact && <p className="text-[10px] text-muted-foreground mt-0.5">Chart {slot + 1}</p>}
    </div>
  );
}

function LockedSlot({ slot, plan, upgrade }: { slot: number; plan: Plan; upgrade: string }) {
  const needsPlan = slot === 1 ? "Pro" : "Platinum";
  return (
    <div className="rounded-2xl border-2 border-dashed border-border/40 flex flex-col items-center justify-center text-center min-h-[140px] bg-muted/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/5 to-transparent" />
      <Lock className="h-5 w-5 text-muted-foreground/50 mb-1.5" />
      <span className="text-xs font-semibold text-muted-foreground/70">{needsPlan}+</span>
      {upgrade && (
        <a href="/pricing" className="mt-2 text-[10px] text-primary hover:underline">{upgrade}</a>
      )}
    </div>
  );
}

function LoadingButton() {
  return (
    <div className="w-full rounded-xl bg-primary/30 px-6 py-4 flex items-center justify-center gap-3 cursor-not-allowed">
      <div className="relative h-5 w-5">
        <div className="absolute inset-0 rounded-full border-2 border-primary/30" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
      <span className="text-sm font-semibold text-primary-foreground/80">Analyzing...</span>
    </div>
  );
}

function LoadingState({ step, chartCount, strategy }: { step: number; chartCount: number; strategy: Strategy }) {
  const LOADING_STEPS = STRATEGY_LOADING[strategy];
  return (
    <div className="glass-strong rounded-2xl p-8 min-h-[380px] flex flex-col items-center justify-center text-center">
      {/* Orbital scanning animation */}
      <div className="relative h-24 w-24 mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-spin" style={{ animationDuration: "3s" }} />
        {/* Scanning ring */}
        <div className="absolute inset-1 rounded-full border-2 border-transparent border-t-primary border-r-primary/50 animate-spin" style={{ animationDuration: "1.2s" }} />
        {/* Inner ring */}
        <div className="absolute inset-3 rounded-full border border-bullish/30 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
        {/* Center pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 rounded-full bg-primary/30 animate-pulse-glow" />
          <div className="absolute h-3 w-3 rounded-full bg-primary" />
        </div>
        {/* Orbit dot */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: "1.2s" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-2 w-2 rounded-full bg-primary glow-primary-sm" />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-1">
        Analyzing {chartCount > 1 ? `${chartCount} charts` : "chart"}...
      </h3>
      <p className="text-sm text-primary mb-6 h-5 transition-all">{LOADING_STEPS[step]}</p>

      <div className="w-full max-w-xs space-y-2.5">
        {LOADING_STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-3 text-xs">
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 transition-all ${
              i < step ? "bg-bullish scale-110" : i === step ? "bg-primary animate-pulse scale-125" : "bg-muted"
            }`} />
            <div className={`flex-1 h-0.5 rounded-full transition-all ${i < step ? "bg-bullish/40" : i === step ? "bg-primary/40" : "bg-muted/30"}`} />
            <span className={`transition-colors w-48 text-left ${i < step ? "text-bullish/80" : i === step ? "text-foreground" : "text-muted-foreground/50"}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoTradeCard({ reason, onReset }: { reason: string; onReset: () => void }) {
  return (
    <div className="glass-strong rounded-2xl p-6 border border-yellow-400/30 animate-fade-up">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-full bg-yellow-400/15 border border-yellow-400/40 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="font-bold text-yellow-400">No-Trade Condition Detected</h3>
          <p className="text-xs text-muted-foreground">AI recommends sitting this one out</p>
        </div>
      </div>
      <div className="rounded-xl bg-yellow-400/5 border border-yellow-400/20 px-4 py-3 text-sm text-foreground/90 leading-relaxed mb-5">
        {reason}
      </div>
      <div className="text-xs text-muted-foreground mb-4">
        Patience is a skill. Missing a trade is better than losing on a low-probability setup. Wait for clearer structure.
      </div>
      <button
        onClick={onReset}
        className="w-full rounded-xl glass border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted/60 transition"
      >
        Upload a Different Chart
      </button>
    </div>
  );
}

function EmptyState({ hasImages, style, session, plan }: { hasImages: boolean; style: Style; session: string; plan: Plan }) {
  const tfs = SLOT_TIMEFRAMES[style]?.[plan] ?? [];
  return (
    <div className="glass rounded-2xl p-8 min-h-[380px] flex flex-col items-center justify-center text-center">
      <Sparkles className="h-10 w-10 text-primary/50 mb-4" />
      <h3 className="font-semibold mb-1 text-lg">
        {hasImages ? "Ready to analyze" : "Your analysis will appear here"}
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        {hasImages
          ? "Press Analyze — AI reads symbol, structure, and probability"
          : "Upload a chart screenshot to get started"}
      </p>
      {tfs.length > 0 && (
        <div className="space-y-2 w-full max-w-xs">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Recommended timeframes</p>
          {tfs.map((tf, i) => (
            <div key={i} className="flex items-center justify-between glass rounded-lg px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Chart {i + 1}</span>
              <span className="font-mono font-bold text-primary">{tf}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
