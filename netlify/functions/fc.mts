import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { getDb } from "../lib/db";
import { cacheDelete, cacheGet, cacheKeys, cacheSet } from "../lib/cache";
import { getClientIp, hashIp, memoryRateLimited } from "../lib/ratelimit";
import {
  BOOKING_SELECT,
  codeLookupHash,
  generateMemberCode,
  normalizePhone,
  parseCode,
  parsePosition,
  readFcContent,
  readPublicEvents,
  toAdminBooking,
  todayJst,
} from "../lib/fc";
import { badRequest, errorResponse, json, methodNotAllowed, notFound, serverError, tooManyRequests } from "../lib/respond";
import { requireInt, requireString } from "../lib/validate";
import type { FunctionContext } from "../lib/types";
import type { FcBookingCreateResponse, FcLookupResponse, FcMyBooking, FcPublicData } from "../../src/types/fc";

const MAX_BOOKINGS_PER_HOUR = 5;
const PUBLIC_EVENT_LIMIT = 60;
const MAX_TOKENS_PER_LOOKUP = 50;
const MAX_PIN_FAILS_PER_IP_PER_HOUR = 10;

// Satu function untuk seluruh /api/fc/* (sama alasannya dengan admin.mts): GET /api/fc
// = halaman publik; POST /api/fc/daftar | saya | batal | cari = aksi pendaftar. Tidak ada data
// pribadi peserta lain yang pernah keluar dari sini — "saya" hanya mengembalikan baris
// yang token rahasianya dikirim klien (disimpan di localStorage browser pendaftar).
export default async function handler(req: Request, context: FunctionContext): Promise<Response> {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const action = segments[segments.indexOf("fc") + 1];

  try {
    if (!action) return await handlePublic(req);
    if (action === "daftar") return await handleDaftar(req, context);
    if (action === "saya") return await handleSaya(req, context);
    if (action === "batal") return await handleBatal(req, context);
    if (action === "cari") return await handleCari(req, context);
    return notFound();
  } catch (err) {
    // Hanya kode validasi (mis. "phone_invalid", "name_required") yang jadi 400. Selain itu —
    // konfigurasi hilang (FC_CODE_SECRET), error DB — adalah masalah server: 500 generik,
    // tanpa membocorkan pesan internal ke klien.
    const message = err instanceof Error ? err.message : "";
    if (/^[a-zA-Z]+(_[a-zA-Z]+)+$/.test(message)) return badRequest(message);
    console.error("[api:fc]", err);
    return serverError();
  }
}

// Cache dipakai untuk response publik (mengikuti pola stats/laporan): tanpa query
// param, jadi semua pengunjung berbagi satu entri. Di-invalidate saat admin mengubah
// jadwal/pendaftaran/teks (netlify/lib/fc-admin.ts). Pendaftaran baru berstatus pending
// tidak mengubah hitungan slot publik, jadi tidak perlu invalidate.
async function handlePublic(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  // `today` sengaja tidak ikut di-cache — cache bisa bertahan 6 jam melewati tengah malam JST.
  const cached = cacheGet<Omit<FcPublicData, "today">>(cacheKeys.fcPublic());
  if (cached) return json({ ...cached, today: todayJst() } satisfies FcPublicData);

  const db = getDb();
  const [content, events] = await Promise.all([readFcContent(db), readPublicEvents(db, PUBLIC_EVENT_LIMIT)]);
  const data = { content, events };
  cacheSet(cacheKeys.fcPublic(), data);
  return json({ ...data, today: todayJst() } satisfies FcPublicData);
}

// Dua cara mendaftar: (1) pendaftar BARU kirim name+phone -> dibuatkan member + kode
// (dikembalikan sekali); (2) member lama kirim memberCode -> nama/nomor diambil dari data
// member, tidak perlu diisi lagi. Tiap pendaftaran tetap menyalin name/phone ke
// fc_bookings (riwayat apa adanya + dipakai panel admin), dan UNIQUE (event_id, phone)
// mencegah nomor yang sama mendaftar dua kali di match day yang sama.
async function handleDaftar(req: Request, context: FunctionContext): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed();
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("invalid_json");

  // Honeypot — sama seperti donasi.mts: pura-pura berhasil, tidak menyentuh DB.
  if (body.website) {
    return json({ token: randomUUID(), code: generateMemberCode(), name: "" } satisfies FcBookingCreateResponse);
  }

  const eventId = requireInt(body.eventId, "eventId", { min: 1 });
  const position = parsePosition(body.position);
  const memberCode = body.memberCode ? parseCode(body.memberCode) : null;
  const identity = memberCode
    ? null
    : { name: requireString(body.name, "name", { min: 2, max: 80 }), phone: normalizePhone(body.phone) };

  const db = getDb();
  const ipHash = hashIp(getClientIp(req, context));
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM fc_bookings WHERE ip_hash = ? AND created_at > ?",
    args: [ipHash, since],
  });
  if (Number(recent.rows[0]?.n ?? 0) >= MAX_BOOKINGS_PER_HOUR) return tooManyRequests();

  let member: { id: number; name: string; phone: string } | null = null;
  if (memberCode) {
    // Kode salah dihitung sebagai percobaan tebak (sama seperti /cari).
    if (await tooManyLookupFailures(db, ipHash)) return tooManyRequests();
    const found = await db.execute({
      sql: "SELECT id, name, phone FROM fc_members WHERE code_lookup = ?",
      args: [codeLookupHash(memberCode)],
    });
    const row = found.rows[0];
    if (!row) {
      await recordLookupFailure(db, ipHash);
      return errorResponse(400, "lookup_failed");
    }
    member = { id: Number(row.id), name: String(row.name), phone: String(row.phone) };
  }

  const eventResult = await db.execute({
    sql: "SELECT date, is_closed FROM fc_events WHERE id = ?",
    args: [eventId],
  });
  const event = eventResult.rows[0];
  if (!event) return notFound("event_not_found");
  if (event.is_closed) return errorResponse(409, "event_closed");
  if (String(event.date) < todayJst()) return errorResponse(409, "event_finished");

  const token = randomUUID();
  const now = new Date().toISOString();
  const insertBooking = (memberId: number | string, name: string, phone: string) => ({
    sql: `INSERT INTO fc_bookings (event_id, token, name, phone, position, created_at, ip_hash, member_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ${typeof memberId === "string" ? memberId : "?"})`,
    args: [
      eventId, token, name, phone, position, now, ipHash,
      ...(typeof memberId === "string" ? [] : [memberId]),
    ],
  });

  try {
    if (member) {
      await db.execute(insertBooking(member.id, member.name, member.phone));
      return json({ token, code: null, name: member.name } satisfies FcBookingCreateResponse);
    }

    if (!identity) return badRequest("invalid_input");
    // Member + pendaftaran dalam SATU transaksi (batch): kalau nomor sudah terdaftar di match
    // day ini, keduanya dibatalkan — tidak ada member yatim.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateMemberCode();
      try {
        await db.batch(
          [
            {
              sql: "INSERT INTO fc_members (name, phone, code_lookup, created_at) VALUES (?, ?, ?, ?)",
              args: [identity.name, identity.phone, codeLookupHash(parseCode(code)), now],
            },
            insertBooking("last_insert_rowid()", identity.name, identity.phone),
          ],
          "write",
        );
        // `code` hanya keluar di response ini; di DB hanya HMAC-nya, tidak bisa dilihat lagi.
        return json({ token, code, name: identity.name } satisfies FcBookingCreateResponse);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (/fc_members\.code_lookup/.test(message)) continue; // tabrakan kode (sangat jarang): buat ulang
        throw err;
      }
    }
    return errorResponse(500, "could_not_generate_code");
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) return errorResponse(409, "already_registered");
    throw err;
  }
}

async function handleSaya(req: Request, context: FunctionContext): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed();
  if (memoryRateLimited(`fc-saya:${getClientIp(req, context)}`, 30, 60_000)) return tooManyRequests();
  const body = await req.json().catch(() => ({}));
  const tokens: string[] = Array.isArray(body.tokens)
    ? body.tokens.filter((t: unknown): t is string => typeof t === "string" && t.length > 0 && t.length <= 64)
    : [];
  if (tokens.length === 0) return json([] satisfies FcMyBooking[]);
  if (tokens.length > MAX_TOKENS_PER_LOOKUP) return badRequest("too_many_tokens");

  const result = await getDb().execute({
    sql: `${BOOKING_SELECT} WHERE b.token IN (${tokens.map(() => "?").join(",")}) ORDER BY e.date DESC, b.id DESC`,
    args: tokens,
  });
  const today = todayJst();
  const items: FcMyBooking[] = result.rows.map((row) => {
    const booking = toAdminBooking(row as Record<string, unknown>);
    return {
      token: String(row.token),
      eventId: booking.eventId,
      eventTitle: booking.eventTitle,
      eventDate: booking.eventDate,
      position: booking.position,
      isPaid: booking.isPaid,
      status: booking.status,
      canCancel: booking.eventDate >= today,
    };
  });
  return json(items);
}

async function handleBatal(req: Request, context: FunctionContext): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed();
  if (memoryRateLimited(`fc-batal:${getClientIp(req, context)}`, 10, 60_000)) return tooManyRequests();
  const body = await req.json().catch(() => ({}));
  const token = requireString(body.token, "token", { max: 64 });

  const db = getDb();
  const found = await db.execute({
    sql: "SELECT b.id, b.approved_at, e.date FROM fc_bookings b JOIN fc_events e ON e.id = b.event_id WHERE b.token = ?",
    args: [token],
  });
  const row = found.rows[0];
  if (!row) return notFound("booking_not_found");
  if (String(row.date) < todayJst()) return errorResponse(409, "event_finished");

  await db.execute({ sql: "DELETE FROM fc_bookings WHERE id = ?", args: [Number(row.id)] });
  // Membatalkan pendaftar terkonfirmasi membebaskan slot -> hitungan publik berubah.
  if (row.approved_at) cacheDelete(cacheKeys.fcPublic());
  return json({ ok: true });
}

// Percobaan tebak kode dibatasi per IP lewat tabel (ketat, lintas instance): 10 gagal per
// jam. Semua kegagalan memberi jawaban seragam `lookup_failed`.
const FAIL_WINDOW_MS = 60 * 60 * 1000;

async function tooManyLookupFailures(db: Client, ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - FAIL_WINDOW_MS).toISOString();
  const failures = await db.execute({
    sql: "SELECT COUNT(*) AS n FROM fc_pin_attempts WHERE ip_hash = ? AND created_at > ?",
    args: [ipHash, since],
  });
  return Number(failures.rows[0]?.n ?? 0) >= MAX_PIN_FAILS_PER_IP_PER_HOUR;
}

async function recordLookupFailure(db: Client, ipHash: string): Promise<void> {
  const now = Date.now();
  await db.batch([
    // Bersihkan catatan lama sekalian supaya tabel tidak membengkak.
    { sql: "DELETE FROM fc_pin_attempts WHERE created_at < ?", args: [new Date(now - FAIL_WINDOW_MS).toISOString()] },
    { sql: "INSERT INTO fc_pin_attempts (ip_hash, created_at) VALUES (?, ?)", args: [ipHash, new Date(now).toISOString()] },
  ]);
}

// Masuk dari perangkat lain: kode member -> token semua pendaftarannya + nama (untuk sapaan).
// Nomor HP tidak pernah dikembalikan. Klien menyimpan token & kode di localStorage lalu
// memakai /saya seperti biasa.
async function handleCari(req: Request, context: FunctionContext): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed();
  const body = await req.json().catch(() => ({}));
  const code = parseCode(body.code);

  const db = getDb();
  const ipHash = hashIp(getClientIp(req, context));
  if (await tooManyLookupFailures(db, ipHash)) return tooManyRequests();

  const found = await db.execute({
    sql: "SELECT id, name FROM fc_members WHERE code_lookup = ?",
    args: [codeLookupHash(code)],
  });
  const member = found.rows[0];
  if (!member) {
    await recordLookupFailure(db, ipHash);
    return errorResponse(400, "lookup_failed");
  }

  // Batas MAX_TOKENS_PER_LOOKUP supaya klien tidak mengirim >50 token ke /saya.
  const bookings = await db.execute({
    sql: "SELECT token FROM fc_bookings WHERE member_id = ? ORDER BY id DESC LIMIT ?",
    args: [Number(member.id), MAX_TOKENS_PER_LOOKUP],
  });
  return json({
    tokens: bookings.rows.map((r) => String(r.token)),
    name: String(member.name),
  } satisfies FcLookupResponse);
}
