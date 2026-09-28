import { getDb } from "../lib/db";
import { badRequest, json, methodNotAllowed } from "../lib/respond";
import type { DonationStats, PublicDonor } from "../../src/types/donation";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");
  if (!campaignId) return badRequest("campaign_required");

  const db = getDb();
  const campaign = await db.execute({
    sql: "SELECT target_amount FROM campaigns WHERE id = ?",
    args: [campaignId],
  });
  const target = Number(campaign.rows[0]?.target_amount ?? 0);

  const totals = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM donations WHERE campaign_id = ? AND status = 'verified'",
    args: [campaignId],
  });
  const collected = Number(totals.rows[0]?.total ?? 0);
  const donorCount = Number(totals.rows[0]?.count ?? 0);

  const recent = await db.execute({
    sql: `SELECT donor_name, is_anonymous, amount, message, created_at FROM donations
          WHERE campaign_id = ? AND status = 'verified'
          ORDER BY created_at DESC LIMIT 20`,
    args: [campaignId],
  });
  const recentDonors: PublicDonor[] = recent.rows.map((row) => ({
    name: Number(row.is_anonymous) ? "Hamba Allah" : String(row.donor_name),
    amount: Number(row.amount),
    message: String(row.message ?? ""),
    createdAt: String(row.created_at),
  }));

  const stats: DonationStats = { campaignId, target, collected, donorCount, recentDonors };
  return json(stats);
}
