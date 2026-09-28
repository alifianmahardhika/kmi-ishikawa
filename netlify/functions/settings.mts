import { getDb } from "../lib/db";
import { cacheGet, cacheSet, cacheKeys } from "../lib/cache";
import { readSettings } from "../lib/settings";
import { json, methodNotAllowed } from "../lib/respond";
import type { SiteSettings } from "../../src/types/settings";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") return methodNotAllowed();

  const cacheKey = cacheKeys.settings();
  const cached = cacheGet<SiteSettings>(cacheKey);
  if (cached) return json(cached);

  const settings = await readSettings(getDb());
  cacheSet(cacheKey, settings);
  return json(settings);
}
