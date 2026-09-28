import type { ApiError } from "../../src/types/api";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });
}

export function errorResponse(status: number, error: string, message?: string): Response {
  const body: ApiError = { error, message };
  return json(body, { status });
}

export const badRequest = (error: string, message?: string) => errorResponse(400, error, message);
export const unauthorized = (error = "unauthorized") => errorResponse(401, error);
export const notFound = (error = "not_found") => errorResponse(404, error);
export const methodNotAllowed = () => errorResponse(405, "method_not_allowed");
export const tooManyRequests = () => errorResponse(429, "too_many_requests");
export const serverError = (message?: string) => errorResponse(500, "server_error", message);
