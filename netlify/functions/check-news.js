const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API key not configured" }) };

  let symbol;
  try {
    ({ symbol } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const utcHour = new Date().getUTCHours();
  const session = utcHour >= 13 && utcHour < 21 ? "New York" : utcHour >= 7 && utcHour < 13 ? "London" : "Asian";

  const prompt = `Today is ${today}. Current session: ${session}.

I am trading ${symbol}. List the key economic events scheduled for TODAY that could significantly impact ${symbol}:
- Event name (e.g. "CPI", "FOMC", "NFP", "GDP")
- Impact: HIGH / MEDIUM / LOW
- Time (EST/UTC)
- Expected effect on ${symbol} (bullish/bearish/volatile/avoid)

Also: Is this a good time to trade ${symbol} given the session and any news risks? Give a clear YES/NO/CAUTION.

If no major events today, say so clearly but still assess current macro themes.
Format as a clear bullet list. Max 180 words. Be direct.`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });

    if (!res.ok) return { statusCode: res.status, body: JSON.stringify({ error: "API error" }) };
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "No data returned.";
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
