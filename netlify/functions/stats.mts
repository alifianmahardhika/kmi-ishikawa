import { getDb } from "../lib/db";
import { currentMonthRange } from "../lib/month";
import { cacheGet, cacheSet, cacheKeys } from "../lib/cache";
import { badRequest, json, methodNotAllowed } from "../lib/respond";
import type { DonationStats, PublicDonor } from "../../src/types/donation";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");
  if (!campaignId) return badRequest("campaign_required");

  const cacheKey = cacheKeys.stats(campaignId);
  const cached = cacheGet<DonationStats>(cacheKey);
  if (cached) return json(cached);

  const db = getDb();
  const { month, start, end } = currentMonthRange();

  const campaign = await db.execute({
    sql: "SELECT target_amount FROM campaigns WHERE id = ?",
    args: [campaignId],
  });
  const target = Number(campaign.rows[0]?.target_amount ?? 0);

  // Progress resets every month — only donations verified within the current
  // calendar month count toward `collected`/`donorCount`/`recentDonors`.
  const monthTotals = await db.execute({
    sql: `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM donations
          WHERE campaign_id = ? AND status = 'verified' AND created_at >= ? AND created_at < ?`,
    args: [campaignId, start, end],
  });
  const collected = Number(monthTotals.rows[0]?.total ?? 0);
  const donorCount = Number(monthTotals.rows[0]?.count ?? 0);

  const recent = await db.execute({
    sql: `SELECT donor_name, is_anonymous, amount, message, created_at FROM donations
          WHERE campaign_id = ? AND status = 'verified' AND created_at >= ? AND created_at < ?
          ORDER BY created_at DESC LIMIT 20`,
    args: [campaignId, start, end],
  });
  const recentDonors: PublicDonor[] = recent.rows.map((row) => ({
    name: Number(row.is_anonymous) ? "Hamba Allah" : String(row.donor_name),
    amount: Number(row.amount),
    message: String(row.message ?? ""),
    createdAt: String(row.created_at),
  }));

  const allTime = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE campaign_id = ? AND status = 'verified'",
    args: [campaignId],
  });
  const allTimeCollected = Number(allTime.rows[0]?.total ?? 0);

  const stats: DonationStats = {
    campaignId,
    month,
    target,
    collected,
    donorCount,
    recentDonors,
    allTimeCollected,
  };
  cacheSet(cacheKey, stats);
  return json(stats);
}
