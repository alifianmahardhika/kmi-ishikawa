import { createHmac, randomInt } from "node:crypto";
import type { Client } from "@libsql/client";
import { FC_DEFAULT_CONTENT } from "../../src/config/fc";
import type {
  FcAdminBooking,
  FcBookingStatus,
  FcContent,
  FcEvent,
  FcEventInput,
  FcLink,
  FcPosition,
  FcPublicEvent,
} from "../../src/types/fc";
import { optionalString, requireInt, requireString } from "./validate";

const DRIVE_HOSTS = ["drive.google.com", "docs.google.com"];
const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
const MAPS_HOSTS = ["www.google.com", "maps.google.com", "maps.app.goo.gl"];

/** Tanggal hari ini di JST sebagai YYYY-MM-DD. Tanggal jadwal disimpan date-only
 * dalam JST, jadi pembandingnya juga harus JST (bukan UTC). */
export function todayJst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

/** Kosong diperbolehkan; selain itu harus HTTPS ke salah satu host yang diizinkan. */
function optionalHttpsUrl(value: unknown, field: string, hosts: string[]): string {
  const raw = optionalString(value, field, 2048);
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${field}_invalid`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || !hosts.includes(url.hostname)) {
    throw new Error(`${field}_invalid`);
  }
  return raw;
}

export function parseEventInput(body: Record<string, unknown>): FcEventInput {
  const date = requireString(body.date, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new Error("date_invalid");
  return {
    title: requireString(body.title, "title", { max: 140 }),
    date,
    time: optionalString(body.time, "time", 60),
    venue: requireString(body.venue, "venue", { max: 200 }),
    mapUrl: optionalHttpsUrl(body.mapUrl, "mapUrl", MAPS_HOSTS),
    gkQuota: requireInt(body.gkQuota, "gkQuota", { min: 0, max: 200 }),
    playerQuota: requireInt(body.playerQuota, "playerQuota", { min: 0, max: 200 }),
    fee: requireInt(body.fee, "fee", { min: 0, max: 100_000 }),
    gkFee: requireInt(body.gkFee, "gkFee", { min: 0, max: 100_000 }),
    notes: optionalString(body.notes, "notes", 2000),
    driveUrl: optionalHttpsUrl(body.driveUrl, "driveUrl", DRIVE_HOSTS),
    youtubeUrl: optionalHttpsUrl(body.youtubeUrl, "youtubeUrl", YOUTUBE_HOSTS),
  };
}

/** Nomor HP internasional (E.164). Dibersihkan dari spasi/tanda baca dulu supaya
 * "+81 90-1234-5678" dan "+819012345678" dianggap nomor yang sama. */
export function normalizePhone(value: unknown): string {
  const phone = requireString(value, "phone", { max: 22 }).replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("phone_invalid");
  return phone;
}

export function parsePosition(value: unknown): FcPosition {
  if (value !== "PLAYER" && value !== "GK") throw new Error("position_invalid");
  return value;
}

export function toFcEvent(row: Record<string, unknown>): FcEvent {
  return {
    id: Number(row.id),
    title: String(row.title),
    date: String(row.date),
    time: String(row.time ?? ""),
    venue: String(row.venue),
    mapUrl: String(row.map_url ?? ""),
    gkQuota: Number(row.gk_quota),
    playerQuota: Number(row.player_quota),
    fee: Number(row.fee),
    gkFee: Number(row.gk_fee),
    notes: String(row.notes ?? ""),
    driveUrl: String(row.drive_url ?? ""),
    youtubeUrl: String(row.youtube_url ?? ""),
    isClosed: Boolean(row.is_closed),
    createdAt: String(row.created_at),
  };
}

/** `rank` = urutan konfirmasi (1-based) di antara pendaftar terkonfirmasi untuk
 * event+posisi yang sama. Slot diberikan sesuai urutan konfirmasi; yang melewati
 * kuota masuk waiting list. */
export function bookingStatus(
  approvedAt: string | null,
  rank: number,
  event: Pick<FcEvent, "gkQuota" | "playerQuota">,
  position: FcPosition,
): FcBookingStatus {
  if (!approvedAt) return "pending";
  return rank <= (position === "GK" ? event.gkQuota : event.playerQuota) ? "confirmed" : "waiting";
}

/** Event + hitungan slot terkonfirmasi. Hanya agregat — tidak ada data peserta. */
export async function readPublicEvents(db: Client, limit: number): Promise<FcPublicEvent[]> {
  const eventRows = await db.execute({
    sql: "SELECT * FROM fc_events ORDER BY date DESC, id DESC LIMIT ?",
    args: [limit],
  });
  const events = eventRows.rows.map((r) => toFcEvent(r as Record<string, unknown>));
  if (events.length === 0) return [];

  const minId = Math.min(...events.map((e) => e.id));
  const counts = await db.execute({
    sql: `SELECT event_id, position, COUNT(*) AS n FROM fc_bookings
          WHERE approved_at IS NOT NULL AND event_id >= ? GROUP BY event_id, position`,
    args: [minId],
  });
  const approved = new Map<string, number>();
  for (const row of counts.rows) approved.set(`${row.event_id}:${row.position}`, Number(row.n));

  return events.map((event) => {
    const gk = approved.get(`${event.id}:GK`) ?? 0;
    const players = approved.get(`${event.id}:PLAYER`) ?? 0;
    return {
      ...event,
      confirmedGk: Math.min(gk, event.gkQuota),
      confirmedPlayers: Math.min(players, event.playerQuota),
      waiting: Math.max(0, gk - event.gkQuota) + Math.max(0, players - event.playerQuota),
    };
  });
}

/** SELECT booking + event + rank konfirmasi (dihitung di SQL, tanpa menarik semua baris
 * peserta). Dipakai panel admin dan "pendaftaran saya". */
export const BOOKING_SELECT = `
  SELECT b.*, e.title AS event_title, e.date AS event_date, e.gk_quota, e.player_quota, e.is_closed,
    (SELECT COUNT(*) FROM fc_bookings o
      WHERE o.event_id = b.event_id AND o.position = b.position AND o.approved_at IS NOT NULL
        AND (o.approved_at < b.approved_at OR (o.approved_at = b.approved_at AND o.id <= b.id))) AS rank
  FROM fc_bookings b JOIN fc_events e ON e.id = b.event_id`;

export function toAdminBooking(row: Record<string, unknown>): FcAdminBooking {
  const position = row.position as FcPosition;
  const approvedAt = row.approved_at ? String(row.approved_at) : null;
  return {
    id: Number(row.id),
    eventId: Number(row.event_id),
    eventTitle: String(row.event_title),
    eventDate: String(row.event_date),
    name: String(row.name),
    phone: String(row.phone),
    position,
    isPaid: Boolean(row.is_paid),
    approvedAt,
    status: bookingStatus(
      approvedAt,
      Number(row.rank),
      { gkQuota: Number(row.gk_quota), playerQuota: Number(row.player_quota) },
      position,
    ),
    createdAt: String(row.created_at),
  };
}

export async function readFcContent(db: Client): Promise<FcContent> {
  const result = await db.execute("SELECT value FROM fc_settings WHERE key = 'content'");
  const raw = result.rows[0]?.value;
  if (!raw) return FC_DEFAULT_CONTENT;
  try {
    return { ...FC_DEFAULT_CONTENT, ...JSON.parse(String(raw)) };
  } catch {
    return FC_DEFAULT_CONTENT;
  }
}

function parseLinks(value: unknown): FcLink[] {
  if (!Array.isArray(value)) throw new Error("links_invalid");
  if (value.length > 20) throw new Error("links_too_long");
  return value.map((item) => {
    const url = optionalHttpsUrl(item?.url, "linkUrl", [...DRIVE_HOSTS, ...YOUTUBE_HOSTS]);
    if (!url) throw new Error("linkUrl_required");
    return { title: requireString(item?.title, "linkTitle", { max: 100 }), url };
  });
}

/** Semua field teks dikirim lengkap oleh form admin (bukan partial update). */
export function parseContentInput(body: Record<string, unknown>): FcContent {
  const text = (key: keyof FcContent, max: number, required = false) =>
    required ? requireString(body[key], key, { max }) : optionalString(body[key], key, max);
  return {
    brand: text("brand", 60, true),
    tagline: text("tagline", 80),
    eyebrow: text("eyebrow", 100),
    title: text("title", 140, true),
    subtitle: text("subtitle", 250),
    season: text("season", 40),
    motto: text("motto", 100),
    aboutTitle: text("aboutTitle", 140, true),
    aboutSubtitle: text("aboutSubtitle", 150),
    about: text("about", 3000),
    joinSteps: text("joinSteps", 1000),
    joinClosing: text("joinClosing", 500),
    historyTitle: text("historyTitle", 140, true),
    historySubtitle: text("historySubtitle", 250),
    linksTitle: text("linksTitle", 80),
    links: parseLinks(body.links ?? []),
    footer: text("footer", 150),
  };
}

// --- Kode member -------------------------------------------------------------
// Satu orang = satu kode permanen, dibuat SERVER (bukan dipilih pendaftar) dan hanya
// ditampilkan sekali, seperti kode konfirmasi donasi. Kode itu satu-satunya kredensial:
// dipakai untuk (a) mendaftar lagi tanpa mengisi data, (b) melihat/membatalkan pendaftaran
// dari perangkat lain. 8 karakter dari 32 huruf/angka ≈ 1,1 triliun kemungkinan.
//
// Di DB hanya tersimpan HMAC-SHA256(kode, FC_CODE_SECRET) di kolom ber-index UNIQUE, supaya
// pencarian cukup satu query (hash scrypt ber-salt tidak bisa dicari langsung — server harus
// memverifikasi ke semua baris, mahal di CPU). Kuncinya rahasia server, jadi kebocoran DB
// saja tidak cukup untuk menebak kode secara offline. JANGAN ganti FC_CODE_SECRET setelah
// ada member: semua kode yang sudah dibagikan langsung tidak berlaku.
// Percobaan tebak dibatasi per IP (fc_pin_attempts) — lihat handleCari/handleDaftar di fc.mts.

// Tanpa karakter yang mirip (0/O, 1/I) supaya mudah dibacakan lewat WhatsApp.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Kode tampilan, mis. "SFC-AB3K-9XQ7". Memakai crypto.randomInt (bukan Math.random):
 * kode ini adalah kredensial, jadi harus tak dapat ditebak. */
export function generateMemberCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `SFC-${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Menerima "SFC-AB3K-9XQ7", "sfc ab3k 9xq7", "ab3k9xq7" -> "AB3K9XQ7"; selain itu melempar code_invalid. */
export function parseCode(value: unknown): string {
  let code = typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (code.length === 11 && code.startsWith("SFC")) code = code.slice(3);
  if (code.length !== 8 || [...code].some((c) => !CODE_ALPHABET.includes(c))) throw new Error("code_invalid");
  return code;
}

/** Nilai yang disimpan/dicari di fc_members.code_lookup. Argumen = hasil parseCode(). */
export function codeLookupHash(code: string): string {
  const secret = process.env.FC_CODE_SECRET;
  if (!secret) throw new Error("FC_CODE_SECRET not configured");
  return createHmac("sha256", secret).update(code).digest("hex");
}
