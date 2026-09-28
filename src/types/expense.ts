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
  totalIn: number;
  totalOut: number;
  balance: number;
  expenses: Expense[];
}
