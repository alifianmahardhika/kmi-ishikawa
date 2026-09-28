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
