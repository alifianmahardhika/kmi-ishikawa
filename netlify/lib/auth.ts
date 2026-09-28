/**
 * Admin session: a signed, expiring cookie — no session table, no JWT library.
 * Cookie value: "<expiresAt>.<sig>" where sig = HMAC-SHA256(SESSION_SECRET, expiresAt).
 * There's only one admin account (the treasurer/committee share ADMIN_PASSWORD_HASH),
 * so the cookie doesn't need to carry a user id — its validity IS the authorization.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "kmi_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionCookie(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const value = `${expiresAt}.${sign(String(expiresAt))}`;
  const isProd = process.env.APP_ENV !== "dev";
  const attrs = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (isProd) attrs.push("Secure");
  return attrs.join("; ");
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function isAuthenticated(req: Request): boolean {
  const cookies = parseCookies(req.headers.get("cookie"));
  const value = cookies[COOKIE_NAME];
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const expected = sign(expStr ?? "");

  const sigBuf = Buffer.from(sig ?? "", "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

  const expiresAt = Number(expStr);
  return Number.isFinite(expiresAt) && Date.now() <= expiresAt;
}

const SCRYPT_KEY_LEN = 64;

/** Generates a "<saltHex>:<hashHex>" string for ADMIN_PASSWORD_HASH. Used by
 * scripts/hash-password.ts — not called at request time. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(plain, salt, SCRYPT_KEY_LEN);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

// node:crypto scrypt, not Bun.password: Netlify Functions run on Node in production
// (even though we build/dev with Bun), so a Bun-only API would work locally and then
// throw "Bun is not defined" the moment it actually deploys.
export async function verifyPassword(plain: string): Promise<boolean> {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) throw new Error("ADMIN_PASSWORD_HASH not configured");

  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) throw new Error("ADMIN_PASSWORD_HASH malformed");

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = scryptSync(plain, salt, expected.length);

  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
