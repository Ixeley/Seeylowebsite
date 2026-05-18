export type Direction = "LONG" | "SHORT";

export interface Analysis {
  id: string;
  market: string;
  tradeStyle: string;
  direction: Direction;
  entry: number;
  takeProfits: number[];
  stopLoss: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
  createdAt: string;
  imageDataUrl?: string;
}

const REASONS = [
  "Price is rejecting a major demand zone with strong bullish engulfing pattern. Volume confirms momentum shift, with RSI diverging from recent lows. Structure suggests continuation toward the next supply zone.",
  "Bearish break of structure on the lower timeframe, combined with rejection from key resistance. Momentum indicators show weakening buyer activity. Target aligns with previous swing low liquidity.",
  "Confluence of fibonacci retracement (0.618), ascending trendline support, and order block. Risk is well defined below structure. Reward target captures liquidity above prior highs.",
];

const PRICES: Record<string, number> = {
  NQ: 19850, "S&P 500": 5320, "EUR/USD": 1.085, BTC: 67400, Custom: 100,
};

export function generateMockAnalysis(market: string, tradeStyle: string, imageDataUrl?: string): Analysis {
  const base = PRICES[market] ?? 100;
  const direction: Direction = Math.random() > 0.45 ? "LONG" : "SHORT";
  const sign = direction === "LONG" ? 1 : -1;
  const volatility = base * 0.004;
  const entry = +(base + (Math.random() - 0.5) * volatility * 2).toFixed(base < 10 ? 4 : 2);
  const slDist = volatility * (1 + Math.random());
  const stopLoss = +(entry - sign * slDist).toFixed(base < 10 ? 4 : 2);
  const tp1 = +(entry + sign * slDist * 1.2).toFixed(base < 10 ? 4 : 2);
  const tp2 = +(entry + sign * slDist * 2).toFixed(base < 10 ? 4 : 2);
  const tp3 = +(entry + sign * slDist * 3).toFixed(base < 10 ? 4 : 2);
  const riskReward = +(2 + Math.random() * 1.5).toFixed(2);
  const confidence = Math.floor(62 + Math.random() * 33);
  return {
    id: crypto.randomUUID(),
    market,
    tradeStyle,
    direction,
    entry,
    takeProfits: [tp1, tp2, tp3],
    stopLoss,
    riskReward,
    confidence,
    reasoning: REASONS[Math.floor(Math.random() * REASONS.length)],
    createdAt: new Date().toISOString(),
    imageDataUrl,
  };
}

const KEY = "seeylo_analyses";

export function saveAnalysis(a: Analysis) {
  if (typeof window === "undefined") return;
  const list = getAnalyses();
  // strip image data url to keep storage small
  const { imageDataUrl, ...rest } = a;
  list.unshift(rest as Analysis);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function getAnalyses(): Analysis[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to parse analyses", e);
    return [];
  }
}
