import { getWatchlist, saveWatchlist } from "@/db/watchlist";

export async function GET() {
  try { return Response.json({ symbols: await getWatchlist() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Unable to load Turso watchlist", error); return Response.json({ error: "Watchlist is unavailable" }, { status: 503 }); }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { symbols?: unknown };
    if (!Array.isArray(body.symbols)) return Response.json({ error: "Invalid watchlist" }, { status: 400 });
    const symbols = body.symbols.map((symbol) => typeof symbol === "string" ? symbol.trim().toUpperCase() : "");
    if (symbols.length < 1 || symbols.length > 8 || symbols.some((symbol) => !symbol || symbol.length > 15 || !/^[A-Z0-9.^=\-]+$/.test(symbol))) return Response.json({ error: "Use 1–8 valid ticker symbols" }, { status: 400 });
    if (new Set(symbols).size !== symbols.length) return Response.json({ error: "Ticker symbols must be unique" }, { status: 400 });
    await saveWatchlist(symbols);
    return Response.json({ symbols });
  } catch (error) { console.error("Unable to save Turso watchlist", error); return Response.json({ error: "Watchlist could not be saved" }, { status: 503 }); }
}
