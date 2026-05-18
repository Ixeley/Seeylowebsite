const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const KEY_STORAGE = "seeylo_openai_key";

export function getStoredKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}
export function saveKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key.trim());
}
export function clearKey() {
  localStorage.removeItem(KEY_STORAGE);
}

export interface KeyLevel {
  type: "order_block" | "fvg" | "liquidity" | "bos" | "choch" | "fibonacci" | "support" | "resistance";
  priceHigh: number;
  priceLow: number;
  description: string;
}

export interface TradeAnalysis {
  direction: "LONG" | "SHORT";
  symbol: string;
  timeframe: string;
  currentPrice: number;
  entry: number;
  takeProfits: [number, number, number];
  stopLoss: number;
  riskReward: number;
  riskPoints: number;
  riskDollars: number;
  rewardDollars: number;
  confidence: number;
  tradeSetup: string;
  reasoning: string;
  whyDirection: string;
  keyLevels: KeyLevel[];
}

// Dollar value per 1 point move for common instruments
const INSTRUMENT_SPECS: Record<string, { dollarPerPoint: number; name: string }> = {
  NQ:    { dollarPerPoint: 20,  name: "E-mini NQ (NQ1!)" },
  MNQ:   { dollarPerPoint: 2,   name: "Micro NQ" },
  ES:    { dollarPerPoint: 50,  name: "E-mini S&P (ES1!)" },
  MES:   { dollarPerPoint: 5,   name: "Micro ES" },
  YM:    { dollarPerPoint: 5,   name: "Dow Futures (YM1!)" },
  MYM:   { dollarPerPoint: 0.5, name: "Micro Dow" },
  RTY:   { dollarPerPoint: 50,  name: "Russell 2000 (RTY1!)" },
  GC:    { dollarPerPoint: 100, name: "Gold Futures (GC1!)" },
  MGC:   { dollarPerPoint: 10,  name: "Micro Gold" },
  CL:    { dollarPerPoint: 1000,name: "Crude Oil (CL1!)" },
  "6E":  { dollarPerPoint: 125000, name: "Euro Futures" },
};

// Risk/reward targets for prop firm trading (1 contract)
const STYLE_TARGETS = {
  "Scalp": {
    riskDollars: [300, 450],
    profitDollars: [1000, 1500],
    description: "Tight scalp — 1 contract, prop firm rules",
  },
  "Day Trade": {
    riskDollars: [400, 600],
    profitDollars: [1200, 2000],
    description: "Day trade — 1 contract, clean setup",
  },
  "Swing Trade": {
    riskDollars: [500, 800],
    profitDollars: [2000, 4000],
    description: "Swing — 1 contract, overnight hold",
  },
};

function getInstrumentSpec(symbol: string) {
  const clean = symbol.replace(/1!|=F|USDT|USD/gi, "").toUpperCase().trim();
  return (
    INSTRUMENT_SPECS[clean] ??
    INSTRUMENT_SPECS[symbol.toUpperCase()] ??
    null
  );
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
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

const SCHEMA = `{
  "direction": "LONG" or "SHORT",
  "symbol": "<exact ticker from chart, e.g. NQ1!, MNQ, ES1!, BTCUSDT, EURUSD>",
  "timeframe": "<exact timeframe, e.g. 1m, 3m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <current price from right axis — exact number>,
  "entry": <entry price — at OB edge, FVG midpoint, or key level>,
  "takeProfits": [<tp1 nearest liquidity target>, <tp2 mid target>, <tp3 extended>],
  "stopLoss": <SL price — beyond OB invalidation, NO more than maxRiskPoints from entry>,
  "riskReward": <float R:R e.g. 3.2>,
  "riskPoints": <distance in points from entry to SL>,
  "riskDollars": <riskPoints × dollarPerPoint × 1 contract>,
  "rewardDollars": <(tp2 - entry) × dollarPerPoint × 1 contract, use absolute value>,
  "confidence": <integer 60-92>,
  "tradeSetup": "<1 sentence: exact trigger — pattern + level + entry reason>",
  "reasoning": "<5 sentences: 1) trend structure 2) OB/FVG confluence 3) momentum 4) liquidity target 5) invalidation>",
  "whyDirection": "<3 numbered reasons for LONG/SHORT, each with exact price level>",
  "keyLevels": [
    {
      "type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"support"|"resistance",
      "priceHigh": <upper bound of zone>,
      "priceLow": <lower bound of zone>,
      "description": "<e.g. '4H Bearish OB', 'FVG gap', 'Sell-side liquidity', 'BOS at 29120'>"
    }
  ]
}`;

const SYSTEM_PROMPT = `You are an elite ICT/SMC institutional trader who also coaches prop firm traders.

PROP FIRM CONTEXT — CRITICAL:
- Trader uses 1 contract. Goal: profit $1,000-1,500 per trade, max risk $300-500.
- NQ E-mini (NQ1!): $20/point. For $400 risk → max 20 point SL. For $1,200 profit → 60 point TP.
- MNQ Micro: $2/point. For $400 risk → max 200 point SL. For $1,200 profit → 600 point TP.
- ES E-mini (ES1!): $50/point. For $400 risk → max 8 point SL. For $1,200 profit → 24 point TP.
- BTC futures (BTCUSDT/BTC): 1 contract varies — scale SL/TP proportionally.
- SL must be tight and logical — behind an OB, swing low/high, or FVG. NOT a round number guess.
- TPs must be at REAL liquidity: equal highs/lows, swing points, previous session highs/lows.
- R:R minimum 2.5:1. Ideal 3:1 to 5:1. NEVER set TP1 closer than 2× SL distance.

ANALYSIS FRAMEWORK:
1. READ CHART: Find ticker (top-left), timeframe label, and current price (right axis) — exact numbers.
2. MARKET STRUCTURE: HH/HL = bullish, LH/LL = bearish. Mark every BOS and CHoCH with exact price.
3. ORDER BLOCKS: Last opposing candle before impulse. Give the full zone (high to low of that candle).
4. FVGs: Three-candle imbalance zone. Give exact high and low of the gap.
5. LIQUIDITY: Equal highs (buy-side liq), equal lows (sell-side liq), stop-hunt zones.
6. ENTRY: At OB 50% or upper/lower edge. At FVG fill. After CHoCH confirmation.
7. SL: Below/above the OB that invalidates the setup. Within prop firm risk limits.
8. TPs: TP1 = nearest liquidity (min 2× SL distance). TP2 = next major level. TP3 = session extreme.

Respond ONLY with valid JSON. No markdown. No text outside JSON.`;

function buildUserPrompt(tradeStyle: string): string {
  const targets = STYLE_TARGETS[tradeStyle as keyof typeof STYLE_TARGETS] ?? STYLE_TARGETS["Day Trade"];
  return `Analyze this chart for a ${tradeStyle} setup.

TARGET: Risk $${targets.riskDollars[0]}-${targets.riskDollars[1]}, Profit $${targets.profitDollars[0]}-${targets.profitDollars[1]} on 1 contract.

STEP 1: Read price axis (right side) → currentPrice
STEP 2: Read symbol + timeframe from chart labels
STEP 3: Full ICT/SMC analysis — structure, OBs, FVGs, liquidity
STEP 4: Find the best ${tradeStyle} setup with prop firm-safe SL/TP

Calculate maxRiskPoints based on the instrument ($20/pt for NQ, $50/pt for ES, etc).

Return JSON:
${SCHEMA}`;
}

function extractJSON(raw: string): TradeAnalysis | null {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as TradeAnalysis;
  } catch {
    return null;
  }
}

function normalize(r: TradeAnalysis): TradeAnalysis {
  const tps = Array.isArray(r.takeProfits) ? r.takeProfits : [];

  // Recalculate risk/reward dollars using instrument specs if AI missed them
  const spec = getInstrumentSpec(r.symbol ?? "");
  const riskPts = r.riskPoints || Math.abs(r.entry - r.stopLoss);
  const rewardPts = tps[1] ? Math.abs(tps[1] - r.entry) : Math.abs(tps[0] - r.entry);
  const dpp = spec?.dollarPerPoint ?? 1;

  return {
    ...r,
    symbol: r.symbol || "Unknown",
    timeframe: r.timeframe || "—",
    currentPrice: r.currentPrice || r.entry,
    tradeSetup: r.tradeSetup || "",
    whyDirection: r.whyDirection || "",
    riskPoints: +riskPts.toFixed(2),
    riskDollars: r.riskDollars || +(riskPts * dpp).toFixed(0),
    rewardDollars: r.rewardDollars || +(rewardPts * dpp).toFixed(0),
    keyLevels: Array.isArray(r.keyLevels)
      ? r.keyLevels.map((kl) => ({
          ...kl,
          priceHigh: kl.priceHigh ?? (kl as unknown as { price: number }).price ?? 0,
          priceLow: kl.priceLow ?? (kl as unknown as { price: number }).price ?? 0,
        }))
      : [],
    takeProfits: [tps[0] ?? 0, tps[1] ?? 0, tps[2] ?? 0],
  };
}

export async function analyzeChart(
  imageDataUrl: string,
  tradeStyle: string,
): Promise<TradeAnalysis> {
  const apiKey = getStoredKey();
  if (!apiKey) throw new Error("No OpenAI API key set. Click ⚙ to configure.");

  const compressed = await compressImage(imageDataUrl);
  const base64 = compressed.replace(/^data:image\/\w+;base64,/, "");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" } },
            { type: "text", text: buildUserPrompt(tradeStyle) },
          ],
        },
      ],
      max_tokens: 1400,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJSON(raw);
  if (!parsed?.entry) throw new Error("Could not parse AI response");
  return normalize(parsed);
}
