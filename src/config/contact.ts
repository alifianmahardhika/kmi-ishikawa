export const CONTACT = {
  orgName: "KMII Ishikawa",
  orgFullName: "Keluarga Muslim Indonesia Ishikawa",
  tagline: "Perkuat Ukhuwah, Nikmati Indahnya Islam",
  address: "Ishikawa, Jepang",
  // Approximate coordinates for Kanazawa, Ishikawa — used for prayer time calculation.
  lat: 36.5549,
  lon: 136.6956,
  whatsappCommunity: "https://chat.whatsapp.com/", // TODO: replace with real invite link
  whatsappTreasurer: {
    name: "Bendahara KMII",
    // TODO: replace with the real treasurer's WhatsApp number (E.164, no leading +)
    phone: "81000000000",
  },
  instagram: "https://instagram.com/kmiishikawa", // TODO: replace with real handle
  mapsEmbedUrl: "", // TODO: fill once the musala/meeting point address is confirmed
} as const;

export function whatsappLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
