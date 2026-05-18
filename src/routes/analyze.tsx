import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnalysisResult } from "@/components/AnalysisResult";
import { analyzeChart, type DeepSeekAnalysis } from "@/lib/deepseek";
import { saveAnalysis } from "@/lib/mockAnalysis";
import { Upload, ImageIcon, Sparkles, Loader2, X, Cpu } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  component: AnalyzePage,
});

const MARKETS = ["NQ", "S&P 500", "EUR/USD", "BTC", "Custom"];
const STYLES = ["Scalp", "Day Trade", "Swing Trade"];

const LOADING_STEPS = [
  "Reading chart structure...",
  "Identifying key levels...",
  "Detecting candlestick patterns...",
  "Calculating risk parameters...",
  "Finalizing trade plan...",
];

function AnalyzePage() {
  const [market, setMarket] = useState("NQ");
  const [tradeStyle, setTradeStyle] = useState("Day Trade");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<DeepSeekAnalysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 15 MB" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setAnalysis(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setLoadingStep(0);
    setAnalysis(null);

    // Animate loading steps
    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 700);

    try {
      const result = await analyzeChart(image, market, tradeStyle);
      clearInterval(stepInterval);
      setAnalysis(result);
      saveAnalysis({
        id: crypto.randomUUID(),
        market,
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
      toast.success("Analysis complete", {
        description: `${result.direction} setup · ${result.confidence}% confidence`,
      });
    } catch (err) {
      clearInterval(stepInterval);
      toast.error("Analysis failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-4">
            <Cpu className="h-3 w-3 text-primary" /> Powered by DeepSeek AI
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">Chart Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Upload a chart screenshot, configure your setup, and hit <span className="text-foreground font-medium">Analyze</span>.
          </p>
        </div>

        {/* Selectors */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <SelectField label="Market" value={market} options={MARKETS} onChange={setMarket} />
          <SelectField label="Trade Style" value={tradeStyle} options={STYLES} onChange={setTradeStyle} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: upload / preview */}
          <div className="flex flex-col gap-4">
            {!image ? (
              <DropZone
                dragging={dragging}
                inputRef={inputRef}
                onFile={handleFile}
                onDragChange={setDragging}
              />
            ) : (
              <div className="glass-strong rounded-2xl p-3 relative group">
                <img
                  src={image}
                  alt="Uploaded chart"
                  className="w-full rounded-xl border border-border object-contain max-h-[380px]"
                />
                <button
                  onClick={reset}
                  className="absolute top-5 right-5 h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-muted"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Analyze button — only shows after image is set */}
            {image && !loading && (
              <button
                onClick={handleAnalyze}
                className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 px-6 py-4 text-base font-semibold text-primary-foreground glow-primary hover:glow-primary transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Sparkles className="h-5 w-5" />
                Analyze Chart
              </button>
            )}

            {image && loading && (
              <button
                disabled
                className="w-full rounded-xl bg-primary/50 px-6 py-4 text-base font-semibold text-primary-foreground flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </button>
            )}
          </div>

          {/* Right: results */}
          <div>
            {loading && <LoadingState step={loadingStep} />}
            {!loading && analysis && (
              <AnalysisResult
                analysis={analysis}
                market={market}
                tradeStyle={tradeStyle}
                onReset={reset}
                onReanalyze={handleAnalyze}
              />
            )}
            {!loading && !analysis && <EmptyState hasImage={!!image} />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function DropZone({
  dragging,
  inputRef,
  onFile,
  onDragChange,
}: {
  dragging: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onDragChange: (v: boolean) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragChange(true); }}
      onDragLeave={() => onDragChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragChange(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center glass min-h-[380px] flex flex-col items-center justify-center ${
        dragging
          ? "border-primary glow-primary scale-[1.01]"
          : "border-border hover:border-primary/60 hover:glow-primary-sm"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 animate-pulse-glow">
        <Upload className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Drop your chart here</h3>
      <p className="text-sm text-muted-foreground mb-4">or click to browse · PNG, JPG up to 15 MB</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" /> TradingView · Thinkorswim · MT4/5 · anywhere
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
      <h3 className="text-lg font-semibold mb-2">AI is analyzing your chart...</h3>
      <p className="text-sm text-primary mb-6 min-h-[20px] transition-all">{LOADING_STEPS[step]}</p>
      <div className="w-full max-w-xs space-y-2">
        {LOADING_STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 text-xs">
            <div
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 transition-colors ${
                i < step ? "bg-bullish" : i === step ? "bg-primary animate-pulse" : "bg-muted"
              }`}
            />
            <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ hasImage }: { hasImage: boolean }) {
  return (
    <div className="glass rounded-2xl p-8 min-h-[380px] flex flex-col items-center justify-center text-center border-dashed">
      <Sparkles className="h-10 w-10 text-primary/60 mb-3" />
      <h3 className="font-semibold mb-1">Your analysis will appear here</h3>
      <p className="text-sm text-muted-foreground">
        {hasImage ? "Press Analyze Chart to start" : "Upload a chart to get started"}
      </p>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-2 relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl glass px-4 py-3 text-sm font-medium pr-10 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
        >
          {options.map((o) => (
            <option key={o} value={o} className="bg-card">
              {o}
            </option>
          ))}
        </select>
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5 8l5 5 5-5H5z" />
        </svg>
      </div>
    </label>
  );
}
