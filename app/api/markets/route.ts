import { defaultWatchlist, getWatchlist } from "@/db/watchlist";

export async function GET() {
  try {
    let symbols = defaultWatchlist;
    try { symbols = await getWatchlist(); } catch (error) { console.error("Using default watchlist", error); }
    const quotes = await Promise.all(symbols.map(async (symbol) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const response = await fetch(url, { headers: { "User-Agent": "AJHub/1.0" } });
      if (!response.ok) throw new Error(`Quote request failed: ${symbol}`);
      const payload = await response.json();
      const meta = payload.chart?.result?.[0]?.meta;
      if (!meta || typeof meta.regularMarketPrice !== "number") throw new Error(`Invalid quote: ${symbol}`);
      const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
      const change = meta.regularMarketPrice - previousClose;
      const changePercent = previousClose ? (change / previousClose) * 100 : 0;
      return { symbol: symbol.replace("^", ""), name: meta.shortName ?? meta.longName ?? symbol, price: meta.regularMarketPrice, change, changePercent };
    }));
    return Response.json({ quotes, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" } });
  } catch {
    return Response.json({ error: "Market data unavailable" }, { status: 503 });
  }
}
