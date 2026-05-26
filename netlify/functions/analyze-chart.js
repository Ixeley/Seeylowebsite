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
  "strategy": "<strategy name: 'ICT/SMC' | 'Wyckoff' | 'Elliott Wave' | 'Classic TA'>",
  "holdTime": "<specific hold duration for THIS trade — e.g. '2–4 hours', 'Until NY close at 21:00 UTC', '15–45 minutes', 'Overnight, exit pre-London open', 'Hold 1–3 days to next swing'>",
  "setupType": "<named setup — e.g. 'Silver Bullet', 'OTE Long', 'Spring Phase C', 'Wave 3 Extension', 'Bull Flag Breakout', 'RSI Divergence Reversal'>",
  "tradeSetup": "<1 sentence with exact prices>",
  "reasoning": "<5 sentences: 1) structure/bias 2) entry confluence 3) momentum 4) target logic 5) invalidation>",
  "whyDirection": "<3 numbered points with exact prices>",
  "marketCondition": "<1 sentence: trending/ranging/overextended/consolidating>",
  "newsContext": "<1-2 sentences: macro/news context for this symbol today>",
  "keyLevels": [
    {
      "type": "order_block"|"fvg"|"liquidity"|"bos"|"choch"|"support"|"resistance"|"fibonacci",
      "priceHigh": <zone top>,
      "priceLow": <zone bottom>,
      "timeframe": "<TF this level is from — e.g. '4H', '15m', '1m', '1H'>",
      "description": "<precise level description with exact prices>"
    }
  ]
}`;

const WYCKOFF_KNOWLEDGE = `
=== WYCKOFF METHOD — MASTER REFERENCE ===

PHASES (Accumulation & Distribution):
- Phase A: Stopping the prior trend. PSY (Preliminary Supply/Support), SC (Selling Climax) / BC (Buying Climax), AR (Automatic Rally/Reaction), ST (Secondary Test).
- Phase B: Building the cause. Multiple tests of support/resistance. High-volume upthrusts or springs possible. Range defined.
- Phase C: The test. Spring (false breakdown below support — shakeout) or Upthrust (false breakout above resistance — trap). This is the ENTRY phase — highest reward.
- Phase D: Trend within range. SOS (Sign of Strength) for accumulation / SOW (Sign of Weakness) for distribution. LPS (Last Point of Support) = best re-entry.
- Phase E: Mark-up/Mark-down. Price leaves range. Trend move in full effect.

SPRINGS & UPTHRUSTS (Phase C setups):
- Spring: price breaks below support, immediately reverses, closes above — stops triggered, smart money absorbs all selling.
- Spring quality: No Supply bar after spring (narrow spread, low volume) = highest quality. Strong SOS confirms.
- Upthrust: price breaks above resistance, immediately reverses — stops above cleared, distribution begins.
- Test of Spring: subsequent re-test of spring low on low volume = confirm + re-entry.

SIGNS:
- SOS: wide spread bar up, closes near high, high volume — demand is in control.
- SOW: wide spread bar down, closes near low, high volume — supply is in control.
- No Supply: narrow spread, closes up, low volume — no selling pressure, continuation expected.
- No Demand: narrow spread, closes down, low volume — no buying pressure, reversal/weakness expected.

CAUSE & EFFECT:
- P&F count (point and figure) across the base range = measure of the move.
- Wider/longer base = larger potential move.
- TP targets = width × scale projected from breakout level.

ENTRY RULES:
- Enter on Spring/Upthrust with confirming SOS/SOW
- Re-enter on LPS (Last Point of Support) after SOS in Phase D
- Stop: below Spring low (for longs) or above Upthrust high (for shorts)
- Target: top of range + cause projection for Phase E move`;

const ELLIOTT_KNOWLEDGE = `
=== ELLIOTT WAVE — MASTER REFERENCE ===

IMPULSE WAVES (5-wave move in trend direction):
- Wave 1: initial move, often weak, overlooked by most traders.
- Wave 2: retracement of Wave 1. CANNOT retrace more than 100% of Wave 1. Often 50–61.8% Fib retrace.
- Wave 3: strongest and longest wave. CANNOT be the shortest. Typically 1.618×–2.618× Wave 1. Best entry.
- Wave 4: consolidation. CANNOT overlap Wave 1's price territory (in non-leveraged markets). Often 38.2% retrace.
- Wave 5: final push. Often equals Wave 1 length. Momentum divergence common. Look for reversal after.

CORRECTIVE WAVES (3-wave move against trend):
- ABC correction: A (impulse against trend), B (retrace of A, often 50–61.8%), C (final leg, often equals A).
- Zigzag (5-3-5): sharp correction, B shallow (<61.8% of A).
- Flat (3-3-5): sideways correction, B retraces ~100% of A, C equals A.
- Triangle (3-3-3-3-3): contracting or expanding, always in Wave 4 or Wave B position.

FIBONACCI RELATIONSHIPS:
- Wave 2 target: 50%, 61.8% of Wave 1.
- Wave 3 target: 161.8%, 261.8% of Wave 1 (measured from Wave 2 low).
- Wave 4 target: 38.2% of Wave 3.
- Wave 5 target: equal to Wave 1, or 61.8% of Waves 1+3.
- Wave C target: 100%, 161.8% of Wave A.

ENTRY STRATEGY:
- Best entry: end of Wave 2 (buy) or end of Wave 4 (continuation). Use Fib zones.
- Wave 3 confirmation: break of Wave 1 high with momentum (MACD crossover, volume surge).
- Stop: for Wave 2 entry — below Wave 1 origin. For Wave 4 entry — below Wave 1 top.
- Target: Wave 3 = 161.8% extension of Wave 1 from Wave 2 low.
- Divergence at Wave 5 peak = high-probability reversal signal.`;

const CLASSIC_TA_KNOWLEDGE = `
=== CLASSIC TECHNICAL ANALYSIS — MASTER REFERENCE ===

SUPPORT & RESISTANCE:
- Key S/R: previous swing highs/lows, round numbers, weekly/monthly highs/lows.
- More touches = stronger level. First touch after breakout = highest probability.
- Polarity: broken support becomes resistance, broken resistance becomes support.

CHART PATTERNS:
- Head & Shoulders (H&S): bearish reversal. Neckline break = entry. Target = head-to-neckline distance projected down.
- Inverse H&S: bullish reversal. Same logic, projected up.
- Double Top/Bottom: reversal at key level. Entry on neckline break. Target = pattern height.
- Triangles: Ascending (bullish bias), Descending (bearish bias), Symmetrical (continuation in trend direction). Entry on breakout candle close.
- Bull/Bear Flag: continuation pattern. Tight consolidation on low volume after impulse. Entry on break of flag upper/lower bound.
- Cup & Handle: bullish. Entry on handle breakout. Target = cup depth from breakout.

MOVING AVERAGES:
- EMA 20/50/200: dynamic S/R. Price above all 3 EMAs = strong uptrend.
- Golden Cross (50 EMA > 200 EMA): bullish signal. Death Cross: bearish signal.
- EMA 20 = fastest momentum. EMA 200 = long-term trend direction.
- Price between EMA 20 and 50 = pullback zone in uptrend.

RSI (14):
- Overbought: >70. Oversold: <30.
- Bullish divergence: price makes lower low, RSI makes higher low = reversal signal.
- Bearish divergence: price makes higher high, RSI makes lower high = reversal signal.
- RSI 50 cross = momentum confirmation of trend change.

MACD (12,26,9):
- Bullish crossover (MACD line > signal line): buy signal.
- Bearish crossover: sell signal.
- Histogram divergence with price = leading reversal signal.
- Best used in trending markets, not ranges.

VOLUME:
- Volume confirms breakouts. Breakout on low volume = likely false breakout.
- Volume spike at reversal points = climactic selling/buying.
- Decreasing volume in trend = exhaustion approaching.

ENTRY RULES:
- Entry at S/R bounce with momentum confirmation (RSI oversold/overbought, pin bar, engulfing candle).
- Pattern breakout entry: wait for candle CLOSE beyond breakout level.
- Stop: below the S/R level tested, or below pattern invalidation point.
- Target: next major S/R level, or pattern projection.`;

function getSystem(strategy) {
  switch (strategy) {
    case "Wyckoff":
      return `You are a master Wyckoff Method analyst with 20+ years of institutional trading experience. You apply Richard D. Wyckoff's Law of Supply and Demand, Cause and Effect, and Effort vs. Result exclusively.\n\n${WYCKOFF_KNOWLEDGE}\n\nRESPONSE RULES:\n- Respond ONLY with valid JSON — no markdown, no text outside JSON\n- Identify the Wyckoff phase precisely (A/B/C/D/E) and the exact event (Spring, Upthrust, LPS, SOS, SOW)\n- Be honest about confidence: most valid setups are 55-75%\n- If phase is unclear or chart shows mixed signals → noTrade=true`;
    case "Elliott Wave":
      return `You are a certified Elliott Wave analyst with expertise in R.N. Elliott's Wave Principle and Robert Prechter's methodology. You count waves precisely and use Fibonacci relationships for targets.\n\n${ELLIOTT_KNOWLEDGE}\n\nRESPONSE RULES:\n- Respond ONLY with valid JSON — no markdown, no text outside JSON\n- State the current wave count clearly (e.g. 'In Wave 3 of 5 impulse up')\n- Use Fibonacci extensions for TP targets and retracements for entry\n- If wave count is ambiguous or invalidation criteria are close → reduce confidence or noTrade=true`;
    case "Classic TA":
      return `You are a veteran technical analyst with 20+ years applying classical technical analysis. You use chart patterns, support/resistance, moving averages, RSI, MACD, and volume exclusively.\n\n${CLASSIC_TA_KNOWLEDGE}\n\nRESPONSE RULES:\n- Respond ONLY with valid JSON — no markdown, no text outside JSON\n- Identify the exact pattern or setup name (e.g. 'Bull Flag', 'Resistance Bounce', 'RSI Divergence')\n- Require volume confirmation for breakout entries\n- Be honest about confidence: pattern breakouts without volume = 50% max`;
    default: // ICT/SMC
      return `You are a senior ICT (Inner Circle Trader) and Smart Money Concepts (SMC) specialist with 15+ years on institutional prop firm trading desks. You have mastered Michael J. Huddleston's ICT methodology and apply it exclusively.\n\n${ICT_KNOWLEDGE}\n\nRESPONSE RULES:\n- Respond ONLY with valid JSON — no markdown, no text outside JSON\n- Be brutally honest about confidence — most setups are 55-72%, not 85%+`;
  }
}

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

const STRATEGY_STEPS = {
  "ICT/SMC": `1. Read symbol EXACTLY character-by-character from chart label
2. Read currentPrice precisely from right axis
3. Check NO-TRADE conditions — if any → noTrade=true immediately
4. Check economic calendar for HIGH-impact events next 2 hrs → flag upcomingNews
5. Top-down ICT analysis: structure → OBs → FVGs → liquidity → entry
6. Identify named setup type (Silver Bullet, OTE, Turtle Soup, OB Mitigation, etc.)
7. For each keyLevel: include timeframe field
8. Assign annotateChartIndex = lowest TF chart index
9. Realistic probabilities using obstacle counting
10. Set holdTime based on: distance to TP2, current session time, and trade style`,
  "Wyckoff": `1. Read symbol EXACTLY from chart label, read currentPrice from right axis
2. Identify the Wyckoff Phase (A/B/C/D/E) and the primary event (SC, AR, ST, Spring, Upthrust, SOS, SOW, LPS)
3. Check NO-TRADE conditions — if phase is unclear or in middle of Phase B → noTrade=true
4. Check for high-impact news next 2 hrs → flag upcomingNews
5. Confirm volume signature: Spring/SOS needs confirming bar. Note No Supply / No Demand bars.
6. Set entry at Spring low test or LPS with confirming SOS
7. Set TP targets using cause projection (range width × multiplier from breakout)
8. Set holdTime based on: expected Phase D/E duration and trade style
9. keyLevels: mark SC, AR, ST, Spring/Upthrust, Creek/ICE levels`,
  "Elliott Wave": `1. Read symbol EXACTLY from chart label, read currentPrice from right axis
2. Count the Elliott Wave structure visible on chart — state current wave number and degree
3. Check NO-TRADE conditions — if count is ambiguous or alternate count is equally valid → noTrade=true
4. Verify key wave rules: Wave 2 < Wave 1 start, Wave 3 not shortest, Wave 4 no overlap with Wave 1
5. Calculate Fibonacci extension targets for TPs and retracement for entry zone
6. Entry: end of Wave 2 (for Wave 3 ride) or end of Wave 4 (continuation)
7. SL: below Wave 2 low (for Wave 3 entry) or below Wave 4 low (continuation)
8. Set holdTime based on wave degree and expected wave completion timeframe
9. keyLevels: mark wave pivots with Fibonacci levels`,
  "Classic TA": `1. Read symbol EXACTLY from chart label, read currentPrice from right axis
2. Identify the primary chart pattern or setup (H&S, Double Top/Bottom, Flag, Triangle, S/R bounce)
3. Check NO-TRADE conditions — if no clear pattern or S/R, or price is mid-range → noTrade=true
4. Check for high-impact news next 2 hrs → flag upcomingNews
5. Confirm RSI/MACD momentum alignment with direction. Check volume for breakout confirmation.
6. Entry: at S/R level bounce with confirming candle, or breakout close above/below pattern
7. TP targets: use pattern projection or next major S/R level
8. Set holdTime based on: pattern target distance, current momentum, and trade style
9. keyLevels: mark key S/R levels, pattern boundaries, moving average levels`,
};

function buildPrompt(tradeStyle, entryMode, chartCount, strategy) {
  const session = sessionFromUTC();
  const sessionNote = SESSION_INFO[session] ?? SESSION_INFO["Off-hours"];
  const now = new Date();
  const utcStr = now.toUTCString();
  const estH = (now.getUTCHours() - 5 + 24) % 24;
  const estStr = `${estH}:${String(now.getUTCMinutes()).padStart(2,"0")} EST`;

  const styles = {
    "Scalp":       { tf: "1m–5m", slPts: "8–20 NQ pts", holdHint: "5–45 minutes typically — adjust based on TP distance and session time remaining" },
    "Day Trade":   { tf: "15m–1H", slPts: "20–45 NQ pts", holdHint: "1–6 hours typically — account for session transitions and news risks" },
    "Swing Trade": { tf: "4H–1D", slPts: "50–120 NQ pts", holdHint: "1–5 days typically — overnight holds are expected, consider weekend risk" },
  };
  const s = styles[tradeStyle] ?? styles["Day Trade"];

  const entryInstr = entryMode === "fast"
    ? `ENTRY MODE: FAST (near-market limit)
- Find nearest micro-structure entry within 3-8 ticks of currentPrice
- Entry = edge of that micro-structure closest to currentPrice
- SL: behind nearest structure, max ${tradeStyle === "Scalp" ? 12 : 22} pts from entry`
    : `ENTRY MODE: STANDARD (limit at key level)
- Entry at key level — price must retrace there
- State distance from currentPrice to entry`;

  const multiChart = chartCount > 1 ? `
MULTI-TIMEFRAME ANALYSIS (${chartCount} charts uploaded):
- Analyze each chart independently first
- Chart with highest TF = bias/structure. Chart with lowest TF = entry.
- annotateChartIndex = index of the LOWEST timeframe chart (0-based)
- If charts conflict on direction → noTrade=true
- All keyLevels must have timeframe field` : "";

  const steps = STRATEGY_STEPS[strategy] ?? STRATEGY_STEPS["ICT/SMC"];

  return `Time: ${utcStr} (${estStr})
${sessionNote}

STRATEGY: ${strategy ?? "ICT/SMC"} | STYLE: ${tradeStyle} | TF: ${s.tf} | SL guide: ${s.slPts}
HOLD TIME GUIDANCE: ${s.holdHint}
${entryInstr}
${multiChart}

STEPS:
${steps}

IMPORTANT FOR holdTime: Do NOT use a generic range. Calculate the specific hold based on:
- Distance from entry to TP2 relative to ATR/typical candle size
- Current session (${session}) and time until session end
- Trade style (${tradeStyle})
- Example specific values: "Until NY close ~21:00 UTC", "45–90 minutes", "2–3 sessions", "Exit before Friday close"

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

  const { images, tradeStyle, entryMode, strategy } = body;
  if (!Array.isArray(images) || images.length === 0)
    return { statusCode: 400, body: "No images" };

  const systemPrompt = getSystem(strategy ?? "ICT/SMC");

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        ...images.map((img) => ({ type: "image_url", image_url: { url: img, detail: "high" } })),
        { type: "text", text: buildPrompt(tradeStyle ?? "Day Trade", entryMode ?? "standard", images.length, strategy ?? "ICT/SMC") },
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
    const choice = data.choices?.[0];
    const finishReason = choice?.finish_reason;

    if (finishReason === "content_filter")
      return { statusCode: 422, body: JSON.stringify({ error: "Content filtered by OpenAI — try a different chart or trade style." }) };

    const refusal = choice?.message?.refusal;
    if (refusal)
      return { statusCode: 422, body: JSON.stringify({ error: `OpenAI refused: ${refusal}` }) };

    const raw = choice?.message?.content ?? "";
    if (!raw)
      return { statusCode: 500, body: JSON.stringify({ error: `No content returned (finish_reason: ${finishReason ?? "unknown"})` }) };

    const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) return { statusCode: 500, body: JSON.stringify({ error: `Cannot parse response: ${raw.slice(0, 120)}` }) };

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: m[0] };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
