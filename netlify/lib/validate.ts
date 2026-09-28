/** Small hand-rolled validators — no schema library, mirrors the project's "no ORM,
 * no form library" minimalism. Every function throws a plain Error with a short
 * machine-readable message; callers turn that into a 400 via respond.badRequest. */

export function requireString(value: unknown, field: string, opts: { max?: number; min?: number } = {}): string {
  if (typeof value !== "string") throw new Error(`${field}_invalid`);
  const trimmed = value.trim();
  const min = opts.min ?? 1;
  if (trimmed.length < min) throw new Error(`${field}_required`);
  if (opts.max && trimmed.length > opts.max) throw new Error(`${field}_too_long`);
  return trimmed;
}

export function optionalString(value: unknown, field: string, max = 500): string {
  if (value === undefined || value === null || value === "") return "";
  return requireString(value, field, { max, min: 0 });
}

export function requireInt(value: unknown, field: string, opts: { min?: number; max?: number } = {}): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`${field}_invalid`);
  if (opts.min !== undefined && n < opts.min) throw new Error(`${field}_too_small`);
  if (opts.max !== undefined && n > opts.max) throw new Error(`${field}_too_large`);
  return n;
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field}_invalid`);
  return value;
}
