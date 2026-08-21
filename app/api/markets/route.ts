import { defaultWatchlist, getWatchlist } from "@/db/watchlist";
import { getRequestUser } from "@/app/auth";

type YahooMeta = { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; shortName?: string; longName?: string };

async function fetchQuote(symbol: string) {
  let lastStatus = 0;
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
        cache: "no-store",
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 AJHub/1.0" },
      });
      lastStatus = response.status;
      if (!response.ok) continue;
      const payload = await response.json();
      const meta = payload.chart?.result?.[0]?.meta as YahooMeta | undefined;
      if (!meta || typeof meta.regularMarketPrice !== "number") continue;
      const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? meta.regularMarketPrice;
      const change = meta.regularMarketPrice - previousClose;
      return { symbol: symbol.replace("^", ""), name: meta.shortName ?? meta.longName ?? symbol, price: meta.regularMarketPrice, change, changePercent: previousClose ? (change / previousClose) * 100 : 0 };
    } catch (error) { console.error(`Quote host failed for ${symbol}`, error); }
  }
  throw new Error(`Quote unavailable for ${symbol} (${lastStatus || "network error"})`);
}

export async function GET(request: Request) {
  if (!await getRequestUser(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    let symbols = defaultWatchlist;
    try { symbols = await getWatchlist(); } catch (error) { console.error("Using default watchlist", error); }
    const results = await Promise.allSettled(symbols.map(fetchQuote));
    const quotes = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const unavailable = results.flatMap((result, index) => result.status === "rejected" ? [symbols[index]] : []);
    for (const result of results) if (result.status === "rejected") console.error(result.reason);
    if (quotes.length === 0) throw new Error("No market quotes were returned");
    return Response.json({ quotes, unavailable, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240" } });
  } catch (error) {
    console.error("Market data unavailable", error);
    return Response.json({ error: "Market data unavailable" }, { status: 503 });
  }
}
