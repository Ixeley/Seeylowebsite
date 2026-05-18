const DEEPSEEK_API_KEY = "sk-256eb46bb4b1489b906b1864bfc13783";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekAnalysis {
  direction: "LONG" | "SHORT";
  symbol: string;
  timeframe: string;
  entry: number;
  takeProfits: [number, number, number];
  stopLoss: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
  whyBuy?: string;
  whySell?: string;
}

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1200;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    img.src = dataUrl;
  });
}

const JSON_SCHEMA = `{
  "direction": "LONG" or "SHORT",
  "symbol": "<exact instrument symbol visible on chart, e.g. NQ1!, BTCUSDT, EURUSD, SPX>",
  "timeframe": "<timeframe visible on chart, e.g. 5m, 15m, 1H, 4H, 1D>",
  "entry": <exact price level for entry from the chart>,
  "takeProfits": [<tp1>, <tp2>, <tp3>],
  "stopLoss": <exact stop loss price level>,
  "riskReward": <calculated R:R ratio, e.g. 2.5>,
  "confidence": <integer 55-95>,
  "reasoning": "<2-3 sentences of technical analysis — what pattern, level, or confluence drove this setup>",
  "whyBuy": "<if LONG: 2 specific reasons why price should go UP from current levels>",
  "whySell": "<if SHORT: 2 specific reasons why price should go DOWN from current levels>"
}`;

function buildVisionPrompt(market: string, tradeStyle: string): string {
  return `You are a professional trading analyst. Carefully examine this ${market} chart screenshot for a ${tradeStyle} setup.

READ THE ACTUAL PRICES FROM THE CHART — use the exact numbers visible on the price axis. Do NOT invent prices.

Identify the instrument symbol and timeframe shown on the chart.

Analyze: candlestick patterns, support/resistance levels, trend structure, volume, moving averages, RSI, MACD, Fibonacci levels, order blocks, fair value gaps, liquidity zones, break of structure.

Decide direction (LONG or SHORT) based on the chart evidence, then set entry, take profits, and stop loss at real chart price levels.

Respond ONLY with valid JSON:
${JSON_SCHEMA}

If ${market} prices are not clearly visible, use realistic current prices for ${market}. No text outside JSON.`;
}

function buildTextPrompt(market: string, tradeStyle: string): string {
  return `You are a professional trading analyst providing a ${tradeStyle} trade idea for ${market}.

Use realistic current market prices for ${market}. Base the analysis on current market conditions and typical technical setups.

Respond ONLY with valid JSON:
${JSON_SCHEMA}

Use the market name "${market}" as the symbol value. No text outside JSON.`;
}

export async function analyzeChart(
  imageDataUrl: string,
  market: string,
  tradeStyle: string,
): Promise<DeepSeekAnalysis> {
  const compressed = await compressImage(imageDataUrl);
  const visionPrompt = buildVisionPrompt(market, tradeStyle);

  // Try vision API first
  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are an expert trading analyst. Read prices directly from charts. Respond only with valid JSON — no markdown, no explanation.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: compressed } },
              { type: "text", text: visionPrompt },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as DeepSeekAnalysis;
        return normalizeResult(parsed, market);
      }
    }
  } catch {
    // fall through to text-only
  }

  // Fallback: text-only
  const textRes = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are an expert trading analyst. Respond only with valid JSON — no markdown, no explanation.",
        },
        {
          role: "user",
          content: buildTextPrompt(market, tradeStyle),
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    }),
  });

  if (!textRes.ok) {
    const err = await textRes.text();
    throw new Error(`DeepSeek API error ${textRes.status}: ${err}`);
  }

  const textData = await textRes.json();
  const raw = textData.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Could not parse AI response");
  return normalizeResult(JSON.parse(match[0]) as DeepSeekAnalysis, market);
}

function normalizeResult(r: DeepSeekAnalysis, market: string): DeepSeekAnalysis {
  return {
    ...r,
    symbol: r.symbol || market,
    timeframe: r.timeframe || "—",
    takeProfits: Array.isArray(r.takeProfits) && r.takeProfits.length >= 3
      ? [r.takeProfits[0], r.takeProfits[1], r.takeProfits[2]]
      : [r.takeProfits?.[0] ?? 0, r.takeProfits?.[1] ?? 0, r.takeProfits?.[2] ?? 0],
  };
}
