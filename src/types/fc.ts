export type FcPosition = "PLAYER" | "GK";

/** pending = belum dikonfirmasi admin; confirmed = dapat slot; waiting = sudah
 * dikonfirmasi tapi kuota posisinya penuh (urut berdasar waktu konfirmasi). */
export type FcBookingStatus = "pending" | "confirmed" | "waiting";

export interface FcEventInput {
  title: string;
  date: string; // YYYY-MM-DD (JST)
  time: string;
  venue: string;
  mapUrl: string;
  gkQuota: number;
  playerQuota: number;
  fee: number; // ¥
  gkFee: number; // ¥
  notes: string;
  driveUrl: string;
  youtubeUrl: string;
}

export interface FcEvent extends FcEventInput {
  id: number;
  isClosed: boolean;
  createdAt: string;
}

/** Event + hitungan slot terkonfirmasi — bentuk yang dilihat publik (tanpa data peserta). */
export interface FcPublicEvent extends FcEvent {
  confirmedGk: number;
  confirmedPlayers: number;
  waiting: number;
}

export interface FcLink {
  title: string;
  url: string;
}

export interface FcContent {
  brand: string;
  tagline: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  season: string;
  motto: string;
  aboutTitle: string;
  aboutSubtitle: string;
  about: string;
  joinSteps: string; // satu langkah per baris
  joinClosing: string;
  historyTitle: string;
  historySubtitle: string;
  linksTitle: string;
  links: FcLink[];
  footer: string;
}

export interface FcPublicData {
  content: FcContent;
  events: FcPublicEvent[];
  /** Tanggal hari ini di JST (YYYY-MM-DD) menurut server — dipakai untuk memisah jadwal vs riwayat. */
  today: string;
}

/** Pendaftar baru: name+phone. Member lama: memberCode saja (nama/nomor diambil server). */
export interface FcBookingInput {
  eventId: number;
  position: FcPosition;
  name?: string;
  phone?: string;
  memberCode?: string;
  website?: string; // honeypot
}

export interface FcBookingCreateResponse {
  token: string;
  /** Kode member ("SFC-XXXX-XXXX") — hanya ada untuk pendaftar BARU, dikirim sekali, tidak bisa dilihat ulang. */
  code: string | null;
  name: string;
}

export interface FcMyBooking {
  token: string;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  position: FcPosition;
  isPaid: boolean;
  status: FcBookingStatus;
  canCancel: boolean;
}

/** Baris pendaftaran di panel admin — termasuk nomor HP. */
export interface FcAdminBooking {
  id: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  name: string;
  phone: string;
  position: FcPosition;
  isPaid: boolean;
  approvedAt: string | null;
  status: FcBookingStatus;
  createdAt: string;
}

/** Masuk dari perangkat lain dengan kode member. */
export interface FcLookupInput {
  code: string;
}

export interface FcLookupResponse {
  tokens: string[];
  name: string;
}
