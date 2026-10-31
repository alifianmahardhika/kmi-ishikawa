import { getDb } from "./db";
import { cacheDelete, cacheKeys } from "./cache";
import { badRequest, json, methodNotAllowed, notFound } from "./respond";
import { parsePageParams, paginatedResponse } from "./pagination";
import { requireBoolean } from "./validate";
import {
  BOOKING_SELECT,
  parseContentInput,
  parseEventInput,
  readFcContent,
  toAdminBooking,
  toFcEvent,
} from "./fc";

/** Handler untuk /api/admin/fc/* — dipanggil dari netlify/functions/admin.mts setelah
 * cek sesi (routing tetap di admin.mts). `rest` = sisa path setelah "fc",
 * mis. ["events", "3", "close"]. Setiap aksi tulis meng-invalidate cache halaman
 * publik (cacheKeys.fcPublic) supaya perubahan langsung terlihat. */
export async function handleFcAdmin(req: Request, rest: string[]): Promise<Response> {
  const [resource, id, sub] = rest;
  if (resource === "events") return handleEvents(req, id, sub);
  if (resource === "bookings") return handleBookings(req, id);
  if (resource === "settings") return handleContent(req);
  return notFound();
}

async function handleEvents(req: Request, id?: string, sub?: string): Promise<Response> {
  const db = getDb();

  if (!id) {
    if (req.method === "GET") {
      const { page, pageSize, offset } = parsePageParams(new URL(req.url));
      const total = Number((await db.execute("SELECT COUNT(*) AS n FROM fc_events")).rows[0]?.n ?? 0);
      const result = await db.execute({
        sql: "SELECT * FROM fc_events ORDER BY date DESC, id DESC LIMIT ? OFFSET ?",
        args: [pageSize, offset],
      });
      const items = result.rows.map((r) => toFcEvent(r as Record<string, unknown>));
      return json(paginatedResponse(items, total, page, pageSize));
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      try {
        const e = parseEventInput(body);
        await db.execute({
          sql: `INSERT INTO fc_events
                (title, date, time, venue, map_url, gk_quota, player_quota, fee, gk_fee, notes, drive_url, youtube_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            e.title, e.date, e.time, e.venue, e.mapUrl, e.gkQuota, e.playerQuota,
            e.fee, e.gkFee, e.notes, e.driveUrl, e.youtubeUrl, new Date().toISOString(),
          ],
        });
        cacheDelete(cacheKeys.fcPublic());
        return json({ ok: true });
      } catch (err) {
        return badRequest(err instanceof Error ? err.message : "invalid_input");
      }
    }
    return methodNotAllowed();
  }

  if (req.method === "PATCH" && sub === "close") {
    const body = await req.json().catch(() => ({}));
    try {
      const closed = requireBoolean(body.closed, "closed");
      const result = await db.execute({
        sql: "UPDATE fc_events SET is_closed = ? WHERE id = ?",
        args: [closed ? 1 : 0, Number(id)],
      });
      if (result.rowsAffected === 0) return notFound("event_not_found");
      cacheDelete(cacheKeys.fcPublic());
      return json({ ok: true });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "invalid_input");
    }
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    try {
      const e = parseEventInput(body);
      const result = await db.execute({
        sql: `UPDATE fc_events SET title = ?, date = ?, time = ?, venue = ?, map_url = ?, gk_quota = ?,
              player_quota = ?, fee = ?, gk_fee = ?, notes = ?, drive_url = ?, youtube_url = ? WHERE id = ?`,
        args: [
          e.title, e.date, e.time, e.venue, e.mapUrl, e.gkQuota, e.playerQuota,
          e.fee, e.gkFee, e.notes, e.driveUrl, e.youtubeUrl, Number(id),
        ],
      });
      if (result.rowsAffected === 0) return notFound("event_not_found");
      cacheDelete(cacheKeys.fcPublic());
      return json({ ok: true });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "invalid_input");
    }
  }

  if (req.method === "DELETE") {
    // Hapus peserta secara eksplisit — jangan bergantung pada ON DELETE CASCADE, yang
    // hanya jalan kalau foreign_keys aktif di koneksi libSQL.
    await db.execute({ sql: "DELETE FROM fc_bookings WHERE event_id = ?", args: [Number(id)] });
    const result = await db.execute({ sql: "DELETE FROM fc_events WHERE id = ?", args: [Number(id)] });
    if (result.rowsAffected === 0) return notFound("event_not_found");
    cacheDelete(cacheKeys.fcPublic());
    return json({ ok: true });
  }

  return methodNotAllowed();
}

async function handleBookings(req: Request, id?: string): Promise<Response> {
  const db = getDb();

  if (!id) {
    if (req.method !== "GET") return methodNotAllowed();
    const url = new URL(req.url);
    const eventId = Number(url.searchParams.get("event"));
    const pendingOnly = url.searchParams.get("pending") === "1";
    const { page, pageSize, offset } = parsePageParams(url);

    const conditions: string[] = [];
    const args: number[] = [];
    if (eventId) {
      conditions.push("b.event_id = ?");
      args.push(eventId);
    }
    if (pendingOnly) conditions.push("b.approved_at IS NULL");
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = Number(
      (await db.execute({ sql: `SELECT COUNT(*) AS n FROM fc_bookings b ${where}`, args })).rows[0]?.n ?? 0,
    );
    const result = await db.execute({
      sql: `${BOOKING_SELECT} ${where} ORDER BY e.date DESC, b.position, b.created_at LIMIT ? OFFSET ?`,
      args: [...args, pageSize, offset],
    });
    const items = result.rows.map((r) => toAdminBooking(r as Record<string, unknown>));
    return json(paginatedResponse(items, total, page, pageSize));
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    try {
      const sets: string[] = [];
      const args: (string | number | null)[] = [];
      if (body.approved !== undefined) {
        // Hanya set approved_at kalau belum terkonfirmasi — jangan menggeser urutan antrean
        // peserta yang sudah dapat slot hanya karena tombol ditekan dua kali.
        const approved = requireBoolean(body.approved, "approved");
        sets.push(approved ? "approved_at = COALESCE(approved_at, ?)" : "approved_at = NULL");
        if (approved) args.push(new Date().toISOString());
      }
      if (body.paid !== undefined) {
        sets.push("is_paid = ?");
        args.push(requireBoolean(body.paid, "paid") ? 1 : 0);
      }
      if (sets.length === 0) return badRequest("nothing_to_update");

      const result = await db.execute({
        sql: `UPDATE fc_bookings SET ${sets.join(", ")} WHERE id = ?`,
        args: [...args, Number(id)],
      });
      if (result.rowsAffected === 0) return notFound("booking_not_found");
      cacheDelete(cacheKeys.fcPublic());
      return json({ ok: true });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "invalid_input");
    }
  }

  if (req.method === "DELETE") {
    const result = await db.execute({ sql: "DELETE FROM fc_bookings WHERE id = ?", args: [Number(id)] });
    if (result.rowsAffected === 0) return notFound("booking_not_found");
    cacheDelete(cacheKeys.fcPublic());
    return json({ ok: true });
  }

  return methodNotAllowed();
}

async function handleContent(req: Request): Promise<Response> {
  const db = getDb();

  if (req.method === "GET") return json(await readFcContent(db));

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    try {
      const content = parseContentInput(body);
      await db.execute({
        sql: `INSERT INTO fc_settings (key, value, updated_at) VALUES ('content', ?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        args: [JSON.stringify(content), new Date().toISOString()],
      });
      cacheDelete(cacheKeys.fcPublic());
      return json({ ok: true });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "invalid_input");
    }
  }

  return methodNotAllowed();
}
