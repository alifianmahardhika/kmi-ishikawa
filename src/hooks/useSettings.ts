import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SiteSettings } from "../types/settings";

/** Fetches rekening + WhatsApp bendahara from /api/settings — these are admin-editable
 * (src/pages/admin/Pengaturan.tsx) and no longer hardcoded in src/config. Distinguishes
 * "still loading" from "failed" so callers don't show an infinite loading state when
 * the request actually errored. */
export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    api
      .get<SiteSettings>("/api/settings")
      .then((data) => {
        setSettings(data);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, []);

  return { settings, status };
}
