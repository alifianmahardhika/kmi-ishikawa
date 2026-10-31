import { createHash } from "node:crypto";
import { getDb } from "./db";

/** SHA-256(ip + salt) — never store or log the raw IP. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_SALT ?? "";
  return createHash("sha256").update(ip + salt).digest("hex");
}

export function getClientIp(req: Request, context: { ip?: string }): string {
  // Netlify's context.ip is the trusted source; header fallback for local `netlify dev`.
  return context.ip ?? req.headers.get("x-nf-client-connection-ip") ?? "unknown";
}

/**
 * Simple fixed-window limiter backed by the donations table itself (no extra table):
 * counts rows with this ip_hash created within `windowMs`. Good enough for a low-traffic
 * community donation form — not meant to withstand a distributed attacker.
 */
export async function isRateLimited(
  ipHash: string,
  opts: { maxPerWindow: number; windowMs: number },
): Promise<boolean> {
  const db = getDb();
  const since = new Date(Date.now() - opts.windowMs).toISOString();
  const result = await db.execute({
    sql: "SELECT COUNT(*) as count FROM donations WHERE ip_hash = ? AND created_at > ?",
    args: [ipHash, since],
  });
  const count = Number(result.rows[0]?.count ?? 0);
  return count >= opts.maxPerWindow;
}

// --- Limiter di memori -------------------------------------------------------
// Untuk endpoint BACA publik dan aksi ringan: tanpa query DB sama sekali (limiter
// berbasis tabel justru menambah beban Turso). Sama seperti netlify/lib/cache.ts, ini
// per instance function — penyerang yang mendarat di instance lain dapat jatah baru.
// Cukup untuk meredam beban dan spam sembarangan; BUKAN pagar ketat. Untuk yang butuh
// ketat (login admin, PIN) pakai tabel — lihat admin.mts handleLogin / fc.mts handleCari.
interface Window {
  times: number[];
  windowMs: number;
}
const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 5000;

/** Jatah baca-DB publik per IP per menit (hanya jalur cache-miss/berparameter). */
export const PUBLIC_DB_READS_PER_MINUTE = 30;

/** true = permintaan ini melewati batas (dan TIDAK dihitung lagi). Tiap pemanggilan
 * yang lolos dihitung, jadi cocok sebagai pembatas laju request biasa. */
export function memoryRateLimited(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = windows.get(key) ?? { times: [], windowMs };
  entry.times = entry.times.filter((t) => now - t < windowMs);
  if (entry.times.length >= maxPerWindow) {
    windows.set(key, entry);
    return true;
  }
  entry.times.push(now);
  windows.set(key, entry);

  if (windows.size > MAX_TRACKED_KEYS) {
    for (const [k, w] of windows) {
      if (now - (w.times[w.times.length - 1] ?? 0) >= w.windowMs) windows.delete(k);
    }
    // Masih penuh (banyak IP aktif sekaligus): buang semuanya daripada memori tumbuh terus.
    if (windows.size > MAX_TRACKED_KEYS) windows.clear();
  }
  return false;
}
