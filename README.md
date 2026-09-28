# KMII Ishikawa

Situs komunitas KMII Ishikawa (Keluarga Muslim Indonesia Ishikawa): landing page,
jadwal sholat & kegiatan, sistem donasi transfer manual dengan kode konfirmasi, laporan
keuangan transparan, dan panel admin.

## Stack

- **Runtime/PM:** [Bun](https://bun.sh)
- **Build:** Vite 5 (SPA) + React 19 + React Router 7
- **Styling:** Tailwind CSS v4 (token di `src/index.css`, tema terang/gelap ikut `prefers-color-scheme` + toggle manual)
- **DB:** SQLite via [Turso](https://turso.tech) / libSQL, SQL mentah tanpa ORM
- **Backend:** Netlify Functions

## Setup

> **Catatan Windows/Node 24:** `netlify dev` (dipakai untuk menjalankan `/api/*` secara
> lokal) mengalami *segmentation fault* di Node 24 saat menangani rute bersegmen seperti
> `/api/kegiatan/:slug` — ini bug kompatibilitas `netlify-cli`, bukan kode di repo ini
> (sudah diverifikasi: memanggil handler function secara langsung selalu memberi hasil
> benar). Proyek ini menyertakan `.node-version` (Node 22) — kalau memakai
> [fnm](https://github.com/Schniz/fnm)/nvm, jalankan `fnm use` (atau `nvm use`) di root
> proyek sebelum `bun run dev` agar `netlify dev` memakai Node 22, bukan Node 24.

```bash
bun install
cp .env.example .env
bun scripts/hash-password.ts 'password-anda'   # isi hasilnya ke ADMIN_PASSWORD_HASH di .env
# isi juga SESSION_SECRET & IP_SALT (string acak apa saja, lihat komentar di .env.example)
APP_ENV=dev bun run migrate   # buat local.db + seed campaign
bun run dev                   # netlify dev — jalankan Vite + /api/* sekaligus
```

Untuk kerja UI saja tanpa menyentuh `/api/*`: `bun run dev:vite`.

## Struktur

```
netlify/functions/   Endpoint API (lihat komentar tiap file untuk skema routing)
netlify/lib/         Kode bersama: db, auth, captcha, validasi, rate limit
scripts/migrate-db.ts  Migrasi bernomor versi, selalu jalan saat build
src/types/           Tipe data dipakai bersama klien & function
src/pages/            Halaman publik + src/pages/admin untuk panel admin
src/config/           contact.ts (kontak & koordinat), rekening.ts (info transfer)
```

## Deploy (Netlify)

1. Buat database Turso: `turso db create kmii-ishikawa` lalu `turso db tokens create kmii-ishikawa`.
2. Di Netlify, set env: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_PASSWORD_HASH`,
   `SESSION_SECRET`, `IP_SALT`. **Jangan** set `APP_ENV` di produksi (biarkan kosong —
   itu yang membedakan ke Turso vs `local.db`).
3. Push — `netlify.toml` menjalankan `bun run build` (migrate → typecheck → vite build)
   dan mem-publish `dist/`.

## Keamanan

- Tidak ada rahasia di bundle klien — semua `TURSO_*`/`SESSION_SECRET`/`ADMIN_PASSWORD_HASH`
  hanya dibaca di `netlify/functions`.
- Form donasi publik dilindungi honeypot + captcha matematika bertanda tangan server
  (bukan hanya validasi di browser) + rate limit per IP (di-hash, IP asli tidak disimpan).
- Sesi admin: cookie `HttpOnly; SameSite=Strict` ditandatangani HMAC, tanpa tabel sesi.

## Desain

Warna & wordmark mengikuti `Design-System.md` (badge KMII) — `kmii-green #1b7717`,
`ink #0c1014`, `on-green #ffffff`. Tema terang diturunkan dari token yang sama karena
sumber hanya mendokumentasikan satu tema (gelap). Ganti token di `src/index.css`
begitu ada panduan brand yang lebih lengkap.
