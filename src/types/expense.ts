import type { Paginated } from "./api";

export interface Expense {
  id: number;
  campaignId: string;
  title: string;
  category: string;
  amount: number; // yen, integer
  spentOn: string; // ISO date
  note: string;
  createdAt: string;
}

export type ExpenseCreateInput = Omit<Expense, "id" | "createdAt">;

export interface LaporanSummary {
  campaignId: string;
  /** All-time totals — unaffected by any from/to filter on `expenses` below. */
  totalIn: number;
  totalOut: number;
  balance: number;
  /** Paginated, optionally filtered by from/to (spent_on). */
  expenses: Paginated<Expense>;
}
