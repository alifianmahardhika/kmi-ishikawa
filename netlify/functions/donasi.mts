import { getDb } from "../lib/db";
import { verifyCaptcha } from "../lib/captcha";
import { getClientIp, hashIp, isRateLimited } from "../lib/ratelimit";
import { generateDonationCode } from "../lib/codegen";
import { badRequest, json, methodNotAllowed, tooManyRequests } from "../lib/respond";
import { optionalString, requireBoolean, requireInt, requireString } from "../lib/validate";
import type { FunctionContext } from "../lib/types";
import type { DonationCreateInput, DonationCreateResponse } from "../../src/types/donation";

const MAX_PER_HOUR = 5;

export default async function handler(req: Request, context: FunctionContext): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed();

  let body: Partial<DonationCreateInput>;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid_json");
  }

  // Honeypot: real visitors never see or fill this field. Bots that fill every input
  // trip it. We respond as if the donation succeeded (so scrapers don't learn to detect
  // and skip the field) but never touch the database.
  if (body.website) {
    return json({ code: generateDonationCode() } satisfies DonationCreateResponse);
  }

  const ip = getClientIp(req, context);
  const ipHash = hashIp(ip);

  try {
    if (await isRateLimited(ipHash, { maxPerWindow: MAX_PER_HOUR, windowMs: 60 * 60 * 1000 })) {
      return tooManyRequests();
    }

    const campaignId = requireString(body.campaignId, "campaignId", { max: 100 });
    const isAnonymous = requireBoolean(body.isAnonymous, "isAnonymous");
    const donorName = isAnonymous
      ? "Hamba Allah"
      : requireString(body.donorName, "donorName", { max: 120 });
    const amount = requireInt(body.amount, "amount", { min: 500, max: 5_000_000 });
    const message = optionalString(body.message, "message", 500);
    const contact = optionalString(body.contact, "contact", 200);

    if (typeof body.captchaToken !== "string" || typeof body.captchaAnswer !== "number") {
      return badRequest("captcha_invalid");
    }
    if (!verifyCaptcha(body.captchaToken, body.captchaAnswer)) {
      return badRequest("captcha_invalid");
    }

    const db = getDb();
    const campaign = await db.execute({
      sql: "SELECT id FROM campaigns WHERE id = ? AND is_active = 1",
      args: [campaignId],
    });
    if (campaign.rows.length === 0) return badRequest("campaign_not_found");

    // Retry on the (rare) code collision instead of failing the donor's submission.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateDonationCode();
      try {
        await db.execute({
          sql: `INSERT INTO donations
                (code, campaign_id, donor_name, is_anonymous, amount, message, contact, status, created_at, ip_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
          args: [
            code,
            campaignId,
            donorName,
            isAnonymous ? 1 : 0,
            amount,
            message,
            contact,
            new Date().toISOString(),
            ipHash,
          ],
        });
        return json({ code } satisfies DonationCreateResponse);
      } catch (err) {
        if (attempt === 4) throw err;
        // unique constraint on `code` — loop and try a new one
      }
    }
    return badRequest("could_not_generate_code");
  } catch (err) {
    if (err instanceof Error) return badRequest(err.message);
    return badRequest("invalid_input");
  }
}
