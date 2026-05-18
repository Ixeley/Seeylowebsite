import { useEffect, useRef } from "react";
import type { DeepSeekAnalysis } from "@/lib/deepseek";

interface Props {
  imageUrl: string;
  analysis: DeepSeekAnalysis;
}

const COLORS = {
  entry: "#a78bfa",   // purple
  tp: "#22c55e",      // green
  sl: "#ef4444",      // red
  support: "#3b82f6", // blue
  resistance: "#f59e0b", // amber
  text: "#ffffff",
  bg: "rgba(0,0,0,0.72)",
};

export function ChartCanvas({ imageUrl, analysis }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Gather all prices to compute visible range
      const allPrices = [
        analysis.entry,
        analysis.stopLoss,
        ...analysis.takeProfits,
        ...(analysis.supportLevels ?? []),
        ...(analysis.resistanceLevels ?? []),
      ].filter(Boolean);

      if (allPrices.length === 0) return;

      const minP = Math.min(...allPrices);
      const maxP = Math.max(...allPrices);
      const range = maxP - minP || 1;
      const pad = range * 0.35;
      const lo = minP - pad;
      const hi = maxP + pad;

      const yOf = (price: number) =>
        canvas.height - ((price - lo) / (hi - lo)) * canvas.height;

      const drawLine = (price: number, color: string, label: string, dashed = false) => {
        const y = yOf(price);
        if (y < 0 || y > canvas.height) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        if (dashed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label badge on right
        const text = `${label}  ${fmtPrice(price)}`;
        const padding = 6;
        ctx.font = `bold ${Math.max(11, canvas.width * 0.012)}px monospace`;
        const tw = ctx.measureText(text).width;
        const bw = tw + padding * 2;
        const bh = 18;
        const bx = canvas.width - bw - 8;
        const by = y - bh / 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 3);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.fillText(text, bx + padding, by + bh - 5);
        ctx.restore();
      };

      const drawZone = (y1: number, y2: number, color: string) => {
        const top = Math.min(y1, y2);
        const h = Math.abs(y1 - y2);
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(0, top, canvas.width, h);
        ctx.restore();
      };

      // R:R zone: entry to TP1
      const isLong = analysis.direction === "LONG";
      drawZone(yOf(analysis.entry), yOf(analysis.takeProfits[0]), "rgba(34,197,94,0.07)");
      drawZone(yOf(analysis.entry), yOf(analysis.stopLoss), "rgba(239,68,68,0.07)");

      // Support / resistance (dashed)
      analysis.supportLevels?.forEach((p) => drawLine(p, COLORS.support, "S", true));
      analysis.resistanceLevels?.forEach((p) => drawLine(p, COLORS.resistance, "R", true));

      // TPs
      analysis.takeProfits.slice().reverse().forEach((tp, i) => {
        const idx = 2 - i;
        drawLine(tp, COLORS.tp, `TP${idx + 1}`);
      });

      // SL + Entry (on top)
      drawLine(analysis.stopLoss, COLORS.sl, "SL");
      drawLine(analysis.entry, COLORS.entry, "ENTRY");

      // Corner badge
      const dir = analysis.direction;
      const dirColor = isLong ? COLORS.tp : COLORS.sl;
      const badge = `${analysis.symbol || ""}  ${dir}  ${analysis.confidence}% conf`;
      ctx.save();
      ctx.font = `bold ${Math.max(12, canvas.width * 0.014)}px sans-serif`;
      const bw = ctx.measureText(badge).width + 20;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(10, 10, bw, 26, 4);
      ctx.fill();
      ctx.fillStyle = dirColor;
      ctx.fillText(badge, 20, 28);
      ctx.restore();
    };
    img.src = imageUrl;
  }, [imageUrl, analysis]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-border object-contain max-h-[420px]"
      style={{ display: "block" }}
    />
  );
}

function fmtPrice(n: number) {
  if (!n) return "—";
  return n < 10 ? n.toFixed(4) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
