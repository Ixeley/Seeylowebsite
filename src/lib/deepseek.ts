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
  "symbol": "<ticker visible on chart, e.g. NQ1!, MNQ, BTCUSDT, EURUSD>",
  "timeframe": "<timeframe visible on chart, e.g. 1m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <current price — use the exact value provided in CURRENT PRICE below>,
  "entry": <entry price — must be within 1% of currentPrice>,
  "takeProfits": [<tp1>, <tp2>, <tp3>],
  "stopLoss": <stop loss — must be within 2% of currentPrice>,
  "riskReward": <R:R number e.g. 2.5>,
  "confidence": <integer 55-95>,
  "tradeSetup": "<1 sentence: exact setup — e.g. 'Bearish rejection from 4H OB at X with BOS below Y'>",
  "reasoning": "<3-4 sentences: trend, structure, confluence, momentum, invalidation>",
  "whyDirection": "<2-3 specific reasons for LONG or SHORT with exact price references>",
  "supportLevels": [<2-4 support prices near current price>],
  "resistanceLevels": [<2-4 resistance prices near current price>],
  "keyLevels": [
    {"type": "order_block"|"fvg"|"liquidity"|"bos"|"fibonacci"|"support"|"resistance", "price": <number>, "description": "<e.g. 4H Bearish OB>"}
  ]
}`;

function buildPrompt(market: string, style: string, currentPrice: number): string {
  const priceConstraint = currentPrice > 0
    ? `\n\n⚠️ CURRENT PRICE = ${currentPrice}
ALL prices (entry, stopLoss, takeProfits, supportLevels, resistanceLevels, keyLevels) MUST be within 3% of ${currentPrice}.
Do NOT produce prices outside the range [${(currentPrice * 0.97).toFixed(2)}, ${(currentPrice * 1.03).toFixed(2)}].`
    : "";

  return `You are a senior institutional trader using ICT / Smart Money Concepts (SMC).
Analyze the provided ${market} chart for a ${style} setup.${priceConstraint}

ANALYSIS FRAMEWORK:
1. Determine trend structure: higher highs/lows (bullish) or lower highs/lows (bearish)
2. Identify Break of Structure (BOS) and Change of Character (CHoCH)
3. Mark Order Blocks (OB): last opposing candle before the impulsive move
4. Find Fair Value Gaps (FVG): 3-candle imbalance zones
5. Mark liquidity pools: equal highs/lows, stops above/below swing points
6. Set entry at OB edge or key S/R, TP at next liquidity target, SL below/above structure
7. Read symbol and timeframe from chart labels

${currentPrice > 0 ? `REMINDER: Every price in your JSON must be near ${currentPrice}. Entry, SL, and TPs must all be within 3% of ${currentPrice}.` : ""}

Respond ONLY with valid JSON. No markdown, no text outside JSON:
${SCHEMA}`;
}

async function callAPI(
  model: string,
  messages: object[],
  maxTokens = 900,
): Promise<string | null> {
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
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as DeepSeekAnalysis;
  } catch {
    return null;
  }
}

function validatePrices(r: DeepSeekAnalysis, currentPrice: number): boolean {
  if (currentPrice <= 0) return true;
  const lo = currentPrice * 0.97;
  const hi = currentPrice * 1.03;
  const check = (p: number) => p >= lo && p <= hi;
  return check(r.entry) && check(r.stopLoss) && r.takeProfits.every((tp) => check(tp));
}

function normalize(r: DeepSeekAnalysis, market: string, currentPrice: number): DeepSeekAnalysis {
  const tps = Array.isArray(r.takeProfits) ? r.takeProfits : [];
  return {
    ...r,
    symbol: r.symbol || market,
    timeframe: r.timeframe || "—",
    currentPrice: r.currentPrice || currentPrice || r.entry,
    tradeSetup: r.tradeSetup || "",
    whyDirection: r.whyDirection || "",
    supportLevels: Array.isArray(r.supportLevels) ? r.supportLevels.filter(Boolean) : [],
    resistanceLevels: Array.isArray(r.resistanceLevels) ? r.resistanceLevels.filter(Boolean) : [],
    keyLevels: Array.isArray(r.keyLevels) ? r.keyLevels : [],
    takeProfits: [tps[0] ?? 0, tps[1] ?? 0, tps[2] ?? 0],
  };
}

const SYSTEM =
  "You are a senior institutional trading analyst using ICT/SMC methodology. Respond ONLY with a valid JSON object — no markdown, no text outside the JSON.";

export async function analyzeChart(
  imageDataUrl: string,
  market: string,
  tradeStyle: string,
  currentPrice: number,
): Promise<DeepSeekAnalysis> {
  const compressed = await compressImage(imageDataUrl);
  const prompt = buildPrompt(market, tradeStyle, currentPrice);

  const visionMessages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: compressed } },
        { type: "text", text: prompt },
      ],
    },
  ];

  // Try vision models (deepseek-vl2, deepseek-vl) — fail silently if not available
  for (const model of ["deepseek-vl2", "deepseek-vl"]) {
    const raw = await callAPI(model, visionMessages);
    if (raw) {
      const parsed = extractJSON(raw);
      if (parsed?.entry && validatePrices(parsed, currentPrice)) {
        return normalize(parsed, market, currentPrice);
      }
    }
  }

  // Try deepseek-chat with image attached
  const chatVisionRaw = await callAPI("deepseek-chat", visionMessages);
  if (chatVisionRaw) {
    const parsed = extractJSON(chatVisionRaw);
    if (parsed?.entry && validatePrices(parsed, currentPrice)) {
      return normalize(parsed, market, currentPrice);
    }
  }

  // Text-only fallback — price constraint makes this accurate when currentPrice is set
  const textMessages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: prompt },
  ];
  const textRaw = await callAPI("deepseek-chat", textMessages, 1000);
  if (textRaw) {
    const parsed = extractJSON(textRaw);
    if (parsed?.entry) return normalize(parsed, market, currentPrice);
  }

  throw new Error("All API attempts failed or returned invalid data.");
}
