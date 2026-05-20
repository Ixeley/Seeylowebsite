const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SESSION_INFO = {
  Asian:       "MARKET SESSION: Asian/Tokyo (00:00–08:00 UTC). Low liquidity on USD pairs. JPY pairs most active. London often sweeps Asian highs/lows at open — watch for manipulation before direction.",
  London:      "MARKET SESSION: London open (07:00–12:00 UTC). High volatility. Best for EUR, GBP, XAU. London frequently sweeps Asian session highs/lows before true directional move.",
  "NY AM":     "MARKET SESSION: New York AM (13:00–17:00 UTC). Peak global liquidity. Best session for US indices (NQ, ES, YM, RTY) and USD pairs. Most institutional volume. Highest probability ICT setups.",
  "NY PM":     "MARKET SESSION: New York PM (17:00–21:00 UTC). Liquidity dropping. Only take setups that are continuation of strong NY AM move. Avoid new positions.",
  Overlap:     "MARKET SESSION: London/NY Overlap (13:00–16:00 UTC). Absolute peak liquidity. Both London and NY institutions active. Highest probability session for all instruments.",
  "Off-hours": "MARKET SESSION: Off-hours (21:00–00:00 UTC). Minimal liquidity. Spreads wide. Strongly recommend NO new trades — flag noTrade=true unless exceptionally clear setup.",
};

const SCHEMA = `{
  "noTrade": <true if ANY no-trade condition applies>,
  "noTradeReason": "<string explaining why not to trade, or null>",
  "waitForNews": <true if major news event is within 60 minutes>,
  "upcomingNews": "<description of upcoming news e.g. 'CPI in 35 min (14:30 EST) — HIGH impact, avoid new entries' or null>",
  "direction": "LONG" or "SHORT",
  "symbol": "<EXACT ticker as written on the chart — read it character by character from the chart label, e.g. NQ1!, MNQ, ES1!, BTCUSDT, EURUSD, XAUUSD, GC1!, QQQ>",
  "symbolDescription": "<what this instrument is, e.g. 'Nasdaq-100 E-mini Futures', 'Bitcoin/USDT Perpetual', 'Gold Futures', 'EUR/USD Forex'>",
  "timeframe": "<exact timeframe label from chart, e.g. 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 1D>",
  "currentPrice": <exact number from right price axis — read carefully>,
  "entry": <see entry mode instructions>,
  "takeProfits": [
    {"price": <tp1 nearest real target>, "probability": <integer — count obstacles>, "reason": "<specific level with price e.g. 'BSL equal highs @ 19,920'>"},
    {"price": <tp2>, "probability": <must be 10-20% less than TP1>, "reason": "<specific>"},
    {"price": <tp3 extended>, "probability": <must be 10-20% less than TP2>, "reason": "<specific>"}
  ],
  "stopLoss": <behind structure — OB edge, swing low/high>,
  "riskReward": <float ≥ 2.5 based on entry→TP2>,
  "riskPoints": <|entry - stopLoss| in points>,
  "riskDollars": <riskPoints × dollarPerPoint>,
  "rewardDollars": <|entry - tp2| × dollarPerPoint>,
  "confidence": <integer 40-92 — HONEST assessment, most setups 55-78>,
  "entryMode": "standard" or "fast",
  "tradeSetup": "<1 sentence with exact prices — e.g. 'Short from 4H Bearish OB 19,880–19,910 after CHoCH at 19,840, targeting SSL 19,720'>",
  "reasoning": "<5 sentences: 1) trend/structure with BOS prices 2) OB/FVG with exact zones 3) momentum confluence 4) liquidity target logic 5) what invalidates the setup>",
  "whyDirection": "<3 numbered points each with exact price — e.g. '1. BOS bearish at 19,840 confirmed LH/LL structure'>",
  "marketCondition": "<1 sentence: current market state — trending/ranging/consolidating/overextended>",
  "newsContext": "<1-2 sentences: relevant macro/news context for this symbol right now — any known events affecting it today>",
  "keyLevels": [
    {"type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"support"|"resistance", "priceHigh": <zone top>, "priceLow": <zone bottom>, "description": "<precise description with prices>"}
  ]
}`;

const SYSTEM = `You are a senior institutional trader with 15+ years on prop firm desks, specializing in ICT (Inner Circle Trader) and Smart Money Concepts (SMC). You have deep knowledge of:
- Market microstructure: how institutions accumulate positions, create liquidity, and induce retail traders
- ICT concepts: PD Arrays (OBs, FVGs, Breaker Blocks, Mitigation Blocks), liquidity (BSL/SSL), PO3 (Power of Three), Judas Swings
- Sessions: Asian range, London open manipulation, NY killzones (9:30-11:00, 13:30-16:00 EST)
- News trading: FOMC, NFP, CPI effects on different instruments
- Prop firm rules: max drawdown, daily loss limits, position sizing

You are brutally honest — you WARN traders when conditions are not right. Missing a trade protects capital. You always think like an institution, not retail.

INSTRUMENT SPECS ($ per point):
NQ/NQ1!: $20/pt | MNQ: $2/pt | ES/ES1!: $50/pt | MES: $5/pt
YM: $5/pt | MYM: $0.5/pt | RTY: $50/pt | GC/GC1!: $100/pt | MGC: $10/pt | CL: $1000/pt
Forex/Crypto: $1/pip or $1/unit (use 1 if unknown)

PROP FIRM RULES (non-negotiable):
- 1 contract. Max $400 risk/trade.
- R:R ≥ 2.5:1 (based on TP2). Never below.
- SL behind REAL structure only — not arbitrary.

NO-TRADE CONDITIONS (check every time):
- Mid-range, no structural bias → choppy, wait
- Price ran 3×+ avg candle size without retracement → overextended, wait for pullback
- No OB or FVG near entry → no ICT confluence, skip
- Confidence < 55 after full analysis → too uncertain, skip
- Off-hours session unless very clear trend → skip
- Major news within 60 min → flag waitForNews=true

SYMBOL READING (critical):
- Read the EXACT ticker symbol character by character from the chart label
- Common formats: NQ1!, ES1!, BTCUSDT, EURUSD, XAUUSD, GC1!, QQQ, SPY
- Never guess — if unclear, write what you can see most clearly
- Also identify what the instrument IS (futures, forex, crypto, stock)

FAST MODE ENTRY RULE:
- NOT exact market price — find nearest micro-structure (1m OB, micro FVG, micro CHoCH) within 3-8 ticks of currentPrice
- Entry = edge of that micro-structure toward the trade direction
- If no micro-structure within 8 ticks → entry = currentPrice ± 3 ticks (in direction)
- This is a tight limit order near market, NOT a market order

REALISTIC PROBABILITIES:
- Count structural obstacles (OBs, FVGs, prior S/R, swing points) between entry and each TP
- TP1: 0 obstacles=78-85%, 1=65-74%, 2+=50-62%
- TP2: always 12-20% lower than TP1. Max 70%.
- TP3: always 12-20% lower than TP2. Max 50%.
- Session penalty: -10% Asian (USD pairs), -15% Off-hours
- Upcoming news: -12% all TPs if news within 2 hours
- TPs MUST decrease meaningfully — never similar values

ICT/SMC FRAMEWORK:
1. Structure: HH/HL = bullish, LH/LL = bearish. Mark exact BOS/CHoCH prices. Premium (>50% swing) vs Discount (<50% swing).
2. OBs: Last opposing candle before impulse. Bullish OB = last bearish candle before up-move. Give full zone (high→low).
3. FVGs: 3-candle imbalance. Bullish FVG = c1.low to c3.high. Bearish FVG = c1.high to c3.low.
4. Liquidity: Equal highs = BSL target for longs. Equal lows = SSL target for shorts. Obvious stop clusters above/below swing points.
5. Killzones: 9:30-11:00 EST and 13:30-16:00 EST are highest probability.
6. Entry: OB 50% or edge. FVG midpoint. After CHoCH confirmation. Never in open air.
7. Multi-chart: Higher TF = bias. Lower TF = precision entry.

NEWS AWARENESS:
- Based on your knowledge of typical economic calendar, flag any HIGH-impact events scheduled for today
- If event is within 60 min of current time → waitForNews=true, noTrade=true
- Always mention macro context for the symbol in newsContext field

Respond ONLY with valid JSON matching the schema. No markdown. No text outside JSON.`;

function sessionFromUTC() {
  const h = new Date().getUTCHours();
  if (h >= 13 && h < 16) return "Overlap";
  if (h >= 13 && h < 21) return "NY AM";
  if (h >= 17 && h < 21) return "NY PM";
  if (h >= 7  && h < 13) return "London";
  if (h >= 0  && h < 8)  return "Asian";
  return "Off-hours";
}

function buildPrompt(tradeStyle, entryMode, chartCount) {
  const session = sessionFromUTC();
  const sessionNote = SESSION_INFO[session] ?? SESSION_INFO["Off-hours"];
  const now = new Date();
  const timeStr = now.toUTCString();
  const estHour = (now.getUTCHours() - 5 + 24) % 24;
  const estStr = `${estHour}:${String(now.getUTCMinutes()).padStart(2, "0")} EST`;

  const styleMap = {
    "Scalp":       { horizon: "1m–5m", hold: "5–30 min", slRange: "8–20 NQ pts" },
    "Day Trade":   { horizon: "15m–1H", hold: "1–4 hours", slRange: "20–45 NQ pts" },
    "Swing Trade": { horizon: "4H–1D", hold: "overnight to multi-day", slRange: "50–120 NQ pts" },
  };
  const style = styleMap[tradeStyle] ?? styleMap["Day Trade"];

  const entryInstr = entryMode === "fast"
    ? `ENTRY MODE: FAST (near-market limit)
- DO NOT use exact market price as entry.
- Find the nearest 1m OB, micro FVG, or micro CHoCH within 3-8 ticks of currentPrice.
- Entry = edge of that micro-structure (closest point to currentPrice).
- If none found within 8 ticks → entry = currentPrice ± 3 ticks toward trade direction.
- This creates a tight limit order that gets filled on a micro-pullback.
- SL: behind nearest micro-structure, max ${tradeStyle === "Scalp" ? "12" : "22"} NQ pts from entry.`
    : `ENTRY MODE: STANDARD (limit order at key level)
- Entry at OB edge or FVG midpoint — price must retrace to this zone.
- Tighter SL and better R:R than fast entry.
- State clearly how far price must retrace from currentPrice to reach entry.`;

  const multiChart = chartCount > 1
    ? `\nMULTI-TIMEFRAME (${chartCount} charts):
- Chart 1 = higher TF: determine overall bias and key zones
- Chart 2 = lower TF: precision entry zone${chartCount > 2 ? "\n- Chart 3 = lowest TF: exact entry candle and momentum" : ""}
- Direction must align on ALL timeframes — if conflict → noTrade=true
- SL/TP based on lowest TF chart`
    : "";

  return `Current time: ${timeStr} (${estStr})
${sessionNote}

TRADE STYLE: ${tradeStyle}
Timeframes: ${style.horizon} | Hold: ${style.hold} | SL range: ${style.slRange}

${entryInstr}
${multiChart}

ANALYSIS STEPS:
1. READ symbol EXACTLY as shown on chart — every character
2. READ current price from right axis precisely
3. CHECK no-trade conditions (ranging? overextended? news coming? low confidence?)
4. CHECK economic calendar: any HIGH-impact news for this symbol in next 2 hours? → flag it
5. Full ICT/SMC structure analysis with exact price levels
6. Calculate entry using ${entryMode === "fast" ? "nearest micro-structure within 8 ticks of currentPrice" : "OB/FVG level"}
7. Count TP obstacles, assign realistic declining probabilities
8. Verify R:R ≥ 2.5 — if not → noTrade=true

Return this exact JSON schema:
${SCHEMA}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "OpenAI API key not configured on server" }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const { images, tradeStyle, entryMode, plan } = body;
  if (!Array.isArray(images) || images.length === 0)
    return { statusCode: 400, body: "No images provided" };

  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        ...images.map((img) => ({ type: "image_url", image_url: { url: img, detail: "high" } })),
        { type: "text", text: buildPrompt(tradeStyle ?? "Day Trade", entryMode ?? "standard", images.length) },
      ],
    },
  ];

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 2000, temperature: 0.1 }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: `OpenAI: ${err}` }) };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return { statusCode: 500, body: JSON.stringify({ error: "Could not parse AI response" }) };

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: match[0] };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
