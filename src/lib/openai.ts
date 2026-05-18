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
  price: number;
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
  "symbol": "<exact ticker from chart label, e.g. NQ1!, BTCUSDT, EURUSD, ES1!, AAPL>",
  "timeframe": "<exact timeframe from chart label, e.g. 1m, 3m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <current price read from right price axis — exact number, mandatory>,
  "entry": <entry price — exact level from chart structure>,
  "takeProfits": [<tp1 — nearest target>, <tp2 — mid target>, <tp3 — extended target>],
  "stopLoss": <stop loss price — below/above the key structure>,
  "riskReward": <float, e.g. 2.8>,
  "confidence": <integer 55-95>,
  "tradeSetup": "<1 precise sentence describing the exact setup: pattern + level + trigger>",
  "reasoning": "<4-5 sentences: market structure, institutional order flow, momentum, confluence, invalidation>",
  "whyDirection": "<3 specific numbered reasons for LONG or SHORT, each referencing a price level>",
  "supportLevels": [<2-5 key support prices from chart>],
  "resistanceLevels": [<2-5 key resistance prices from chart>],
  "keyLevels": [
    {"type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"fibonacci"|"support"|"resistance",
     "price": <number>,
     "description": "<concise label, e.g. '4H Bearish OB', 'Sell-side liquidity', 'FVG 19280-19340'>"}
  ]
}`;

const SYSTEM_PROMPT = `You are an elite institutional trading analyst specializing in ICT (Inner Circle Trader) and Smart Money Concepts (SMC).

Your analysis framework:
1. READ THE CHART LABELS: Find the ticker symbol (top-left) and timeframe. Find the current price on the RIGHT price axis.
2. MARKET STRUCTURE: Identify trend via Higher Highs/Higher Lows (bullish) or Lower Highs/Lower Lows (bearish). Mark every Break of Structure (BOS) and Change of Character (CHoCH).
3. ORDER BLOCKS (OB): The last opposing candle before a significant impulse move. Bullish OB = last bearish candle before bullish impulse. Bearish OB = last bullish candle before bearish impulse.
4. FAIR VALUE GAPS (FVG): Three-candle imbalance — when the third candle's range doesn't overlap the first candle's range. Price tends to retrace to fill FVGs.
5. LIQUIDITY: Identify equal highs/lows (stop hunts), buy-side liquidity (BSL) above swing highs, sell-side liquidity (SSL) below swing lows.
6. TRADE DIRECTION: Long if price is at a premium OB/FVG with bullish structure, Short if at a discount OB/FVG with bearish structure.
7. ENTRIES/EXITS: Entry at OB 50% level or FVG fill. TP at opposing liquidity. SL beyond the OB invalidation point.

Respond ONLY with a single valid JSON object. No markdown. No explanation outside JSON.`;

function buildUserPrompt(tradeStyle: string): string {
  return `Analyze this chart for a ${tradeStyle} setup using ICT/SMC methodology.

STEP 1: Read the price axis — what is the current price shown on the right of the chart?
STEP 2: Read the symbol and timeframe from the chart labels.
STEP 3: Perform full ICT/SMC analysis.
STEP 4: Identify the best trade setup.

Return your analysis in this exact JSON format:
${SCHEMA}

Remember: currentPrice MUST be the exact number you read from the chart's price axis.`;
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

function normalize(r: TradeAnalysis, style: string): TradeAnalysis {
  const tps = Array.isArray(r.takeProfits) ? r.takeProfits : [];
  return {
    ...r,
    symbol: r.symbol || "Unknown",
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

export async function analyzeChart(
  imageDataUrl: string,
  tradeStyle: string,
): Promise<TradeAnalysis> {
  const apiKey = getStoredKey();
  if (!apiKey) throw new Error("No OpenAI API key configured. Click ⚙ to set your key.");

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
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: "high",
              },
            },
            { type: "text", text: buildUserPrompt(tradeStyle) },
          ],
        },
      ],
      max_tokens: 1200,
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
  return normalize(parsed, tradeStyle);
}
