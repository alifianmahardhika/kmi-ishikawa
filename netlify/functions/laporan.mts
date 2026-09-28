import { getDb } from "../lib/db";
import { cacheGet, cacheSet, cacheKeys } from "../lib/cache";
import { parsePageParams, paginatedResponse } from "../lib/pagination";
import { badRequest, json, methodNotAllowed } from "../lib/respond";
import type { Expense, LaporanSummary } from "../../src/types/expense";

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: Number(row.id),
    campaignId: String(row.campaign_id),
    title: String(row.title),
    category: String(row.category),
    amount: Number(row.amount),
    spentOn: String(row.spent_on),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at),
  };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");
  if (!campaignId) return badRequest("campaign_required");

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const { page, pageSize, offset } = parsePageParams(url);

  // Only the default (page 1, no date filter) view is cacheable — same reasoning as
  // kegiatan.mts: avoids a per-params cache key for the rare filtered/paginated case.
  // totalIn/totalOut/balance are always all-time aggregates regardless of the filter,
  // so they're outside this cacheable/not split anyway — only `expenses` varies.
  const cacheable = page === 1 && !from && !to;
  const cacheKey = cacheKeys.laporan(campaignId);
  if (cacheable) {
    const cached = cacheGet<LaporanSummary>(cacheKey);
    if (cached) return json(cached);
  }

  const db = getDb();

  const inRow = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) as total FROM donations WHERE campaign_id = ? AND status = 'verified'",
    args: [campaignId],
  });
  const totalIn = Number(inRow.rows[0]?.total ?? 0);

  const outRow = await db.execute({
    sql: "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE campaign_id = ?",
    args: [campaignId],
  });
  const totalOut = Number(outRow.rows[0]?.total ?? 0);

  // spent_on is stored as a plain YYYY-MM-DD date, so from/to compare directly —
  // unlike timestamp columns, it never needs end-of-day padding for an inclusive `to`.
  const conditions = ["campaign_id = ?"];
  const args: (string | number)[] = [campaignId];
  if (from) {
    conditions.push("spent_on >= ?");
    args.push(from);
  }
  if (to) {
    conditions.push("spent_on <= ?");
    args.push(to);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as n FROM expenses ${where}`, args });
  const expenseTotal = Number(countResult.rows[0]?.n ?? 0);

  const result = await db.execute({
    sql: `SELECT * FROM expenses ${where} ORDER BY spent_on DESC, id DESC LIMIT ? OFFSET ?`,
    args: [...args, pageSize, offset],
  });
  const items = result.rows.map((row) => toExpense(row as Record<string, unknown>));

  const summary: LaporanSummary = {
    campaignId,
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
    expenses: paginatedResponse(items, expenseTotal, page, pageSize),
  };

  if (cacheable) cacheSet(cacheKey, summary);
  return json(summary);
}
