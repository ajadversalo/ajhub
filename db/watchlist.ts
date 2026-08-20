import { getTurso } from "./turso";

export const defaultWatchlist = ["^GSPC", "^DJI", "^IXIC", "^RUT"];

async function ensureWatchlistTable() {
  const db = getTurso();
  await db.execute("CREATE TABLE IF NOT EXISTS market_watchlist (position INTEGER PRIMARY KEY, symbol TEXT NOT NULL)");
  const count = await db.execute("SELECT COUNT(*) AS count FROM market_watchlist");
  if (Number(count.rows[0]?.count ?? 0) === 0) {
    await db.batch(defaultWatchlist.map((symbol, position) => ({
      sql: "INSERT INTO market_watchlist (position, symbol) VALUES (?, ?)", args: [position, symbol],
    })), "write");
  }
  return db;
}

export async function getWatchlist() {
  const db = await ensureWatchlistTable();
  const result = await db.execute("SELECT symbol FROM market_watchlist ORDER BY position");
  return result.rows.map((row) => String(row.symbol));
}

export async function saveWatchlist(symbols: string[]) {
  const db = await ensureWatchlistTable();
  await db.batch([
    { sql: "DELETE FROM market_watchlist", args: [] },
    ...symbols.map((symbol, position) => ({ sql: "INSERT INTO market_watchlist (position, symbol) VALUES (?, ?)", args: [position, symbol] })),
  ], "write");
}
