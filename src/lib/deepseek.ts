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

async function compressImage(dataUrl: string, maxDim = 1400, quality = 0.92): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

const SCHEMA = `{
  "direction": "LONG" or "SHORT",
  "symbol": "<instrument symbol exactly as shown on chart, e.g. NQ1!, BTCUSDT, EURUSD>",
  "timeframe": "<chart timeframe exactly as shown, e.g. 1m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <the most recent price shown on the chart's price axis>,
  "entry": <precise entry price level — must be a real price from the chart>,
  "takeProfits": [<tp1>, <tp2>, <tp3>],
  "stopLoss": <precise stop loss price — must be a real price from the chart>,
  "riskReward": <calculated R:R number, e.g. 2.5>,
  "confidence": <integer 55-95>,
  "tradeSetup": "<1 sentence: what specific pattern/structure triggered this setup, e.g. 'Rejection at order block 19,320 with bearish engulfing on 5m'>",
  "reasoning": "<3-4 sentences of professional technical analysis: trend, structure, confluence, momentum>",
  "whyDirection": "<2-3 specific reasons for LONG or SHORT with exact price levels referenced>",
  "supportLevels": [<list of 2-4 key support prices visible on chart>],
  "resistanceLevels": [<list of 2-4 key resistance prices visible on chart>],
  "keyLevels": [
    {"type": "order_block" | "fvg" | "liquidity" | "bos" | "fibonacci" | "support" | "resistance", "price": <number>, "description": "<short label>"},
    ...
  ]
}`;

function visionPrompt(market: string, style: string) {
  return `You are a professional institutional trader analyzing this ${market} chart for a ${style} setup.

CRITICAL: READ ALL PRICES DIRECTLY FROM THE CHART PRICE AXIS. Do NOT use training data prices. The chart shows the actual current prices — use them exactly.

Perform a complete professional analysis:
1. Identify the instrument and timeframe from the chart labels
2. Note the current price from the axis
3. Find order blocks (OB), fair value gaps (FVG), break of structure (BOS), liquidity sweeps, key support/resistance
4. Determine trade direction based on market structure (trend, higher highs/lows or lower highs/lows)
5. Set entry at a logical level (order block edge, support/resistance confluence)
6. Set TP1 at nearest resistance/liquidity, TP2 and TP3 at next major levels
7. Set SL below/above the last swing low/high or order block invalidation
8. List all key levels visible on the chart

Respond ONLY with valid JSON (no markdown, no explanation):
${SCHEMA}`;
}

function textPrompt(market: string, style: string) {
  return `You are a professional institutional trader. Provide a complete ${style} trade plan for ${market} based on current market structure and price action.

Use realistic CURRENT prices for ${market} as of today. Analyze as if you can see recent price action.

Identify typical institutional setups: order blocks, fair value gaps, liquidity zones, break of structure, key support/resistance levels.

Respond ONLY with valid JSON (no markdown, no explanation):
${SCHEMA}`;
}

async function callDeepSeek(model: string, messages: object[], maxTokens = 800): Promise<string | null> {
  try {
    const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.15 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

function parseJSON(raw: string): DeepSeekAnalysis | null {
  const match = raw.match(/\{[\s\S]*\}/);
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
    supportLevels: Array.isArray(r.supportLevels) ? r.supportLevels : [],
    resistanceLevels: Array.isArray(r.resistanceLevels) ? r.resistanceLevels : [],
    keyLevels: Array.isArray(r.keyLevels) ? r.keyLevels : [],
    takeProfits: [tps[0] ?? 0, tps[1] ?? 0, tps[2] ?? 0],
  };
}

export async function analyzeChart(
  imageDataUrl: string,
  market: string,
  tradeStyle: string,
): Promise<DeepSeekAnalysis> {
  const compressed = await compressImage(imageDataUrl);
  const system = "You are an expert institutional trading analyst. Respond ONLY with valid JSON — no markdown fences, no explanation outside the JSON object.";

  // Attempt 1: deepseek-vl2 vision
  const vl2Raw = await callDeepSeek("deepseek-vl2", [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: compressed } },
        { type: "text", text: visionPrompt(market, tradeStyle) },
      ],
    },
  ]);
  if (vl2Raw) {
    const parsed = parseJSON(vl2Raw);
    if (parsed?.entry) return normalize(parsed, market);
  }

  // Attempt 2: deepseek-vl vision
  const vlRaw = await callDeepSeek("deepseek-vl", [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: compressed } },
        { type: "text", text: visionPrompt(market, tradeStyle) },
      ],
    },
  ]);
  if (vlRaw) {
    const parsed = parseJSON(vlRaw);
    if (parsed?.entry) return normalize(parsed, market);
  }

  // Attempt 3: deepseek-chat with vision
  const chatVisionRaw = await callDeepSeek("deepseek-chat", [
    { role: "system", content: system },
    {
      role: "user",
      content: [
        { type: "image_url", image_url: { url: compressed } },
        { type: "text", text: visionPrompt(market, tradeStyle) },
      ],
    },
  ]);
  if (chatVisionRaw) {
    const parsed = parseJSON(chatVisionRaw);
    if (parsed?.entry) return normalize(parsed, market);
  }

  // Fallback: text-only
  const textRaw = await callDeepSeek("deepseek-chat", [
    { role: "system", content: system },
    { role: "user", content: textPrompt(market, tradeStyle) },
  ], 900);
  if (textRaw) {
    const parsed = parseJSON(textRaw);
    if (parsed?.entry) return normalize(parsed, market);
  }

  throw new Error("All DeepSeek API calls failed or returned invalid JSON.");
}
