export interface TakeProfit {
  price: number;
  probability: number;
  reason: string;
}

export interface KeyLevel {
  type: "order_block" | "fvg" | "liquidity" | "bos" | "choch" | "fibonacci" | "support" | "resistance";
  priceHigh: number;
  priceLow: number;
  description: string;
  timeframe?: string;
}

export type EntryMode = "standard" | "fast";
export type Plan = "free" | "basic" | "pro" | "platinum";
export type Strategy = "ICT/SMC" | "Wyckoff" | "Elliott Wave" | "Classic TA";

export interface TradeAnalysis {
  noTrade?: boolean;
  noTradeReason?: string;
  waitForNews?: boolean;
  upcomingNews?: string | null;
  direction: "LONG" | "SHORT";
  symbol: string;
  symbolDescription?: string;
  timeframe: string;
  currentPrice: number;
  entry: number;
  takeProfits: [TakeProfit, TakeProfit, TakeProfit];
  stopLoss: number;
  riskReward: number;
  riskPoints: number;
  riskDollars: number;
  rewardDollars: number;
  confidence: number;
  entryMode: EntryMode;
  strategy?: Strategy;
  holdTime?: string;
  tradeSetup: string;
  reasoning: string;
  whyDirection: string;
  marketCondition?: string;
  newsContext?: string;
  keyLevels: KeyLevel[];
  annotateChartIndex?: number;
}

const INSTRUMENT_DPP: Record<string, number> = {
  NQ: 20, MNQ: 2, ES: 50, MES: 5, YM: 5, MYM: 0.5, RTY: 50, GC: 100, MGC: 10, CL: 1000,
};

function getDPP(symbol: string): number {
  const clean = symbol.replace(/1!|=F|USDT|USD|PERP/gi, "").toUpperCase().trim();
  return INSTRUMENT_DPP[clean] ?? INSTRUMENT_DPP[symbol.toUpperCase()] ?? 1;
}

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1600;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = dataUrl;
  });
}

function normalizeTPs(tps: unknown[]): [TakeProfit, TakeProfit, TakeProfit] {
  return [0, 1, 2].map((i) => {
    const tp = tps[i];
    if (typeof tp === "number") return { price: tp, probability: 70 - i * 18, reason: "—" };
    if (tp && typeof (tp as TakeProfit).price === "number") return tp as TakeProfit;
    return { price: 0, probability: 0, reason: "—" };
  }) as [TakeProfit, TakeProfit, TakeProfit];
}

function normalize(r: TradeAnalysis): TradeAnalysis {
  const tps = normalizeTPs(Array.isArray(r.takeProfits) ? r.takeProfits : []);
  const dpp = getDPP(r.symbol ?? "");
  const riskPts = r.riskPoints || Math.abs((r.entry || 0) - (r.stopLoss || 0));
  const rewardPts = tps[1]?.price ? Math.abs(tps[1].price - r.entry) : Math.abs((tps[0]?.price || 0) - r.entry);

  return {
    ...r,
    symbol: r.symbol || "Unknown",
    timeframe: r.timeframe || "—",
    currentPrice: r.currentPrice || r.entry,
    tradeSetup: r.tradeSetup || "",
    whyDirection: r.whyDirection || "",
    marketCondition: r.marketCondition || "",
    entryMode: r.entryMode || "standard",
    riskPoints: +riskPts.toFixed(2),
    riskDollars: r.riskDollars || +(riskPts * dpp).toFixed(0),
    rewardDollars: r.rewardDollars || +(rewardPts * dpp).toFixed(0),
    riskReward: r.riskReward || +(rewardPts / (riskPts || 1)).toFixed(2),
    takeProfits: tps,
    keyLevels: Array.isArray(r.keyLevels)
      ? r.keyLevels.map((kl) => ({
          ...kl,
          priceHigh: kl.priceHigh ?? (kl as unknown as { price: number }).price ?? 0,
          priceLow: kl.priceLow ?? (kl as unknown as { price: number }).price ?? 0,
        }))
      : [],
  };
}

export async function analyzeChart(
  imageDataUrls: string[],
  tradeStyle: string,
  entryMode: EntryMode = "standard",
  plan: Plan = "basic",
  strategy: Strategy = "ICT/SMC",
): Promise<TradeAnalysis> {
  const compressed = await Promise.all(imageDataUrls.map(compressImage));

  const res = await fetch("/.netlify/functions/analyze-chart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: compressed, tradeStyle, entryMode, plan, strategy }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }

  const data = await res.json();
  if (!data.entry && !data.noTrade) throw new Error("Could not parse AI response");
  return normalize(data as TradeAnalysis);
}

export async function checkNewsForSymbol(symbol: string): Promise<string> {
  const res = await fetch("/.netlify/functions/check-news", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symbol }),
  });

  if (!res.ok) throw new Error(`News check failed (${res.status})`);
  const data = await res.json();
  return data.text ?? "No data returned.";
}

export function getCurrentSession(): string {
  const h = new Date().getUTCHours();
  if (h >= 13 && h < 16) return "London/NY Overlap";
  if (h >= 13 && h < 21) return "New York";
  if (h >= 7  && h < 13) return "London";
  if (h >= 0  && h < 8)  return "Asian";
  return "Off-hours";
}

export function getPlanSlotCount(plan: Plan): number {
  return { free: 1, basic: 1, pro: 2, platinum: 3 }[plan];
}

export const SLOT_TIMEFRAMES: Record<string, Record<Plan, string[]>> = {
  "Scalp":       { free: ["5m"], basic: ["5m"], pro: ["5m", "1m"],   platinum: ["1m", "5m", "15m"] },
  "Day Trade":   { free: ["15m"], basic: ["15m"], pro: ["15m", "5m"], platinum: ["5m", "15m", "1H"] },
  "Swing Trade": { free: ["4H"], basic: ["4H"], pro: ["4H", "1D"],   platinum: ["1H", "4H", "1D"] },
};
