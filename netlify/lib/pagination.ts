export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function parsePageParams(url: URL, defaultPageSize = DEFAULT_PAGE_SIZE): PageParams {
  const page = Math.max(1, Math.trunc(Number(url.searchParams.get("page"))) || 1);
  const rawPageSize = Math.trunc(Number(url.searchParams.get("pageSize"))) || defaultPageSize;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginatedResponse<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** A `to` date filter is inclusive of the whole day. Timestamps are stored as ISO
 * strings and compared lexicographically, so a bare "YYYY-MM-DD" value needs padding
 * out to the end of that day or it excludes everything after midnight on that date. */
export function endOfDayIfDateOnly(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59.999Z` : value;
}

export interface DateRangeFilter {
  from: string | null;
  to: string | null;
}

export function parseDateRange(url: URL): DateRangeFilter {
  return {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  };
}
