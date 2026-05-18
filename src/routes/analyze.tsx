import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnalysisResult } from "@/components/AnalysisResult";
import { ChartCanvas } from "@/components/ChartCanvas";
import { analyzeChart, type DeepSeekAnalysis } from "@/lib/deepseek";
import { fetchLivePrice } from "@/lib/priceAPI";
import { saveAnalysis } from "@/lib/mockAnalysis";
import { Upload, ImageIcon, Sparkles, Loader2, X, Cpu, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  component: AnalyzePage,
});

const MARKETS = ["NQ", "S&P 500", "EUR/USD", "BTC", "ETH", "GC", "CL", "Custom"];
const STYLES = ["Scalp", "Day Trade", "Swing Trade"];

const TIMEFRAME_GUIDE: Record<string, string> = {
  "Scalp":       "1m – 5m",
  "Day Trade":   "15m – 1H",
  "Swing Trade": "4H – 1D",
};

const LOADING_STEPS = [
  "Reading chart structure...",
  "Detecting symbol & timeframe...",
  "Identifying order blocks & FVGs...",
  "Mapping liquidity & BOS levels...",
  "Finalizing institutional setup...",
];

function AnalyzePage() {
  const [market, setMarket] = useState("NQ");
  const [tradeStyle, setTradeStyle] = useState("Day Trade");
  const [priceInput, setPriceInput] = useState("");
  const [priceFetching, setPriceFetching] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [analysis, setAnalysis] = useState<DeepSeekAnalysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-fetch price when market changes
  useEffect(() => {
    setPriceInput("");
    setAnalysis(null);
    if (market === "Custom") return;
    let cancelled = false;
    setPriceFetching(true);
    fetchLivePrice(market).then((price) => {
      if (cancelled) return;
      if (price) setPriceInput(String(price));
      setPriceFetching(false);
    });
    return () => { cancelled = true; };
  }, [market]);

  const handleFetchPrice = () => {
    if (market === "Custom") return;
    setPriceFetching(true);
    fetchLivePrice(market).then((price) => {
      setPriceFetching(false);
      if (price) {
        setPriceInput(String(price));
        toast.success("Price updated", { description: `${market}: ${price.toLocaleString()}` });
      } else {
        toast.error("Could not fetch price", { description: "Enter it manually" });
      }
    });
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("File too large", { description: "Max 15 MB" }); return; }
    const reader = new FileReader();
    reader.onload = (e) => { setImage(e.target?.result as string); setAnalysis(null); };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    const currentPrice = parseFloat(priceInput.replace(/,/g, "")) || 0;
    if (currentPrice <= 0) {
      toast.error("Enter current price", { description: "Look at the price axis on your chart and enter the current price" });
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setAnalysis(null);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 900);

    try {
      const result = await analyzeChart(image, market, tradeStyle, currentPrice);
      clearInterval(stepInterval);
      setAnalysis(result);
      saveAnalysis({
        id: crypto.randomUUID(),
        market: result.symbol || market,
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
        description: `${result.symbol || market} · ${result.direction} · ${result.confidence}% confidence`,
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

  const tfGuide = TIMEFRAME_GUIDE[tradeStyle];

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs text-muted-foreground mb-4">
            <Cpu className="h-3 w-3 text-primary" /> DeepSeek AI · ICT/SMC Analysis
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">Chart Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Upload your chart, enter the current price, and get a professional trade plan.
          </p>
        </div>

        {/* Config row */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Market */}
          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Market</span>
            <div className="mt-2 relative">
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="w-full appearance-none rounded-xl glass px-4 py-3 text-sm font-medium pr-10 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
              >
                {MARKETS.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 8l5 5 5-5H5z" />
              </svg>
            </div>
          </div>

          {/* Current Price */}
          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Current Price <span className="text-primary">*</span>
            </span>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={priceFetching ? "Fetching…" : "e.g. 29000"}
                className="flex-1 rounded-xl glass px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/60 transition placeholder:text-muted-foreground/50"
              />
              {market !== "Custom" && (
                <button
                  onClick={handleFetchPrice}
                  disabled={priceFetching}
                  className="rounded-xl glass px-3 py-3 text-muted-foreground hover:text-primary transition disabled:opacity-50"
                  title="Refresh live price"
                >
                  <RefreshCw className={`h-4 w-4 ${priceFetching ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Check your chart's price axis and enter the current price
            </p>
          </div>

          {/* Trade Style */}
          <div>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Trade Style
            </span>
            <div className="mt-2 relative">
              <select
                value={tradeStyle}
                onChange={(e) => setTradeStyle(e.target.value)}
                className="w-full appearance-none rounded-xl glass px-4 py-3 text-sm font-medium pr-10 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
              >
                {STYLES.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 8l5 5 5-5H5z" />
              </svg>
            </div>
            {tfGuide && (
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Use a <span className="text-primary font-medium">{tfGuide}</span> chart screenshot
              </p>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: upload / annotated chart */}
          <div className="flex flex-col gap-4">
            {!image ? (
              <DropZone dragging={dragging} inputRef={inputRef} onFile={handleFile} onDragChange={setDragging} />
            ) : (
              <div className="glass-strong rounded-2xl p-3 relative group">
                {analysis
                  ? <ChartCanvas imageUrl={image} analysis={analysis} />
                  : <img src={image} alt="Uploaded chart" className="w-full rounded-xl border border-border object-contain max-h-[400px]" />
                }
                <button onClick={reset} className="absolute top-5 right-5 h-7 w-7 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-muted" title="Remove">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {image && !loading && (
              <button onClick={handleAnalyze} className="w-full rounded-xl bg-gradient-to-r from-primary to-primary/70 px-6 py-4 text-base font-semibold text-primary-foreground glow-primary hover:glow-primary transition flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]">
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
              <AnalysisResult analysis={analysis} market={market} tradeStyle={tradeStyle} onReset={reset} onReanalyze={handleAnalyze} />
            )}
            {!loading && !analysis && <EmptyState hasImage={!!image} style={tradeStyle} hasPrice={!!priceInput} />}
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
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center glass min-h-[380px] flex flex-col items-center justify-center ${dragging ? "border-primary glow-primary scale-[1.01]" : "border-border hover:border-primary/60 hover:glow-primary-sm"}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 animate-pulse-glow">
        <Upload className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Drop your chart here</h3>
      <p className="text-sm text-muted-foreground mb-4">or click to browse · PNG, JPG up to 15 MB</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" /> TradingView · Thinkorswim · MT4/5 · NinjaTrader
      </div>
    </div>
  );
}

function LoadingState({ step }: { step: number }) {
  return (
    <div className="glass-strong rounded-2xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center">
      <div className="relative h-16 w-16 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">AI reading your chart...</h3>
      <p className="text-sm text-primary mb-6 min-h-[20px]">{LOADING_STEPS[step]}</p>
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

function EmptyState({ hasImage, style, hasPrice }: { hasImage: boolean; style: string; hasPrice: boolean }) {
  const guide = TIMEFRAME_GUIDE[style];
  const missing = !hasImage ? "upload a chart" : !hasPrice ? "enter the current price" : null;
  return (
    <div className="glass rounded-2xl p-8 min-h-[380px] flex flex-col items-center justify-center text-center border-dashed">
      <Sparkles className="h-10 w-10 text-primary/60 mb-3" />
      <h3 className="font-semibold mb-1">Your analysis will appear here</h3>
      {missing ? (
        <p className="text-sm text-muted-foreground">Next: <span className="text-primary">{missing}</span></p>
      ) : (
        <p className="text-sm text-muted-foreground">Press Analyze Chart to start</p>
      )}
      {guide && !hasImage && (
        <div className="mt-4 glass rounded-lg px-4 py-3 text-xs text-muted-foreground max-w-xs">
          <span className="text-primary font-medium">{style}</span> → use a{" "}
          <span className="text-foreground font-medium">{guide}</span> chart
        </div>
      )}
    </div>
  );
}
