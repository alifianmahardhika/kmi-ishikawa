import { getDb } from "../lib/db";
import { cacheGet, cacheSet, cacheKeys } from "../lib/cache";
import { json, methodNotAllowed, notFound } from "../lib/respond";
import type { EventItem } from "../../src/types/event";

function toEventItem(row: Record<string, unknown>): EventItem {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    startsAt: String(row.starts_at),
    location: String(row.location ?? ""),
    summary: String(row.summary ?? ""),
    body: String(row.body ?? ""),
    image: String(row.image ?? ""),
    isPublished: Boolean(row.is_published),
    createdAt: String(row.created_at),
  };
}

// Handles both /api/kegiatan (list) and /api/kegiatan/:slug (detail) — Netlify routes
// any /.netlify/functions/kegiatan/* request to this same function, with the rest of
// the path preserved on req.url.
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const slug = segments[segments.length - 1] === "kegiatan" ? null : segments[segments.length - 1];

  const db = getDb();

  if (slug) {
    const result = await db.execute({
      sql: "SELECT * FROM events WHERE slug = ? AND is_published = 1",
      args: [slug],
    });
    const row = result.rows[0];
    if (!row) return notFound("event_not_found");
    return json(toEventItem(row as Record<string, unknown>));
  }

  const cacheKey = cacheKeys.kegiatanList();
  const cached = cacheGet<EventItem[]>(cacheKey);
  if (cached) return json(cached);

  const result = await db.execute(
    "SELECT * FROM events WHERE is_published = 1 ORDER BY starts_at ASC",
  );
  const events = result.rows.map((row) => toEventItem(row as Record<string, unknown>));
  cacheSet(cacheKey, events);
  return json(events);
}
