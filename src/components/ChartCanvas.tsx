import { useEffect, useRef } from "react";
import type { TradeAnalysis } from "@/lib/openai";

interface Props {
  imageUrl: string;
  analysis: TradeAnalysis;
}

// Zone box colors  [fill rgba, border hex]
const ZONE_STYLE: Record<string, [string, string]> = {
  order_block:  ["rgba(139,92,246,0.18)", "#8b5cf6"],   // violet
  fvg:          ["rgba(6,182,212,0.15)",  "#06b6d4"],   // cyan
  liquidity:    ["rgba(234,179,8,0.15)",  "#eab308"],   // yellow
  support:      ["rgba(59,130,246,0.12)", "#3b82f6"],   // blue
  resistance:   ["rgba(245,158,11,0.12)", "#f59e0b"],   // amber
  fibonacci:    ["rgba(16,185,129,0.12)", "#10b981"],   // emerald
  bos:          ["rgba(249,115,22,0.2)",  "#f97316"],   // orange (line only)
  choch:        ["rgba(236,72,153,0.2)",  "#ec4899"],   // pink (line only)
};

const LINE_COLORS = {
  entry:  "#a78bfa",
  tp:     "#22c55e",
  sl:     "#ef4444",
};

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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

      // Collect all prices to estimate chart scale
      const prices: number[] = [
        analysis.entry,
        analysis.stopLoss,
        ...analysis.takeProfits.map((tp) => (typeof tp === "number" ? tp : tp.price)),
        ...analysis.keyLevels.flatMap((kl) => [kl.priceHigh, kl.priceLow]),
      ].filter((p) => p > 0);

      if (prices.length === 0) return;

      const minP = Math.min(...prices);
      const maxP = Math.max(...prices);
      const range = maxP - minP || 1;
      const pad = range * 0.4;
      const lo = minP - pad;
      const hi = maxP + pad;

      const W = canvas.width;
      const H = canvas.height;
      const LABEL_W = Math.round(W * 0.18); // right label area
      const CHART_W = W - LABEL_W;

      const yOf = (price: number) =>
        H - ((price - lo) / (hi - lo)) * H;

      // ── Zone boxes ──────────────────────────────────────────
      for (const kl of analysis.keyLevels) {
        const isLine = kl.type === "bos" || kl.type === "choch";
        const [fillColor, borderColor] = ZONE_STYLE[kl.type] ?? ["rgba(255,255,255,0.08)", "#888"];
        const y1 = yOf(kl.priceHigh);
        const y2 = yOf(kl.priceLow);
        const top = Math.min(y1, y2);
        const boxH = Math.max(Math.abs(y1 - y2), 2);

        ctx.save();

        if (isLine) {
          // BOS / CHoCH — single dashed horizontal line
          const yMid = yOf((kl.priceHigh + kl.priceLow) / 2);
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 5]);
          ctx.beginPath();
          ctx.moveTo(0, yMid);
          ctx.lineTo(CHART_W, yMid);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Filled zone box
          ctx.fillStyle = fillColor;
          ctx.fillRect(0, top, CHART_W, boxH);
          // Top & bottom borders
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, top); ctx.lineTo(CHART_W, top);
          ctx.moveTo(0, top + boxH); ctx.lineTo(CHART_W, top + boxH);
          ctx.stroke();
        }

        ctx.restore();

        // Zone label on right
        const labelY = isLine
          ? yOf((kl.priceHigh + kl.priceLow) / 2)
          : top + boxH / 2;
        drawLabel(ctx, W, labelY, kl.description, borderColor, 10);
      }

      // ── R:R shaded areas ────────────────────────────────────
      const isLong = analysis.direction === "LONG";
      const tp1y = yOf(analysis.takeProfits[0].price);
      const entryY = yOf(analysis.entry);
      const sly = yOf(analysis.stopLoss);

      // Profit zone (entry → TP1)
      ctx.fillStyle = isLong ? "rgba(34,197,94,0.06)" : "rgba(34,197,94,0.06)";
      ctx.fillRect(0, Math.min(entryY, tp1y), CHART_W, Math.abs(entryY - tp1y));

      // Risk zone (entry → SL)
      ctx.fillStyle = "rgba(239,68,68,0.06)";
      ctx.fillRect(0, Math.min(entryY, sly), CHART_W, Math.abs(entryY - sly));

      // ── Entry / TP / SL lines ───────────────────────────────
      analysis.takeProfits.slice().reverse().forEach((tp, i) => {
        const price = typeof tp === "number" ? tp : tp?.price;
        if (!price) return;
        const idx = 2 - i;
        const prob = typeof tp === "object" ? tp.probability : null;
        const label = `TP${idx + 1}${prob ? `  ${prob}%` : ""}  ${fmtP(price)}`;
        drawHLine(ctx, CHART_W, yOf(price), LINE_COLORS.tp, label, false, 1.5);
      });
      drawHLine(ctx, CHART_W, sly, LINE_COLORS.sl, `SL  ${fmtP(analysis.stopLoss)}`, false, 2);
      drawHLine(ctx, CHART_W, entryY, LINE_COLORS.entry, `ENTRY  ${fmtP(analysis.entry)}`, false, 2);

      // ── Corner badge ────────────────────────────────────────
      const dirColor = isLong ? LINE_COLORS.tp : LINE_COLORS.sl;
      const badge = ` ${analysis.symbol}  ${analysis.direction}  ${analysis.confidence}% conf `;
      ctx.font = `bold ${Math.max(12, W * 0.013)}px monospace`;
      const bw = ctx.measureText(badge).width + 4;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath();
      ctx.roundRect(8, 8, bw, 24, 4);
      ctx.fill();
      ctx.fillStyle = dirColor;
      ctx.fillText(badge, 10, 26);
    };
    img.src = imageUrl;
  }, [imageUrl, analysis]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-border object-contain max-h-[440px]"
      style={{ display: "block" }}
    />
  );
}

function drawHLine(
  ctx: CanvasRenderingContext2D,
  chartW: number,
  y: number,
  color: string,
  label: string,
  dashed = false,
  lw = 1.5,
) {
  if (y < 0 || y > ctx.canvas.height) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(chartW, y);
  ctx.stroke();
  ctx.setLineDash([]);
  drawLabel(ctx, ctx.canvas.width, y, label, color, 11);
  ctx.restore();
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  y: number,
  text: string,
  color: string,
  fontSize = 10,
) {
  ctx.save();
  ctx.font = `bold ${fontSize}px monospace`;
  const tw = ctx.measureText(text).width;
  const pad = 5;
  const bw = tw + pad * 2;
  const bh = fontSize + 6;
  const bx = canvasW - bw - 4;
  const by = y - bh / 2;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 3);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.fillText(text, bx + pad, by + bh - 4);
  ctx.restore();
}

function fmtP(n: number) {
  if (!n) return "";
  return n < 10 ? n.toFixed(5) : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
