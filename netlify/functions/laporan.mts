import { getDb } from "../lib/db";
import { badRequest, json, methodNotAllowed } from "../lib/respond";
import type { Expense, LaporanSummary } from "../../src/types/expense";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");
  if (!campaignId) return badRequest("campaign_required");

  const db = getDb();

  const inRow = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE campaign_id = ? AND status = 'verified'",
    args: [campaignId],
  });
  const totalIn = Number(inRow.rows[0]?.total ?? 0);

  const expensesResult = await db.execute({
    sql: "SELECT * FROM expenses WHERE campaign_id = ? ORDER BY spent_on DESC, id DESC",
    args: [campaignId],
  });
  const expenses: Expense[] = expensesResult.rows.map((row) => ({
    id: Number(row.id),
    campaignId: String(row.campaign_id),
    title: String(row.title),
    category: String(row.category),
    amount: Number(row.amount),
    spentOn: String(row.spent_on),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at),
  }));
  const totalOut = expenses.reduce((sum, e) => sum + e.amount, 0);

  const summary: LaporanSummary = { campaignId, totalIn, totalOut, balance: totalIn - totalOut, expenses };
  return json(summary);
}
