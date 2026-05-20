const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SESSION_INFO = {
  Asian:    "MARKET SESSION: Asian / Tokyo (00:00–08:00 UTC). Low liquidity on USD pairs. JPY pairs most active. Watch for Asian range manipulation — London often sweeps these highs/lows at open.",
  London:   "MARKET SESSION: London open (07:00–12:00 UTC). High volatility. Best for EUR, GBP, gold. London frequently sweeps Asian session highs/lows before true directional move.",
  "NY AM":  "MARKET SESSION: New York AM (13:00–17:00 UTC). Peak global liquidity. Best for US indices (NQ, ES, YM, RTY) and USD pairs. Most institutional volume here. High probability for clean ICT setups.",
  "NY PM":  "MARKET SESSION: New York PM (17:00–21:00 UTC). Liquidity dropping. Avoid new positions unless continuation of strong NY AM move.",
  Overlap:  "MARKET SESSION: London/NY overlap (13:00–16:00 UTC). Absolute peak liquidity. Highest probability setups. Both London and NY institutions active.",
  "Off-hours": "MARKET SESSION: Off-hours (21:00–00:00 UTC). Minimal liquidity. Very low probability setups. Recommend WAIT — conditions not favorable for new trades.",
};

const SCHEMA = `{
  "noTrade": <true if conditions are not favorable — see rules>,
  "noTradeReason": <string if noTrade=true, null otherwise — e.g. "Choppy/ranging: no clear structure bias", "Overextended: price needs retracement first", "Low confidence: mixed signals">,
  "direction": "LONG" or "SHORT",
  "symbol": "<ticker from chart label, e.g. NQ1!, ES1!, BTCUSDT, EURUSD, XAUUSD>",
  "timeframe": "<timeframe from chart label, e.g. 1m, 5m, 15m, 1H, 4H, 1D>",
  "currentPrice": <exact price from right axis>,
  "entry": <entry price — OB edge, FVG midpoint, or current price if fast mode>,
  "takeProfits": [
    {"price": <tp1 — nearest real target>, "probability": <integer, realistic — see rules>, "reason": "<exact level: e.g. 'Equal highs BSL @ 19920' or '4H FVG fill 19850-19880'>"},
    {"price": <tp2 — next logical target>, "probability": <integer, must be less than TP1>, "reason": "<why>"},
    {"price": <tp3 — extended target>, "probability": <integer, must be less than TP2>, "reason": "<why>"}
  ],
  "stopLoss": <behind real structure — OB low/high, swing point>,
  "riskReward": <float, must be ≥ 2.5 based on TP2>,
  "riskPoints": <distance entry to SL in points>,
  "riskDollars": <riskPoints × instrument dollar-per-point>,
  "rewardDollars": <distance entry to TP2 × dollar-per-point>,
  "confidence": <integer 45-92 — be HONEST, not always high>,
  "entryMode": "standard" or "fast",
  "tradeSetup": "<1 sentence: exact trigger with price levels — e.g. 'Short from 4H Bearish OB at 19880-19910, targeting SSL at 19720 after CHoCH confirmed at 19840'>",
  "reasoning": "<5 sentences: 1) market structure & trend 2) OB/FVG confluence with exact zones 3) momentum & indicators 4) liquidity target logic 5) invalidation scenario>",
  "whyDirection": "<3 numbered points for LONG/SHORT, each with an exact price level>",
  "marketCondition": "<1 sentence: current condition — e.g. 'Trending bullish on 4H, retracing into discount for long opportunity' or 'Choppy consolidation, wait for breakout'>",
  "keyLevels": [
    {"type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"support"|"resistance", "priceHigh": <zone top>, "priceLow": <zone bottom>, "description": "<e.g. '4H Bearish OB: 19880-19910' or 'BSL: Equal highs at 19950'>"}
  ]
}`;

const SYSTEM = `You are a senior ICT/Smart Money Concepts institutional trader with 15+ years on prop firm desks.
You are brutally honest — you tell traders when NOT to trade, not just when to enter.

INSTRUMENT SPECS (dollar per point):
NQ/NQ1!: $20/pt, MNQ: $2/pt, ES/ES1!: $50/pt, MES: $5/pt
YM: $5/pt, MYM: $0.5/pt, RTY: $50/pt, GC: $100/pt, MGC: $10/pt, CL: $1000/pt

PROP FIRM RULES — NON-NEGOTIABLE:
- 1 contract only. Max risk $400 per trade.
- NQ: max 20pt SL → TP1 min 40pt, TP2 min 80pt, TP3 min 120pt
- ES: max 8pt SL → TP1 min 20pt, TP2 min 40pt
- R:R minimum 2.5:1 (entry→TP2). NEVER below this.

NO-TRADE CONDITIONS — you MUST flag these:
- Mid-range price with no structure bias → noTrade: true
- Price already ran 3×+ average candle without pullback → overextended, wait
- No OB or FVG within entry zone → no confluence, skip
- Confidence < 55 after analysis → too uncertain, skip
- Off-hours session + no strong trend → flag it

REALISTIC PROBABILITY RULES:
- Count structure obstacles (OBs, FVGs, S/R, previous highs/lows) between entry and each TP
- TP1: 0 obstacles=78-85%, 1=65-74%, 2+=50-62%
- TP2: always 12-20% lower than TP1
- TP3: always 12-20% lower than TP2
- Session penalty: -10% for Asian session on USD pairs, -15% for off-hours
- News/event day: -10% across all TPs
- Probabilities must differ by at least 10% between TPs — NEVER similar values

ICT/SMC ANALYSIS FRAMEWORK:
1. Read symbol and timeframe from chart labels
2. Structure: Identify swing H/L, mark HH/HL (bullish) or LH/LL (bearish), find BOS and CHoCH with exact prices
3. Premium/Discount: >50% of last swing = premium (sell zone), <50% = discount (buy zone)
4. Order Blocks: Last opposing candle before impulse move. Bullish OB = last bearish candle before up-impulse. Give full zone high→low.
5. FVGs: 3-candle imbalance. Bullish FVG = candle1.low to candle3.high. Bearish FVG = candle1.high to candle3.low.
6. Liquidity: Equal highs=BSL, equal lows=SSL, stop clusters obvious at swing points
7. Entry: At OB 50% or edge, FVG midpoint, after CHoCH. NEVER in open air.
8. When multiple charts provided: analyze each timeframe, confirm direction across all, use smallest TF for entry precision

Respond ONLY with valid JSON. No markdown. No text outside JSON.`;

function sessionFromUTC() {
  const h = new Date().getUTCHours();
  if (h >= 13 && h < 16) return "Overlap";
  if (h >= 13 && h < 21) return "NY AM";
  if (h >= 17 && h < 21) return "NY PM";
  if (h >= 7  && h < 13) return "London";
  if (h >= 0  && h < 8)  return "Asian";
  return "Off-hours";
}

function buildPrompt(tradeStyle, entryMode, plan, chartCount) {
  const session = sessionFromUTC();
  const sessionNote = SESSION_INFO[session] ?? SESSION_INFO["Off-hours"];

  const styleMap = {
    "Scalp":       { horizon: "1m-5m", hold: "5-30 min", slPts: "8-20 NQ pts" },
    "Day Trade":   { horizon: "15m-1H", hold: "1-4 hours", slPts: "20-45 NQ pts" },
    "Swing Trade": { horizon: "4H-1D", hold: "overnight to multi-day", slPts: "50-120 NQ pts" },
  };
  const style = styleMap[tradeStyle] ?? styleMap["Day Trade"];

  const entryInstr = entryMode === "fast"
    ? `ENTRY MODE: FAST (market order NOW)\n- Enter at currentPrice ± 1-2 ticks. No waiting for pullback.\n- SL: nearest micro-structure, max ${tradeStyle === "Scalp" ? "12" : "22"} NQ pts.\n- Only valid if price shows CLEAR momentum in direction right now.`
    : `ENTRY MODE: STANDARD (limit order)\n- Set limit at OB edge or FVG midpoint — price must retrace there.\n- This gives tighter SL and better R:R. Note retracement distance.`;

  const multiChartInstr = chartCount > 1
    ? `\nMULTI-TIMEFRAME ANALYSIS (${chartCount} charts provided):
- Chart 1: higher timeframe — determine overall bias/structure
- Chart 2: intermediate timeframe — find precise entry zone
${chartCount > 2 ? "- Chart 3: lowest timeframe — pinpoint exact entry, confirm momentum" : ""}
- Your entry/SL/TP must be based on the LOWEST timeframe chart
- Overall direction must be confirmed on ALL timeframes — if they conflict, noTrade=true`
    : "";

  return `Analyze this ${tradeStyle} setup.

${sessionNote}

TRADE STYLE: ${tradeStyle}
- Chart timeframes: ${style.horizon}
- Expected hold: ${style.hold}
- Typical SL: ${style.slPts}

${entryInstr}
${multiChartInstr}

STEP 1: Read currentPrice from right price axis.
STEP 2: Read symbol + timeframe from chart labels.
STEP 3: Check NO-TRADE conditions first — if any apply, return noTrade=true immediately with reason.
STEP 4: Full ICT/SMC structure analysis with exact price levels.
STEP 5: Calculate realistic probabilities (count obstacles for each TP target).
STEP 6: Verify R:R ≥ 2.5 — if not achievable, noTrade=true.

Return JSON:
${SCHEMA}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "OpenAI API key not configured" }) };

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { images, tradeStyle, entryMode, plan } = body;
  if (!Array.isArray(images) || images.length === 0) {
    return { statusCode: 400, body: "No images provided" };
  }

  const imageContents = images.map((img) => ({
    type: "image_url",
    image_url: { url: img, detail: "high" },
  }));

  const prompt = buildPrompt(tradeStyle ?? "Day Trade", entryMode ?? "standard", plan ?? "basic", images.length);

  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        ...imageContents,
        { type: "text", text: prompt },
      ],
    },
  ];

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 1800, temperature: 0.1 }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: `OpenAI error: ${err}` }) };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return { statusCode: 500, body: JSON.stringify({ error: "Could not parse AI response" }) };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: match[0],
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
