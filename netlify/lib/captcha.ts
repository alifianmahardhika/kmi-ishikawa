/**
 * Server-verified math captcha.
 *
 * kanazawa-masjid's captcha (src/utils/captcha.js) only ever checked the answer in the
 * browser — the API endpoint itself had no idea a captcha existed, so it could be
 * bypassed entirely with curl. Here the challenge is signed: the token the client gets
 * back encodes "a+b=<answer>" plus an HMAC over (a, b, expiry), so a submission is only
 * accepted if it carries a token this server issued, unexpired, with the right answer.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 10 * 60 * 1000; // 10 minutes to solve

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export interface CaptchaChallenge {
  question: string; // "7 + 4"
  token: string; // "<a>.<b>.<expiresAt>.<sig>"
}

export function createCaptcha(): CaptchaChallenge {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${a}.${b}.${expiresAt}`;
  const token = `${payload}.${sign(payload)}`;
  return { question: `${a} + ${b}`, token };
}

export function verifyCaptcha(token: string, answer: number): boolean {
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [aStr, bStr, expStr, sig] = parts;
  const payload = `${aStr}.${bStr}.${expStr}`;
  const expected = sign(payload);

  const sigBuf = Buffer.from(sig ?? "", "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;

  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const a = Number(aStr);
  const b = Number(bStr);
  return answer === a + b;
}
