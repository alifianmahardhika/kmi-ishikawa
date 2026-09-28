import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SiteSettings } from "../types/settings";

/** Fetches rekening + WhatsApp bendahara from /api/settings — these are admin-editable
 * (src/pages/admin/Pengaturan.tsx) and no longer hardcoded in src/config. */
export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    api.get<SiteSettings>("/api/settings").then(setSettings).catch(() => setSettings(null));
  }, []);

  return settings;
}
