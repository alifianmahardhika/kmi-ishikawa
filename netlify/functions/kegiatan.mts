import { getDb } from "../lib/db";
import { cacheGet, cacheSet, cacheKeys } from "../lib/cache";
import { endOfDayIfDateOnly, parsePageParams, paginatedResponse } from "../lib/pagination";
import { json, methodNotAllowed, notFound } from "../lib/respond";
import type { EventItem } from "../../src/types/event";
import type { Paginated } from "../../src/types/api";

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

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const { page, pageSize, offset } = parsePageParams(url, 10);

  // Only the plain "page 1, no filters" view is cacheable — that's the one nearly
  // every visitor hits (just opening /kegiatan). Paginated/filtered requests are rare
  // enough, and cheap enough with LIMIT/OFFSET, that caching them isn't worth the
  // invalidation complexity of a per-params cache key.
  const cacheable = page === 1 && !from && !to;
  const cacheKey = cacheKeys.kegiatanList();
  if (cacheable) {
    const cached = cacheGet<Paginated<EventItem>>(cacheKey);
    if (cached) return json(cached);
  }

  const conditions = ["is_published = 1"];
  const args: (string | number)[] = [];
  if (from) {
    conditions.push("starts_at >= ?");
    args.push(from);
  }
  if (to) {
    conditions.push("starts_at <= ?");
    args.push(endOfDayIfDateOnly(to));
  }
  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as n FROM events ${where}`, args });
  const total = Number(countResult.rows[0]?.n ?? 0);

  const result = await db.execute({
    sql: `SELECT * FROM events ${where} ORDER BY starts_at ASC LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset],
  });
  const events = result.rows.map((row) => toEventItem(row as Record<string, unknown>));
  const response = paginatedResponse(events, total, page, pageSize);

  if (cacheable) cacheSet(cacheKey, response);
  return json(response);
}
