// Fetches live price from free public APIs (CORS-friendly, no key needed)
// Returns null if unavailable so the user can enter manually

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
};

// Yahoo Finance proxy via allorigins (avoids CORS)
const YAHOO_TICKERS: Record<string, string> = {
  NQ: "NQ=F",
  "S&P 500": "ES=F",
  GC: "GC=F",
  CL: "CL=F",
  "EUR/USD": "EURUSD=X",
};

export async function fetchLivePrice(market: string): Promise<number | null> {
  // Crypto via CoinGecko (free, no key, allows CORS)
  const geckoId = COINGECKO_IDS[market];
  if (geckoId) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        const price = data[geckoId]?.usd;
        if (price) return price;
      }
    } catch {
      // fall through
    }
  }

  // Traditional assets via Yahoo Finance through allorigins CORS proxy
  const yahooTicker = YAHOO_TICKERS[market];
  if (yahooTicker) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}?interval=1m&range=1d`;
      const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxied, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price) return price;
      }
    } catch {
      // fall through
    }
  }

  return null;
}
