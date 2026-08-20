import { getTurso } from "@/db/turso";

const defaultLinks = [
  ["mail", "https://mail.google.com"],
  ["calendar", "https://calendar.google.com"],
  ["github", "https://github.com"],
  ["drive", "https://drive.google.com"],
  ["portfolio", "https://portfolio.ajhub.ca"],
  ["linkedin", "https://linkedin.com"],
  ["youtube", "https://youtube.com"],
  ["maps", "https://maps.google.com"],
  ["notion", "https://notion.so"],
  ["chatgpt", "https://chatgpt.com"],
  ["gemini", "https://gemini.google.com"],
  ["grok", "https://grok.com"],
] as const;

const validIds = new Set(defaultLinks.map(([id]) => id));

async function ensureLinksTable() {
  const db = getTurso();
  await db.execute(`CREATE TABLE IF NOT EXISTS launchpad_links (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.batch(
    defaultLinks.map(([id, url]) => ({
      sql: "INSERT OR IGNORE INTO launchpad_links (id, url) VALUES (?, ?)",
      args: [id, url],
    })),
    "write",
  );
  return db;
}

export async function GET() {
  try {
    const db = await ensureLinksTable();
    const result = await db.execute("SELECT id, url FROM launchpad_links");
    const links = Object.fromEntries(result.rows.map((row) => [String(row.id), String(row.url)]));
    return Response.json({ links }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load Turso links", error);
    return Response.json({ error: "Saved links are unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as { id?: unknown; url?: unknown };
    if (typeof body.id !== "string" || !validIds.has(body.id as typeof defaultLinks[number][0])) {
      return Response.json({ error: "Unknown link" }, { status: 400 });
    }
    if (typeof body.url !== "string" || body.url.length > 2048) {
      return Response.json({ error: "Enter a valid URL" }, { status: 400 });
    }

    let normalizedUrl: string;
    try {
      const parsed = new URL(body.url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Unsupported protocol");
      normalizedUrl = parsed.toString();
    } catch {
      return Response.json({ error: "URL must start with http:// or https://" }, { status: 400 });
    }

    const db = await ensureLinksTable();
    await db.execute({
      sql: "INSERT INTO launchpad_links (id, url, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET url = excluded.url, updated_at = CURRENT_TIMESTAMP",
      args: [body.id, normalizedUrl],
    });
    return Response.json({ id: body.id, url: normalizedUrl });
  } catch (error) {
    console.error("Unable to save Turso link", error);
    return Response.json({ error: "Link could not be saved" }, { status: 503 });
  }
}
