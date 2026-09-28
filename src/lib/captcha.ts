/** Simple client-side math captcha — same idea as kanazawa-masjid's src/utils/captcha.js.
 * Not server-verified: donations still require manual admin verification via the
 * confirmation code before they count toward anything public, so this only needs to
 * deter naive bots from spamming the pending queue, not hold a hard security boundary.
 * (Honeypot + per-IP rate limiting in netlify/functions/donasi.mts do the server-side
 * anti-spam work.) */
export interface CaptchaChallenge {
  question: string;
  answer: number;
}

export function generateCaptcha(): CaptchaChallenge {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `${a} + ${b}`, answer: a + b };
}
