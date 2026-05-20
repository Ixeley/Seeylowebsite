const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SESSION_INFO = {
  Asian:       "SESSION: Asian/Tokyo (00:00–08:00 UTC). Low volume, consolidation typical. Institutions build Asian range — highs become BSL, lows become SSL. London will often sweep one side before the real move. Best pairs: JPY crosses. Avoid USD majors for new setups.",
  London:      "SESSION: London open (07:00–12:00 UTC). #1 manipulation session. London Judas Swing: initial fake move opposite to direction, then reversal. Watch for Asian range sweep in first 30 min, then real direction. Best: EUR, GBP, XAU.",
  "NY AM":     "SESSION: New York AM / NY Killzone (13:00–17:00 UTC = 09:00–13:00 EST). Highest institutional volume globally. Best session for US indices (NQ, ES, YM, RTY) and USD pairs. NY Open Killzone 13:30–15:00 UTC = prime ICT setup time.",
  "NY PM":     "SESSION: New York PM (17:00–21:00 UTC). Volume declining. Only continuation setups valid. Avoid reversals — late PM moves are often traps.",
  Overlap:     "SESSION: London/NY Overlap (13:00–16:00 UTC). Peak global liquidity. Both institutions active simultaneously. Highest probability window for all instruments. This is when major price discovery happens.",
  "Off-hours": "SESSION: Off-hours (21:00–00:00 UTC). Minimal institutional participation. Wide spreads. Random price action. Flag noTrade=true unless extremely obvious trend continuation with no news risks.",
};

const ICT_KNOWLEDGE = `
=== ICT / SMART MONEY CONCEPTS — MASTER REFERENCE ===

MARKET STRUCTURE:
- Higher Highs + Higher Lows (HH/HL) = Bullish structure → look for longs
- Lower Highs + Lower Lows (LH/LL) = Bearish structure → look for shorts
- BOS (Break of Structure): price breaks a previous swing H (bullish BOS) or swing L (bearish BOS) → confirms continuation
- CHoCH (Change of Character): opposite-direction break → signals potential reversal
- MSB (Market Structure Break): stronger term for BOS, used when displacement candle is large
- Internal Structure: micro BOS/CHoCH within a swing, used for entry timing on lower TF

PREMIUM vs DISCOUNT:
- Draw equilibrium (50%) of last significant swing (swing low to swing high)
- LONG entries: discount zone = below 50%, ideally 62-79% (Optimal Trade Entry zone)
- SHORT entries: premium zone = above 50%, ideally 62-79% OTE
- OTE (Optimal Trade Entry): 62%-79% Fibonacci retracement of the last swing — highest probability entry zone
- Never buy in premium, never sell in discount

ORDER BLOCKS (OB):
- Bullish OB: The LAST bearish candle (red candle) before a bullish impulse move. Full zone = high to low of that candle.
- Bearish OB: The LAST bullish candle (green candle) before a bearish impulse move. Full zone = high to low of that candle.
- Entry at 50% of OB (midpoint) or OB edge (closer to current price)
- OB is "mitigated" once price trades through 50% of it — lower probability after mitigation
- Breaker Block: a mitigated OB that failed, now acts as opposite structure (bullish OB that failed = bearish breaker)
- Rejection Block: series of wicks at a zone (not body), still acts as OB

FAIR VALUE GAPS (FVG) / IMBALANCES:
- 3-candle pattern: gap between candle 1's low and candle 3's high (bullish FVG) OR candle 1's high and candle 3's low (bearish FVG)
- Price is "imbalanced" — institutions will return to fill it (60-80% probability for fresh FVGs)
- Inverse FVG: when price fills an FVG and it flips — former bullish FVG becomes bearish resistance
- IFVG (Inversion FVG): high-conviction level after a flip
- FVGs in direction of trend are more powerful than counter-trend FVGs

LIQUIDITY:
- BSL (Buyside Liquidity): equal highs, previous day/week/month highs, round numbers above price → target for longs, institutional will hunt these
- SSL (Sellside Liquidity): equal lows, previous swing lows, round numbers below price → target for shorts
- Stop Hunt / Liquidity Grab: sharp wick through BSL/SSL to collect stops, then reverse — this IS the setup
- PWH (Previous Week High), PWL (Previous Week Low): major liquidity pools
- PDH/PDL (Previous Day High/Low): daily liquidity targets
- Liquidity Void: large gap in price movement (thin air), price moves through quickly

POWER OF THREE (PO3) / ACCUMULATION-MANIPULATION-DISTRIBUTION:
- Accumulation: consolidation/range (Asian session typically)
- Manipulation: fake move to grab liquidity (London open sweep typically)
- Distribution: real institutional direction (NY session typically)
- Understanding PO3: if London sweeps Asian low → look for long. If sweeps Asian high → look for short.

KILLZONES (highest probability time windows):
- Asian Killzone: 20:00–00:00 EST (range building)
- London Killzone: 02:00–05:00 EST (manipulation + initial direction)
- NY Open Killzone: 07:00–09:00 EST (highest probability entries for indices)
- NY AM Killzone: 09:30–11:00 EST (primary US session setup)
- NY Lunch: 12:00–13:00 EST (avoid — low probability, choppy)
- NY PM Killzone: 13:30–16:00 EST (continuation or reversal of morning)
- ICT Silver Bullet: 03:00–04:00 EST, 10:00–11:00 EST, 14:00–15:00 EST → FVG forms in first 15 min of window, enter on return to FVG

SILVER BULLET SETUP:
1. Between 10:00-11:00 EST (or 14:00-15:00 EST)
2. First 15 min: price displaces, creates an FVG
3. Price returns to that FVG
4. Enter at FVG with SL below FVG (for long) or above FVG (for short)
5. Target: liquidity pool (equal highs/lows, PDH/PDL)

TURTLE SOUP / STOP HUNT SETUP:
1. Price makes a clear swing low/high (obvious to retail)
2. Price sweeps just below/above it (stop hunt, liquidity grab)
3. Closes back above/below with strong rejection wick
4. Enter at the close of the reversal candle
5. SL: just beyond the sweep low/high
6. Target: opposite liquidity

NO-TRADE CONDITIONS — ALWAYS CHECK:
- Price in middle of range with no clear OB/FVG confluence → skip
- Price already ran 3×+ average candle without retracement → overextended
- No clear BOS or CHoCH to define direction → wait
- OB/FVG already fully mitigated (price traded through) → no longer valid
- High-impact news within 60 min → waitForNews=true, noTrade=true
- Confidence < 55 after full analysis → too many conflicting signals
- Off-hours + no strong trend → skip

MULTI-TIMEFRAME CONFLUENCE (MTF):
- Top-down analysis: Always start from highest TF for bias, drill down for entry
- 1D/4H: Overall trend and major structure (swing H/L, major OBs)
- 1H/15m: Intermediate structure, key OBs, FVGs for setup zone
- 5m/1m: Entry precision, micro CHoCH, small OBs/FVGs for exact entry
- Direction must align on ALL provided timeframes
- Strongest setups: 4H OB + 15m FVG + 1m entry signal

REALISTIC PROBABILITY FRAMEWORK:
- Fresh OB (never touched): 75-85% probability of reaction
- Partially mitigated OB (touched 1-2 times): 55-70%
- Fully mitigated OB: < 45%, skip
- Fresh FVG in trending market: 70-80%
- FVG in ranging market: 50-60%
- Confluence (OB + FVG + liquidity): +10-15%
- TP probability also depends on obstacles: each OB/FVG/prior swing between entry and TP reduces by 10-15%
- Always assign TP1 > TP2 > TP3 probabilities with meaningful gaps (min 12%)

INSTRUMENT-SPECIFIC NOTES:
- NQ (Nasdaq): Very sensitive to tech sentiment, Fed rate decisions. Volatile. Best: NY session.
- ES (S&P500): Smoother than NQ, more institutional. Good for swing.
- GC (Gold/XAUUSD): Safe haven, USD inverse. Responds strongly to CPI, NFP, FOMC.
- EURUSD: ECB and Fed divergence drives long-term trend. London most active.
- BTCUSDT: 24/7 market, follows risk-on/off. NY session often sets day direction.
`;

const SCHEMA = `{
  "noTrade": <true if ANY no-trade condition applies>,
  "noTradeReason": "<specific reason or null>",
  "waitForNews": <true if major news within 60 min>,
  "upcomingNews": "<e.g. 'CPI in 25 min (14:30 EST) — HIGH impact, wait' or null>",
  "annotateChartIndex": <0-based index of which uploaded chart to draw annotations on — use the lowest timeframe chart, or 0 if only one>,
  "direction": "LONG" or "SHORT",
  "symbol": "<EXACT ticker character-by-character from chart — e.g. NQ1!, BTCUSDT, EURUSD, XAUUSD>",
  "symbolDescription": "<instrument name — e.g. 'Nasdaq-100 E-mini Futures', 'Gold Futures', 'EUR/USD'>",
  "timeframe": "<exact TF label from the entry chart — e.g. 1m, 5m, 15m, 1H>",
  "currentPrice": <exact number from right price axis>,
  "entry": <entry price at OB/FVG/micro-structure>,
  "takeProfits": [
    {"price": <tp1 nearest>, "probability": <integer, count obstacles>, "reason": "<exact level e.g. 'BSL equal highs @ 19,920'>"},
    {"price": <tp2>, "probability": <must be 12-20% less than TP1>, "reason": "<specific>"},
    {"price": <tp3 extended>, "probability": <must be 12-20% less than TP2>, "reason": "<specific>"}
  ],
  "stopLoss": <behind real structure>,
  "riskReward": <float ≥ 2.5, entry→TP2>,
  "riskPoints": <|entry-SL| in points>,
  "riskDollars": <riskPoints × dollarPerPoint>,
  "rewardDollars": <|entry-TP2| × dollarPerPoint>,
  "confidence": <integer 40-92, honest>,
  "entryMode": "standard" or "fast",
  "setupType": "<named ICT setup — e.g. 'Silver Bullet', 'OTE Long', 'Turtle Soup', 'OB Mitigation', 'FVG Fill', 'Liquidity Grab + Reversal'>",
  "tradeSetup": "<1 sentence with exact prices — e.g. 'Long from 4H Bullish OB 19,820–19,850 after 15m CHoCH at 19,870, targeting BSL @ 19,980'>",
  "reasoning": "<5 sentences: 1) structure/bias with BOS prices 2) OB/FVG confluence with exact zones 3) momentum/displacement 4) liquidity target logic 5) invalidation>",
  "whyDirection": "<3 numbered points with exact prices>",
  "marketCondition": "<1 sentence: trending/ranging/overextended/consolidating>",
  "newsContext": "<1-2 sentences: macro/news context for this symbol today>",
  "keyLevels": [
    {
      "type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"support"|"resistance",
      "priceHigh": <zone top>,
      "priceLow": <zone bottom>,
      "timeframe": "<TF this level is from — e.g. '4H', '15m', '1m', '1H'>",
      "description": "<precise e.g. '4H Bullish OB: 19,820–19,850' or '15m FVG: 19,870–19,895' or '1m CHoCH @ 19,870'>"
    }
  ]
}`;

const SYSTEM = `You are a senior ICT (Inner Circle Trader) and Smart Money Concepts (SMC) specialist with 15+ years on institutional prop firm trading desks. You have mastered Michael J. Huddleston's ICT methodology and apply it exclusively.

${ICT_KNOWLEDGE}

RESPONSE RULES:
- Respond ONLY with valid JSON — no markdown, no text outside JSON
- Be brutally honest about confidence — most setups are 55-72%, not 85%+
- If no clear ICT setup exists, noTrade=true — protecting capital is priority
- All price levels must be precise to the tick/pip
- keyLevels must include timeframe field so they can be labeled on the chart`;

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
  const utcStr = now.toUTCString();
  const estH = (now.getUTCHours() - 5 + 24) % 24;
  const estStr = `${estH}:${String(now.getUTCMinutes()).padStart(2,"0")} EST`;

  const styles = {
    "Scalp":       { tf: "1m–5m", hold: "5–30 min", slPts: "8–20 NQ pts" },
    "Day Trade":   { tf: "15m–1H", hold: "1–4 hrs", slPts: "20–45 NQ pts" },
    "Swing Trade": { tf: "4H–1D", hold: "overnight+", slPts: "50–120 NQ pts" },
  };
  const s = styles[tradeStyle] ?? styles["Day Trade"];

  const entryInstr = entryMode === "fast"
    ? `ENTRY MODE: FAST (near-market limit)
- Find nearest 1m OB, micro FVG, or micro CHoCH within 3-8 ticks of currentPrice
- Entry = edge of that micro-structure closest to currentPrice
- Fallback: currentPrice ± 3 ticks toward trade direction
- SL: behind nearest micro-structure, max ${tradeStyle === "Scalp" ? 12 : 22} pts from entry`
    : `ENTRY MODE: STANDARD (limit at key level)
- Entry at OB midpoint/edge or FVG midpoint — price must retrace there
- State distance from currentPrice to entry (how far must price retrace)`;

  const multiChart = chartCount > 1 ? `
MULTI-TIMEFRAME ANALYSIS (${chartCount} charts uploaded):
- Analyze each chart independently first
- Chart with highest TF = bias/structure. Chart with lowest TF = entry.
- annotateChartIndex = index of the LOWEST timeframe chart (use for drawing)
- If charts conflict on direction → noTrade=true, explain conflict in noTradeReason
- All keyLevels must have timeframe field indicating which chart they come from` : "";

  return `Time: ${utcStr} (${estStr})
${sessionNote}

STYLE: ${tradeStyle} | TF: ${s.tf} | Hold: ${s.hold} | SL: ${s.slPts}
${entryInstr}
${multiChart}

STEPS:
1. Read symbol EXACTLY character-by-character from chart label
2. Read currentPrice precisely from right axis
3. Check NO-TRADE conditions — if any → noTrade=true immediately
4. Check economic calendar for HIGH-impact events next 2 hrs → flag upcomingNews
5. Top-down ICT analysis: structure → OBs → FVGs → liquidity → entry
6. Identify named setup type (Silver Bullet, OTE, Turtle Soup, etc.)
7. For each keyLevel: include timeframe field (which chart/TF it is from)
8. Assign annotateChartIndex = lowest TF chart index (0-based)
9. Realistic probabilities using obstacle counting
10. Verify R:R ≥ 2.5

JSON schema:
${SCHEMA}`;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "OPENAI_API_KEY not set on server" }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const { images, tradeStyle, entryMode } = body;
  if (!Array.isArray(images) || images.length === 0)
    return { statusCode: 400, body: "No images" };

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
      body: JSON.stringify({ model: "gpt-4o", messages, max_tokens: 2200, temperature: 0.1 }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { statusCode: res.status, body: JSON.stringify({ error: `OpenAI: ${err}` }) };
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) return { statusCode: 500, body: JSON.stringify({ error: "Cannot parse response" }) };

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: m[0] };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
