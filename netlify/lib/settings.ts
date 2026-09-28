import type { Client } from "@libsql/client";
import type { RekeningInfo, SiteSettings, WhatsappTreasurer } from "../../src/types/settings";

const DEFAULT_REKENING: RekeningInfo = {
  bankName: "",
  branchNumber: "",
  accountType: "",
  accountNumber: "",
  accountHolder: "",
};
const DEFAULT_WA: WhatsappTreasurer = { name: "Bendahara", phone: "" };

/** Reads the `settings` table's two known rows (seeded by migration v3) into a typed
 * object. Shared by netlify/functions/settings.mts (public) and admin.mts (edit form
 * prefill) so the JSON-parsing/fallback logic lives in exactly one place. */
export async function readSettings(db: Client): Promise<SiteSettings> {
  const result = await db.execute(
    "SELECT key, value FROM settings WHERE key IN ('rekening', 'whatsapp_treasurer')",
  );

  let rekening = DEFAULT_REKENING;
  let whatsappTreasurer = DEFAULT_WA;
  for (const row of result.rows) {
    if (row.key === "rekening") {
      try {
        rekening = JSON.parse(String(row.value));
      } catch {
        // keep default if the stored JSON is somehow malformed
      }
    }
    if (row.key === "whatsapp_treasurer") {
      try {
        whatsappTreasurer = JSON.parse(String(row.value));
      } catch {
        // keep default
      }
    }
  }

  return { rekening, whatsappTreasurer };
}
