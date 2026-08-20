import { getTurso } from "@/db/turso";
import { getRequestUser } from "@/app/auth";

const defaultLinks = [
  ["mail", "Mail", "M", "https://mail.google.com"],
  ["calendar", "Calendar", "C", "https://calendar.google.com"],
  ["github", "GitHub", "G", "https://github.com"],
  ["drive", "Drive", "D", "https://drive.google.com"],
  ["portfolio", "Portfolio", "P", "https://portfolio.ajhub.ca"],
  ["linkedin", "LinkedIn", "IN", "https://linkedin.com"],
  ["youtube", "YouTube", "YT", "https://youtube.com"],
  ["maps", "Maps", "MAP", "https://maps.google.com"],
  ["notion", "Notion", "N", "https://notion.so"],
  ["chatgpt", "ChatGPT", "AI", "https://chatgpt.com"],
  ["gemini", "Gemini", "AI", "https://gemini.google.com"],
  ["grok", "Grok", "AI", "https://grok.com"],
] as const;

const validIds = new Set(defaultLinks.map(([id]) => id));

async function ensureLinksTable() {
  const db = getTurso();
  await db.execute(`CREATE TABLE IF NOT EXISTS launchpad_links (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute("CREATE TABLE IF NOT EXISTS launchpad_link_meta (id TEXT PRIMARY KEY, name TEXT NOT NULL, monogram TEXT NOT NULL)");
  await db.batch(
    [...defaultLinks.map(([id, , , url]) => ({
      sql: "INSERT OR IGNORE INTO launchpad_links (id, url) VALUES (?, ?)",
      args: [id, url],
    })), ...defaultLinks.map(([id, name, monogram]) => ({
      sql: "INSERT OR IGNORE INTO launchpad_link_meta (id, name, monogram) VALUES (?, ?, ?)",
      args: [id, name, monogram],
    }))],
    "write",
  );
  return db;
}

export async function GET(request: Request) {
  if (!await getRequestUser(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const db = await ensureLinksTable();
    const result = await db.execute("SELECT l.id, l.url, m.name, m.monogram FROM launchpad_links l JOIN launchpad_link_meta m ON m.id = l.id");
    const links = Object.fromEntries(result.rows.map((row) => [String(row.id), { url: String(row.url), name: String(row.name), key: String(row.monogram) }]));
    return Response.json({ links }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load Turso links", error);
    return Response.json({ error: "Saved links are unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!await getRequestUser(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { id?: unknown; url?: unknown; name?: unknown; key?: unknown };
    if (typeof body.id !== "string" || !validIds.has(body.id as typeof defaultLinks[number][0])) {
      return Response.json({ error: "Unknown link" }, { status: 400 });
    }
    if (typeof body.url !== "string" || body.url.length > 2048) {
      return Response.json({ error: "Enter a valid URL" }, { status: 400 });
    }
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 40) return Response.json({ error: "Title must be 1–40 characters" }, { status: 400 });
    if (typeof body.key !== "string" || !body.key.trim() || body.key.trim().length > 5) return Response.json({ error: "Letter must be 1–5 characters" }, { status: 400 });

    let normalizedUrl: string;
    try {
      const parsed = new URL(body.url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Unsupported protocol");
      normalizedUrl = parsed.toString();
    } catch {
      return Response.json({ error: "URL must start with http:// or https://" }, { status: 400 });
    }

    const db = await ensureLinksTable();
    const name = body.name.trim();
    const key = body.key.trim().toUpperCase();
    await db.batch([
      { sql: "UPDATE launchpad_links SET url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", args: [normalizedUrl, body.id] },
      { sql: "UPDATE launchpad_link_meta SET name = ?, monogram = ? WHERE id = ?", args: [name, key, body.id] },
    ], "write");
    return Response.json({ id: body.id, url: normalizedUrl, name, key });
  } catch (error) {
    console.error("Unable to save Turso link", error);
    return Response.json({ error: "Link could not be saved" }, { status: 503 });
  }
}
