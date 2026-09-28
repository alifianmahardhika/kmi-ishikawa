export const CONTACT = {
  orgName: "KMII Ishikawa",
  orgFullName: "Keluarga Muslim Indonesia Ishikawa",
  tagline: "Perkuat Ukhuwah, Nikmati Indahnya Islam",
  address: "Ishikawa, Jepang",
  // Approximate coordinates for Kanazawa, Ishikawa — used for prayer time calculation.
  lat: 36.5549,
  lon: 136.6956,
  whatsappCommunity: "https://chat.whatsapp.com/FFyOi9ydqHg6cLNzFr0MIV",
  // Bendahara's WhatsApp + bank account details live in the DB now (src/types/settings.ts,
  // fetched via /api/settings) — editable from /admin/pengaturan without a redeploy.
  instagram: "https://www.instagram.com/kmiishikawa.jp",
  mapsEmbedUrl: "", // TODO: fill once the musala/meeting point address is confirmed
} as const;

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
