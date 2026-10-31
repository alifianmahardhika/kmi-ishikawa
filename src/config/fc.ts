import type { FcContent } from "../types/fc";

/** Teks bawaan halaman Silaturahmi FC. Dipakai sebagai fallback/merge di
 * netlify/lib/fc.ts selama admin belum menyimpan perubahan di tabel `fc_settings`. */
export const FC_DEFAULT_CONTENT: FcContent = {
  brand: "SILATURAHMI FC",
  tagline: "FOOTBALL & BROTHERHOOD",
  eyebrow: "SILATURAHMI FC · KANAZAWA, JAPAN",
  title: "NGAJI OKE, MAEN BOLA OKE",
  subtitle: "Pilih jadwal, amankan tempatmu, dan mari kajian bersama.",
  season: "2026 / 27",
  motto: "NGAJI BARENG, DISKUSI BARENG, MAEN BOLA BARENG",
  aboutTitle: "Tentang Silaturahmi FC",
  aboutSubtitle: "Komunitas sepak bola dan silaturahmi",
  about: `Silaturahmi FC powered by KMI Ishikawa adalah sebuah komunitas yang bertujuan untuk membuat kebiasaan baru.
Masjid adalah awal peradaban manusia dimulai.
Dari masjid kita dapat berdiskusi, mendapat ilmu pengetahuan dan bermain bersama melalui media sepak bola.
Karena kami pengurus percaya, bertumbuhnya warga negara asing khususnya muslim di Jepang, adalah sesuatu hal yang harus dipertanggungjawabkan nanti.
Bagaimana kami bisa berkontribusi terhadap sesama muslim.
Kajian ga ada yang se-have fun ini selain di Silaturahmi FC !`,
  joinSteps: `Pilih jadwal pertandingan yang ingin diikuti.
Isi nama, nomor HP, dan posisi bermain.
Tunggu konfirmasi dari pengurus.
Have fun football !!!`,
  joinClosing: "Mari bermain, menjaga sportivitas, dan mempererat silaturahmi.",
  historyTitle: "Riwayat pertandingan",
  historySubtitle: "Dokumentasi kegiatan yang telah berlangsung.",
  linksTitle: "Dokumentasi & tautan",
  links: [],
  footer: "Kanazawa, Japan · Est. together.",
};
