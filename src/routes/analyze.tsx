import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnalysisResult } from "@/components/AnalysisResult";
import { ChartCanvas } from "@/components/ChartCanvas";
import { analyzeChart, getStoredKey, saveKey, type TradeAnalysis } from "@/lib/openai";
import { saveAnalysis } from "@/lib/mockAnalysis";
import { Upload, ImageIcon, Sparkles, Loader2, X, Settings, Check } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  component: AnalyzePage,
});

const STYLES = ["Scalp", "Day Trade", "Swing Trade"] as const;
type Style = (typeof STYLES)[number];

const TIMEFRAME_GUIDE: Record<Style, string> = {
  "Scalp":       "1m – 5m",
  "Day Trade":   "15m – 1H",
  "Swing Trade": "4H – 1D",
};

const LOADING_STEPS = [
  "Reading chart symbol & price...",
  "Mapping market structure...",
  "Finding order blocks & FVGs...",
  "Mapping liquidity & BOS/CHoCH...",
  "Finalizing trade parameters...",
];

function AnalyzePage() {
  const [tradeStyle, setTradeStyle] = useState<Style>("Day Trade");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [hasKey, setHasKey] = useState(() => !!getStoredKey());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("File too large", { description: "Max 20 MB" }); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setImage(e.target?.result as string); setAnalysis(null); };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setLoadingStep(0);
    setAnalysis(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 1100);

    try {
      const result = await analyzeChart(image, tradeStyle);
      clearInterval(stepInterval);
      setAnalysis(result);
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
    } catch (err) {
      clearInterval(stepInterval);
      toast.error("Analysis failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const reset = () => { setImage(null); setAnalysis(null); };

  const handleSaveKey = () => {
    const k = keyDraft.trim();
    if (!k.startsWith("sk-")) { toast.error("Invalid key format"); return; }
    saveKey(k);
    setHasKey(true);
    setShowKeyInput(false);
    setKeyDraft("");
    toast.success("API key saved");
  };

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        {/* Page header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-bullish animate-pulse" />
            GPT-4o Vision · ICT/SMC Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">Chart Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Upload a chart screenshot — AI reads the symbol, price, and structure automatically.
          </p>
        </div>

        {/* API key setup */}
        {(!hasKey || showKeyInput) && (
          <div className="mb-6 glass rounded-xl border border-primary/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">OpenAI API Key</span>
              <span className="text-xs text-muted-foreground ml-auto">Stored locally in your browser</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                placeholder="sk-proj-..."
                className="flex-1 rounded-lg glass px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground/40"
              />
              <button onClick={handleSaveKey} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Save
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Get a free key at <span className="text-primary">platform.openai.com/api-keys</span>
            </p>
          </div>
        )}
        {hasKey && !showKeyInput && (
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-bullish" />
            GPT-4o connected
            <button onClick={() => { setShowKeyInput(true); setKeyDraft(""); }} className="ml-2 hover:text-foreground transition underline">change key</button>
          </div>
        )}

        {/* Trade style selector */}
        <div className="mb-8 max-w-sm">
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
          <p className="mt-2 text-xs text-muted-foreground">
            Use a <span className="text-primary font-medium">{TIMEFRAME_GUIDE[tradeStyle]}</span> chart for best results
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: chart */}
          <div className="flex flex-col gap-4">
            {!image ? (
              <DropZone dragging={dragging} inputRef={inputRef} onFile={handleFile} onDragChange={setDragging} />
            ) : (
              <div className="glass-strong rounded-2xl p-3 relative group">
                {analysis
                  ? <ChartCanvas imageUrl={image} analysis={analysis} />
                  : <img src={image} alt="Chart" className="w-full rounded-xl border border-border object-contain max-h-[420px]" />
                }
                <button
                  onClick={reset}
                  className="absolute top-5 right-5 h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-muted"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {image && !loading && (
              <button
                onClick={handleAnalyze}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 px-6 py-4 text-base font-semibold text-primary-foreground glow-primary hover:glow-primary transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles className="h-5 w-5" /> Analyze Chart
              </button>
            )}
            {image && loading && (
              <button disabled className="w-full rounded-xl bg-primary/40 px-6 py-4 text-base font-semibold text-primary-foreground flex items-center justify-center gap-2 cursor-not-allowed">
                <Loader2 className="h-5 w-5 animate-spin" /> Analyzing...
              </button>
            )}
          </div>

          {/* Right: results */}
          <div>
            {loading && <LoadingState step={loadingStep} />}
            {!loading && analysis && (
              <AnalysisResult
                analysis={analysis}
                tradeStyle={tradeStyle}
                onReset={reset}
                onReanalyze={handleAnalyze}
              />
            )}
            {!loading && !analysis && <EmptyState hasImage={!!image} style={tradeStyle} />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DropZone({ dragging, inputRef, onFile, onDragChange }: {
  dragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onDragChange: (v: boolean) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragChange(true); }}
      onDragLeave={() => onDragChange(false)}
      onDrop={(e) => { e.preventDefault(); onDragChange(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center glass min-h-[420px] flex flex-col items-center justify-center ${
        dragging ? "border-primary glow-primary scale-[1.01]" : "border-border hover:border-primary/60 hover:glow-primary-sm"
      }`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 animate-pulse-glow">
        <Upload className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Drop your chart here</h3>
      <p className="text-sm text-muted-foreground mb-4">or click to browse · PNG, JPG, up to 20 MB</p>
      <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
        {["TradingView", "Thinkorswim", "MT4/5", "NinjaTrader", "Tradovate"].map((p) => (
          <span key={p} className="glass rounded-full px-2.5 py-1">{p}</span>
        ))}
      </div>
    </div>
  );
}

function LoadingState({ step }: { step: number }) {
  return (
    <div className="glass-strong rounded-2xl p-8 min-h-[420px] flex flex-col items-center justify-center text-center">
      <div className="relative h-16 w-16 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">GPT-4o reading your chart...</h3>
      <p className="text-sm text-primary mb-6 min-h-[20px] transition-all">{LOADING_STEPS[step]}</p>
      <div className="w-full max-w-xs space-y-2">
        {LOADING_STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2.5 text-xs">
            <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 transition-colors ${i < step ? "bg-bullish" : i === step ? "bg-primary animate-pulse" : "bg-muted"}`} />
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasImage, style }: { hasImage: boolean; style: Style }) {
  return (
    <div className="glass rounded-2xl p-8 min-h-[420px] flex flex-col items-center justify-center text-center border-dashed">
      <Sparkles className="h-10 w-10 text-primary/60 mb-3" />
      <h3 className="font-semibold mb-1">
        {hasImage ? "Ready to analyze" : "Your analysis will appear here"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {hasImage ? "Press Analyze Chart — AI reads everything from your screenshot" : "Upload a chart screenshot to get started"}
      </p>
      {!hasImage && (
        <div className="glass rounded-lg px-4 py-3 text-xs text-muted-foreground">
          <span className="text-primary font-semibold">{style}</span>
          {" → "}
          <span className="text-foreground font-medium">{TIMEFRAME_GUIDE[style]}</span> chart
        </div>
      )}
    </div>
  );
}
