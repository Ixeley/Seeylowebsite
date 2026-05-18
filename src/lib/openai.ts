const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const KEY_STORAGE = "seeylo_openai_key";

export function getStoredKey(): string { return localStorage.getItem(KEY_STORAGE) ?? ""; }
export function saveKey(key: string) { localStorage.setItem(KEY_STORAGE, key.trim()); }
export function clearKey() { localStorage.removeItem(KEY_STORAGE); }

export interface TakeProfit {
  price: number;
  probability: number; // 0-100, AI estimate of TP being hit
  reason: string;      // e.g. "Equal highs / BSL", "4H FVG fill"
}

export interface KeyLevel {
  type: "order_block" | "fvg" | "liquidity" | "bos" | "choch" | "fibonacci" | "support" | "resistance";
  priceHigh: number;
  priceLow: number;
  description: string;
}

export type EntryMode = "standard" | "fast";

export interface TradeAnalysis {
  direction: "LONG" | "SHORT";
  symbol: string;
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
  tradeSetup: string;
  reasoning: string;
  whyDirection: string;
  keyLevels: KeyLevel[];
}

const INSTRUMENT_SPECS: Record<string, { dpp: number }> = {
  NQ:  { dpp: 20 }, MNQ: { dpp: 2 }, ES:  { dpp: 50 }, MES: { dpp: 5 },
  YM:  { dpp: 5 },  MYM: { dpp: 0.5 }, RTY: { dpp: 50 }, GC: { dpp: 100 },
  MGC: { dpp: 10 }, CL:  { dpp: 1000 },
};

function getSpec(symbol: string) {
  const clean = symbol.replace(/1!|=F|USDT|USD|PERP/gi, "").toUpperCase().trim();
  return INSTRUMENT_SPECS[clean] ?? INSTRUMENT_SPECS[symbol.toUpperCase()] ?? null;
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
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = dataUrl;
  });
}

const SCHEMA = `{
  "direction": "LONG" or "SHORT",
  "symbol": "<exact ticker from chart, e.g. NQ1!, MNQ, ES1!, BTCUSDT, EURUSD>",
  "timeframe": "<exact timeframe from chart label, e.g. 1m, 3m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <current price from right axis — exact number>,
  "entry": <entry price — see entry mode instructions>,
  "takeProfits": [
    {"price": <tp1 — nearest logical target>, "probability": <integer 60-85, chance this TP is hit>, "reason": "<why this level — specific liquidity/structure>"},
    {"price": <tp2 — mid target>, "probability": <integer 35-65>, "reason": "<why>"},
    {"price": <tp3 — extended target>, "probability": <integer 15-40>, "reason": "<why>"}
  ],
  "stopLoss": <SL — behind OB edge or swing, within prop firm risk limits>,
  "riskReward": <float based on entry→tp2>,
  "riskPoints": <distance entry→SL in points>,
  "riskDollars": <riskPoints × dollarPerPoint>,
  "rewardDollars": <(tp2.price − entry) × dollarPerPoint, absolute value>,
  "confidence": <integer 60-92>,
  "entryMode": "standard" or "fast",
  "tradeSetup": "<1 sentence — exact trigger: pattern + level + reason>",
  "reasoning": "<5 sentences: 1-trend 2-OB/FVG confluence 3-momentum 4-liquidity target 5-invalidation>",
  "whyDirection": "<3 numbered reasons for LONG/SHORT with exact price levels>",
  "keyLevels": [
    {"type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"support"|"resistance",
     "priceHigh": <zone top>, "priceLow": <zone bottom>,
     "description": "<e.g. '4H Bearish OB', 'FVG 29080-29140', 'SSL below 28950'>"}
  ]
}`;

const SYSTEM = `You are a senior ICT/SMC institutional trader coaching a prop firm trader.

PROP FIRM RULES — NON-NEGOTIABLE:
- 1 contract only. Max risk $300-500 per trade.
- NQ (NQ1!/MNQ): $20/pt. For $400 risk → max 20pt SL. TP1 min 2× SL, TP2 min 4× SL, TP3 min 6× SL.
- ES (ES1!/MES): $50/pt. For $400 risk → max 8pt SL. TP1 min 16pt, TP2 min 32pt.
- GC Gold: $100/pt. MNQ: $2/pt. Adjust SL/TP accordingly.
- R:R minimum 2.5:1 based on TP2. NO exceptions.
- TPs must be at REAL levels: equal highs/lows, previous session H/L, OB edges, FVG fills.
- NEVER set TP1 at less than 2× the SL distance from entry.

ICT/SMC ANALYSIS:
1. Chart labels: ticker top-left, timeframe label, price on right axis.
2. Structure: HH/HL = bullish, LH/LL = bearish. Mark exact BOS and CHoCH prices.
3. Order Blocks: last opposing candle before impulse — give full candle range (high→low).
4. FVGs: 3-candle imbalance — give exact gap zone (high of candle 1 → low of candle 3 for bearish FVG, reverse for bullish).
5. Liquidity: equal highs = BSL, equal lows = SSL, stop clusters above/below swing points.
6. Entry: at OB 50% or OB edge. At FVG midpoint. After CHoCH confirmation.
7. TP probability: based on how many obstacles (S/R, OBs, FVGs) price must pass through. TP1 nearest clear target = highest probability.

Respond ONLY with valid JSON. No markdown. No text outside JSON.`;

function modeInstructions(mode: EntryMode, style: string): string {
  if (mode === "fast") {
    return `ENTRY MODE: FAST (Market Now)
- Trader is entering at market RIGHT NOW. Entry = currentPrice (or 1-2 ticks from it).
- SL must be behind the NEAREST micro structure — within ${style === "Scalp" ? "8-15" : "15-25"} NQ points.
- TP1 must be reachable within ${style === "Scalp" ? "15-30 minutes" : "2-4 hours"}.
- Focus on momentum continuation — is price already moving in the direction? If not, note the risk.`;
  }
  return `ENTRY MODE: STANDARD (Limit Order)
- Find the optimal pullback entry at OB edge or FVG fill.
- Entry is a LIMIT ORDER — price must return to this level.
- This allows tighter SL and better R:R than market entry.
- Note how far price must retrace to reach entry.`;
}

function styleContext(style: string): string {
  const map: Record<string, string> = {
    "Scalp":       "SCALP: 1m-5m chart. Max hold 30 min. SL 10-20 NQ pts. TP1 20-40pts, TP2 40-70pts, TP3 70-100pts.",
    "Day Trade":   "DAY TRADE: 15m-1H chart. Max hold 4 hours. SL 20-40 NQ pts. TP1 50-80pts, TP2 100-150pts, TP3 200pts.",
    "Swing Trade": "SWING: 4H-1D chart. Overnight hold ok. SL 50-100 NQ pts. TP1 100-200pts, TP2 250-400pts, TP3 500pts+.",
  };
  return map[style] ?? map["Day Trade"];
}

function buildPrompt(mode: EntryMode, style: string): string {
  return `Analyze this chart. ${styleContext(style)}

${modeInstructions(mode, style)}

STEP 1: Read currentPrice from right axis (exact number).
STEP 2: Read symbol + timeframe from chart labels.
STEP 3: Full ICT/SMC analysis — structure, OBs with exact zones, FVGs with exact zones, liquidity pools.
STEP 4: Calculate SL/TP sizes appropriate for the instrument ($20/pt for NQ, $50/pt for ES, etc).
STEP 5: Assign TP probabilities — TP1 highest (nearest, fewest obstacles), TP3 lowest (most obstacles/distance).

Return JSON:
${SCHEMA}`;
}

function extractJSON(raw: string): TradeAnalysis | null {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const m = clean.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as TradeAnalysis; } catch { return null; }
}

function normalizeTPs(tps: unknown[]): [TakeProfit, TakeProfit, TakeProfit] {
  const out: TakeProfit[] = [0, 1, 2].map((i) => {
    const tp = tps[i];
    if (typeof tp === "number") return { price: tp, probability: 70 - i * 20, reason: "—" };
    if (tp && typeof (tp as TakeProfit).price === "number") return tp as TakeProfit;
    return { price: 0, probability: 0, reason: "—" };
  });
  return out as [TakeProfit, TakeProfit, TakeProfit];
}

function normalize(r: TradeAnalysis): TradeAnalysis {
  const tps = normalizeTPs(Array.isArray(r.takeProfits) ? r.takeProfits : []);
  const spec = getSpec(r.symbol ?? "");
  const riskPts = r.riskPoints || Math.abs(r.entry - r.stopLoss);
  const rewardPts = tps[1].price ? Math.abs(tps[1].price - r.entry) : Math.abs(tps[0].price - r.entry);
  const dpp = spec?.dpp ?? 1;

  return {
    ...r,
    symbol: r.symbol || "Unknown",
    timeframe: r.timeframe || "—",
    currentPrice: r.currentPrice || r.entry,
    tradeSetup: r.tradeSetup || "",
    whyDirection: r.whyDirection || "",
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
  imageDataUrl: string,
  tradeStyle: string,
  entryMode: EntryMode = "standard",
): Promise<TradeAnalysis> {
  const apiKey = getStoredKey();
  if (!apiKey) throw new Error("No OpenAI API key set. Click ⚙ to configure.");

  const compressed = await compressImage(imageDataUrl);
  const base64 = compressed.replace(/^data:image\/\w+;base64,/, "");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" } },
            { type: "text", text: buildPrompt(entryMode, tradeStyle) },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJSON(raw);
  if (!parsed?.entry) throw new Error("Could not parse AI response");
  return normalize(parsed);
}

// News analysis — uses text GPT to summarize today's relevant events
export async function checkNewsForSymbol(symbol: string): Promise<string> {
  const apiKey = getStoredKey();
  if (!apiKey) throw new Error("No OpenAI API key set.");

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: `Today is ${today}. I am trading ${symbol}.

List the key economic news events and releases scheduled for TODAY that could significantly impact ${symbol}. Include:
- Exact event names (e.g. "CPI Data", "FOMC Minutes", "NFP")
- Expected impact level (HIGH / MEDIUM / LOW)
- Scheduled time (EST/ET)
- Brief note on how it typically affects ${symbol} (bullish/bearish/volatile)

If there are no major events today, say so clearly.
Also note any ongoing geopolitical or macro themes currently affecting ${symbol}.

Format as a clear bullet list. Be concise — max 200 words.`,
      }],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });

  if (!res.ok) throw new Error(`News API error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No news data returned.";
}
