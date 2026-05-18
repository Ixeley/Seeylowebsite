import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ParticleBackground } from "@/components/ParticleBackground";
import { AnalysisResult } from "@/components/AnalysisResult";
import { generateMockAnalysis, saveAnalysis, type Analysis } from "@/lib/mockAnalysis";
import { Upload, ImageIcon, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Analyze Chart — Seeylo AI" },
      { name: "description", content: "Upload a trading chart and get instant AI-generated entries, take profits, and stop losses." },
    ],
  }),
  component: AnalyzePage,
});

const MARKETS = ["NQ", "S&P 500", "EUR/USD", "BTC", "Custom"];
const STYLES = ["Scalp", "Day Trade", "Swing Trade"];

function AnalyzePage() {
  const [market, setMarket] = useState("NQ");
  const [tradeStyle, setTradeStyle] = useState("Day Trade");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
      runAnalysis(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = (dataUrl: string) => {
    setLoading(true);
    setAnalysis(null);
    setTimeout(() => {
      const a = generateMockAnalysis(market, tradeStyle, dataUrl);
      setAnalysis(a);
      saveAnalysis(a);
      setLoading(false);
      toast.success("Analysis complete", { description: `${a.direction} setup with ${a.confidence}% confidence` });
    }, 1800);
  };

  const reset = () => { setImage(null); setAnalysis(null); };

  return (
    <div className="min-h-screen">
      <ParticleBackground />
      <Header />

      <main className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">Chart Analysis</h1>
          <p className="text-muted-foreground mt-2">Drop a screenshot and let the AI build your trade plan.</p>
        </div>

        {/* Selectors */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Select label="Market" value={market} options={MARKETS} onChange={setMarket} />
          <Select label="Trade Style" value={tradeStyle} options={STYLES} onChange={setTradeStyle} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: upload / image */}
          <div>
            {!image ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragging(false);
                  const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-12 text-center glass min-h-[420px] flex flex-col items-center justify-center ${dragging ? "border-primary glow-primary scale-[1.01]" : "border-border hover:border-primary/60 hover:glow-primary-sm"}`}
              >
                <input
                  ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div className="h-16 w-16 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center mb-5 animate-pulse-glow">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Drop your chart here</h3>
                <p className="text-sm text-muted-foreground mb-4">or click to browse · PNG, JPG up to 10MB</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-3.5 w-3.5" /> TradingView, Thinkorswim, MT4/5, anywhere
                </div>
              </div>
            ) : (
              <div className="glass-strong rounded-2xl p-4">
                <img src={image} alt="Uploaded chart" className="w-full rounded-xl border border-border" />
              </div>
            )}
          </div>

          {/* Right: results */}
          <div>
            {loading && <LoadingState />}
            {!loading && analysis && <AnalysisResult a={analysis} onReset={reset} />}
            {!loading && !analysis && !image && <EmptyState />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-2 relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl glass px-4 py-3 text-sm font-medium pr-10 focus:outline-none focus:ring-2 focus:ring-primary/60 transition"
        >
          {options.map((o) => <option key={o} value={o} className="bg-card">{o}</option>)}
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M5 8l5 5 5-5H5z" /></svg>
      </div>
    </label>
  );
}

function LoadingState() {
  return (
    <div className="glass-strong rounded-2xl p-8 min-h-[420px] flex flex-col items-center justify-center text-center">
      <div className="relative h-16 w-16 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <h3 className="text-lg font-semibold mb-2">AI is analyzing your chart...</h3>
      <p className="text-sm text-muted-foreground mb-6">Detecting structure, levels, and momentum</p>
      <div className="w-full max-w-xs space-y-2">
        {[80, 60, 90].map((w, i) => (
          <div key={i} className="h-3 rounded bg-muted overflow-hidden">
            <div className="h-full animate-shimmer" style={{ width: `${w}%`, background: "linear-gradient(90deg, var(--primary), transparent)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl p-8 min-h-[420px] flex flex-col items-center justify-center text-center border-dashed">
      <Sparkles className="h-10 w-10 text-primary/60 mb-3" />
      <h3 className="font-semibold mb-1">Your analysis will appear here</h3>
      <p className="text-sm text-muted-foreground">Upload a chart to get started</p>
    </div>
  );
}
