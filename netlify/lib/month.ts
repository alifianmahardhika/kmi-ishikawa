/** The donation target resets every calendar month (UTC) — donors are shown progress
 * for "this month" only, not an ever-growing all-time total. */
export function currentMonthRange(): { month: string; start: string; end: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { month, start: start.toISOString(), end: end.toISOString() };
}
