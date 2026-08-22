import { getTurso } from "./turso";

export type PublicCard = {
  slot: number;
  title: string;
  description: string;
  url: string;
  techStack: string;
};

async function ensurePublicCardsTable() {
  const db = getTurso();
  await db.execute(`CREATE TABLE IF NOT EXISTS public_cards (
    slot INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL,
    tech_stack TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (slot BETWEEN 1 AND 9)
  )`);
  return db;
}

export async function getPublicCards(): Promise<PublicCard[]> {
  const db = await ensurePublicCardsTable();
  const result = await db.execute("SELECT slot, title, description, url, tech_stack FROM public_cards ORDER BY slot");
  return result.rows.map((row) => ({
    slot: Number(row.slot),
    title: String(row.title),
    description: String(row.description),
    url: String(row.url),
    techStack: String(row.tech_stack),
  }));
}

export async function savePublicCard(card: PublicCard) {
  const db = await ensurePublicCardsTable();
  await db.execute({
    sql: `INSERT INTO public_cards (slot, title, description, url, tech_stack, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(slot) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        url = excluded.url,
        tech_stack = excluded.tech_stack,
        updated_at = CURRENT_TIMESTAMP`,
    args: [card.slot, card.title, card.description, card.url, card.techStack],
  });
}

export async function removePublicCard(slot: number) {
  const db = await ensurePublicCardsTable();
  await db.execute({ sql: "DELETE FROM public_cards WHERE slot = ?", args: [slot] });
}
