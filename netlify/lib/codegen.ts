// Excludes visually ambiguous characters (0/O, 1/I) so donors can read the code back
// correctly over WhatsApp.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateDonationCode(): string {
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `KMII-${suffix}`;
}
