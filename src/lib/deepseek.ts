const DEEPSEEK_API_KEY = "sk-256eb46bb4b1489b906b1864bfc13783";
const DEEPSEEK_BASE = "https://api.deepseek.com";

export interface KeyLevel {
  type: "order_block" | "fvg" | "liquidity" | "bos" | "fibonacci" | "support" | "resistance";
  price: number;
  description: string;
}

export interface DeepSeekAnalysis {
  direction: "LONG" | "SHORT";
  symbol: string;
  timeframe: string;
  currentPrice: number;
  entry: number;
  takeProfits: [number, number, number];
  stopLoss: number;
  riskReward: number;
  confidence: number;
  tradeSetup: string;
  reasoning: string;
  whyDirection: string;
  supportLevels: number[];
  resistanceLevels: number[];
  keyLevels: KeyLevel[];
}

// Current approximate prices (2025-2026) for text-only fallback
const CURRENT_PRICES: Record<string, { approx: number; note: string }> = {
  "NQ":       { approx: 21500,  note: "Nasdaq-100 E-mini Futures (NQ1!/MNQ) — currently ~21,500" },
  "S&P 500":  { approx: 5900,   note: "S&P 500 E-mini Futures (ES1!/MES) — currently ~5,900" },
  "EUR/USD":  { approx: 1.0850, note: "Euro/USD forex — currently ~1.0850" },
  "BTC":      { approx: 104000, note: "Bitcoin/USD — currently ~104,000" },
  "ETH":      { approx: 2500,   note: "Ethereum/USD — currently ~2,500" },
  "GC":       { approx: 3300,   note: "Gold Futures (GC) — currently ~3,300" },
  "CL":       { approx: 62,     note: "Crude Oil Futures (CL) — currently ~62" },
  "Custom":   { approx: 0,      note: "" },
};

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1400;
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
  "symbol": "<instrument ticker visible on chart — e.g. NQ1!, MNQ, BTCUSDT, EURUSD, ES1!>",
  "timeframe": "<timeframe label visible on chart — e.g. 1m, 3m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <most recent price on chart right axis — exact number>,
  "entry": <precise entry price from chart structure>,
  "takeProfits": [<tp1>, <tp2>, <tp3>],
  "stopLoss": <precise SL price>,
  "riskReward": <R:R number e.g. 2.5>,
  "confidence": <integer 55-95>,
  "tradeSetup": "<1 sentence: exact setup trigger — e.g. 'Bearish rejection from 4H order block at 21,340 with break of structure'>",
  "reasoning": "<3-4 sentences: trend structure, key confluence, momentum, invalidation level>",
  "whyDirection": "<2-3 bullet-style reasons for LONG or SHORT with exact price levels>",
  "supportLevels": [<2-4 key support prices>],
  "resistanceLevels": [<2-4 key resistance prices>],
  "keyLevels": [
    {"type": "order_block"|"fvg"|"liquidity"|"bos"|"fibonacci"|"support"|"resistance", "price": <number>, "description": "<e.g. 4H Bearish OB>"},
    ...
  ]
}`;

function buildVisionPrompt(market: string, style: string): string {
  const hint = CURRENT_PRICES[market];
  const priceHint = hint?.approx
    ? `\nNote: if you cannot read the price axis, ${hint.note}.`
    : "";

  return `You are a senior institutional trader and technical analyst. Analyze this ${market} chart for a ${style} setup.

STEP 1 — READ THE CHART:
- Find the ticker/symbol label (usually top-left of chart)
- Find the timeframe label (e.g. "5" = 5m, "1H", "D")
- Read the current price from the RIGHT price axis — this is the most important step${priceHint}

STEP 2 — MARKET STRUCTURE ANALYSIS:
- Identify trend: higher highs/lows (uptrend) or lower highs/lows (downtrend)
- Mark Break of Structure (BOS) and Change of Character (CHoCH)
- Find Order Blocks (OB): last bearish candle before bullish impulse (bullish OB) or last bullish candle before bearish impulse (bearish OB)
- Find Fair Value Gaps (FVG/imbalances): 3-candle patterns with price gap
- Mark liquidity pools: equal highs/lows, swing points
- Note support/resistance levels from previous pivots

STEP 3 — TRADE SETUP:
- Direction based on structure
- Entry at OB edge, FVG, or key S/R level
- TP1 at nearest liquidity, TP2 and TP3 at next major levels
- SL below/above the OB or last swing that invalidates the setup

Respond ONLY with valid JSON, no markdown, no text outside the JSON:
${SCHEMA}`;
}

function buildTextPrompt(market: string, style: string): string {
  const hint = CURRENT_PRICES[market] ?? { approx: 100, note: market };
  const priceNote = hint.approx > 0
    ? `\nCURRENT PRICE REFERENCE: ${hint.note}. All prices MUST be near this level.`
    : "";

  return `You are a senior institutional trader. Provide a complete professional ${style} trade plan for ${market}.${priceNote}

Perform a full ICT/SMC analysis:
- Identify current trend structure (higher highs/lows or lower highs/lows)
- Find the key Order Block (OB) where price is likely to react
- Note any Fair Value Gaps (FVG) in the path
- Mark Break of Structure (BOS) that confirms direction
- Set entry at the OB or key level, TP at liquidity targets, SL below/above structure

CRITICAL: All prices MUST reflect current ${market} market prices as of 2025-2026. Do NOT use prices from before 2024.

Respond ONLY with valid JSON, no markdown, no text outside the JSON:
${SCHEMA}`;
}

async function callAPI(model: string, messages: object[], maxTokens = 900): Promise<string | null> {
  try {
    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.1,
        response_format: { type: "text" },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function extractJSON(raw: string): DeepSeekAnalysis | null {
  // Strip markdown fences if present
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as DeepSeekAnalysis;
  } catch {
    return null;
  }
}

function normalize(r: DeepSeekAnalysis, market: string): DeepSeekAnalysis {
  const tps = Array.isArray(r.takeProfits) ? r.takeProfits : [];
  return {
    ...r,
    symbol: r.symbol || market,
    timeframe: r.timeframe || "—",
    currentPrice: r.currentPrice || r.entry,
    tradeSetup: r.tradeSetup || "",
    whyDirection: r.whyDirection || "",
    supportLevels: Array.isArray(r.supportLevels) ? r.supportLevels.filter(Boolean) : [],
    resistanceLevels: Array.isArray(r.resistanceLevels) ? r.resistanceLevels.filter(Boolean) : [],
    keyLevels: Array.isArray(r.keyLevels) ? r.keyLevels : [],
    takeProfits: [tps[0] ?? 0, tps[1] ?? 0, tps[2] ?? 0],
  };
}

const SYSTEM = "You are a senior institutional trading analyst. Respond ONLY with a valid JSON object — no markdown fences, no explanation, no text before or after the JSON.";

export async function analyzeChart(
  imageDataUrl: string,
  market: string,
  tradeStyle: string,
): Promise<DeepSeekAnalysis> {
  const compressed = await compressImage(imageDataUrl);
  const visionMsg = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: compressed } },
        { type: "text", text: buildVisionPrompt(market, tradeStyle) },
      ],
    },
  ];

  // Try vision models
  for (const model of ["deepseek-vl2", "deepseek-vl", "deepseek-vl2-small"]) {
    const raw = await callAPI(model, visionMsg);
    if (raw) {
      const parsed = extractJSON(raw);
      if (parsed?.entry && parsed.entry > 0) return normalize(parsed, market);
    }
  }

  // Try deepseek-chat with image (may or may not work)
  const chatVisionRaw = await callAPI("deepseek-chat", visionMsg);
  if (chatVisionRaw) {
    const parsed = extractJSON(chatVisionRaw);
    if (parsed?.entry && parsed.entry > 0) return normalize(parsed, market);
  }

  // Text-only fallback with current price anchors
  const textRaw = await callAPI("deepseek-chat", [
    { role: "system", content: SYSTEM },
    { role: "user", content: buildTextPrompt(market, tradeStyle) },
  ]);
  if (textRaw) {
    const parsed = extractJSON(textRaw);
    if (parsed?.entry && parsed.entry > 0) return normalize(parsed, market);
  }

  throw new Error("All API attempts failed or returned invalid data.");
}
