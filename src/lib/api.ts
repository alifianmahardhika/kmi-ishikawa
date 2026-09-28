import type { ApiError } from "../types/api";

export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let body: ApiError = { error: "unknown_error" };
    try {
      body = await res.json();
    } catch {
      // non-JSON error body, keep default
    }
    throw new ApiRequestError(res.status, body.error, body.message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Builds a query string, skipping empty/undefined values — e.g.
 * buildQuery({status: "pending", from: "", page: 2}) -> "?status=pending&page=2" */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
