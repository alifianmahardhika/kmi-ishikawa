# KMII Ishikawa

Situs komunitas KMII Ishikawa (Keluarga Muslim Indonesia Ishikawa): landing page,
jadwal sholat & kegiatan, donasi bulanan untuk nafkah Imam (transfer manual dengan kode
konfirmasi, target & progress reset tiap bulan), laporan keuangan transparan, dan panel
admin (`/admin/login`, tautan ada di footer).

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
APP_ENV=dev bun run migrate   # buat local.db + seed campaign (selalu jalan, --force)
bun run dev                   # netlify dev — jalankan Vite + /api/* sekaligus
```

Untuk kerja UI saja tanpa menyentuh `/api/*`: `bun run dev:vite`.

## Struktur

```
netlify/functions/   Endpoint API (lihat komentar tiap file untuk skema routing)
netlify/lib/         Kode bersama: db, auth, captcha, validasi, rate limit, bulan berjalan
scripts/migrate-db.ts  Migrasi bernomor versi — lihat bagian "Migrasi" di bawah
src/types/           Tipe data dipakai bersama klien & function
src/pages/            Halaman publik + src/pages/admin untuk panel admin
src/config/           contact.ts, rekening.ts, campaign.ts (id campaign default)
```

## Migrasi

`scripts/migrate-db.ts` **tidak** jalan otomatis begitu saja saat build — ini sengaja
digate di belakang `RUN_MIGRATIONS` supaya tidak menambah satu round-trip ke Turso di
setiap deploy kalau tidak ada perubahan schema:

```bash
bun run migrate                        # manual, di shell mana pun (selalu jalan, --force)
RUN_MIGRATIONS=true bun run build       # auto, dipakai saat deploy yang butuh migrasi baru
```

Di Netlify: set `RUN_MIGRATIONS=true` di env vars sebelum deploy yang menambah migrasi
baru, lalu **unset lagi** setelah deploy itu selesai supaya tidak query Turso terus-menerus
di setiap deploy berikutnya. Migrasi aman dijalankan berkali-kali (idempoten, dilacak per
versi di tabel `schema_migrations`).

## Donasi bulanan

Target & progress (`/api/stats`) dihitung ulang setiap bulan kalender (UTC) — donasi
`verified` bulan lalu tidak ikut terhitung di progress bar bulan ini, tapi tetap
terhitung di `allTimeCollected` (laporan) dan di tabel `expenses` untuk pencatatan
penyaluran. Admin bisa mengubah nominal target lewat form di `/admin` (Dashboard),
yang memanggil `PATCH /api/admin/campaign`.

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
