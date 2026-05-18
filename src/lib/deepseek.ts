const DEEPSEEK_API_KEY = "sk-256eb46bb4b1489b906b1864bfc13783";
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

export interface DeepSeekAnalysis {
  direction: "LONG" | "SHORT";
  entry: number;
  takeProfits: [number, number, number];
  stopLoss: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
}

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxDim = 1024;
      const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = dataUrl;
  });
}

const JSON_SCHEMA = `{
  "direction": "LONG" or "SHORT",
  "entry": <number>,
  "takeProfits": [<tp1>, <tp2>, <tp3>],
  "stopLoss": <number>,
  "riskReward": <number e.g. 2.5>,
  "confidence": <integer 55-95>,
  "reasoning": "<2-3 sentence technical analysis>"
}`;

function buildTextPrompt(market: string, tradeStyle: string): string {
  return `You are an elite technical trading analyst. Analyze the provided ${market} chart screenshot for a ${tradeStyle} trade setup.

Look for: candlestick patterns, support/resistance levels, trend structure, volume, moving averages, RSI, MACD, Fibonacci levels, order blocks, fair value gaps, liquidity zones.

Respond ONLY with valid JSON matching this exact schema:
${JSON_SCHEMA}

Use realistic prices for ${market}. No explanation outside the JSON.`;
}

export async function analyzeChart(
  imageDataUrl: string,
  market: string,
  tradeStyle: string,
): Promise<DeepSeekAnalysis> {
  const prompt = buildTextPrompt(market, tradeStyle);
  const compressed = await compressImage(imageDataUrl);

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
            content: "You are an expert trading analyst. Respond only with valid JSON.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: compressed } },
              { type: "text", text: prompt },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content ?? "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as DeepSeekAnalysis;
    }
  } catch {
    // fall through to text-only
  }

  // Fallback: text-only (describe chart context)
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
          content: "You are an expert trading analyst. Respond only with valid JSON.",
        },
        {
          role: "user",
          content: `Analyze ${market} for a ${tradeStyle} setup based on current market conditions. ${prompt}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.4,
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
  return JSON.parse(match[0]) as DeepSeekAnalysis;
}
