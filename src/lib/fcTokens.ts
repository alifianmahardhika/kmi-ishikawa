// Pendaftar Silaturahmi FC tidak punya akun. Tiap pendaftaran menghasilkan token
// rahasia dari server; token disimpan di localStorage browser ini dan dikirim balik ke
// /api/fc/saya untuk melihat status. Ganti browser / hapus data situs = daftar saya
// kosong (admin tetap melihat pendaftarannya) — sama seperti catatan di halaman.
const KEY = "fc-booking-tokens";

export function readFcTokens(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

// Server menolak > 50 token per /api/fc/saya, jadi simpan 50 terbaru saja.
const MAX_TOKENS = 50;

export function writeFcTokens(tokens: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(tokens.slice(-MAX_TOKENS)));
  } catch {
    // storage diblokir — pendaftaran tetap tersimpan di server, hanya tidak muncul di "saya"
  }
}

export function addFcToken(token: string): void {
  writeFcTokens([...new Set([...readFcTokens(), token])]);
}

// Identitas member di perangkat ini: kode member + nama (untuk sapaan). Nomor HP TIDAK disimpan
// di browser. Dengan ini pendaftaran berikutnya cukup memilih posisi. Kode adalah kredensial —
// "Keluar dari perangkat ini" menghapusnya dari sini.
const MEMBER_KEY = "fc-member";

export interface FcMember {
  code: string;
  name: string;
}

export function readFcMember(): FcMember | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? "null");
    return parsed && typeof parsed.code === "string" && typeof parsed.name === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeFcMember(member: FcMember): void {
  try {
    localStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  } catch {
    // storage diblokir — pendaftaran berikutnya hanya perlu mengisi data lagi
  }
}

export function clearFcMember(): void {
  try {
    localStorage.removeItem(MEMBER_KEY);
  } catch {
    // abaikan
  }
}
