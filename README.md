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

```bash
bun install
cp .env.example .env
bun scripts/hash-password.ts 'password-anda'   # isi hasilnya ke ADMIN_PASSWORD_HASH di .env
# isi juga SESSION_SECRET & IP_SALT (string acak apa saja, lihat komentar di .env.example)
APP_ENV=dev bun run migrate   # buat local.db + seed campaign (selalu jalan, --force)
bun run dev                   # Vite + /api/* sekaligus (lihat "Dev server" di bawah)
```

Untuk kerja UI saja tanpa menyentuh `/api/*`: `bun run dev:vite`.

## Dev server

`bun run dev` (`scripts/dev-server.ts`) **bukan** `netlify dev` — itu sengaja. `netlify-cli`
terbukti tidak andal untuk dev lokal di Windows: segfault di Node 24 untuk rute bersegmen
(`/api/kegiatan/:slug`), dan macet total tanpa error (request masuk, tidak pernah ada
respons) bahkan di Node 22 untuk request sesederhana `POST /api/donasi` — sementara
memanggil function handler-nya langsung (tanpa lewat `netlify-cli`) selalu berhasil dan
instan. Jadi `bun run dev` sekarang: `Bun.serve` sendiri untuk `/api/*` (langsung
`import()` file di `netlify/functions/`, tanpa bundler/proxy tambahan) + Vite untuk
frontend, dihubungkan lewat `server.proxy` di `vite.config.ts`.

`netlify dev` yang asli masih ada sebagai `bun run dev:netlify`, untuk sesekali cek
perilaku spesifik Netlify (redirect, edge functions) — tapi siap-siap dengan
ketidakstabilan di atas. Kalau dipakai, butuh Node 22 (`.node-version`); scriptnya
otomatis dicek lewat `predev:netlify` (`scripts/check-node-version.ts`), yang akan
menolak jalan kalau `node` di PATH bukan versi 22.x, dengan pesan cara memperbaikinya
(`fnm use` / `nvm use`).

## Struktur

```
netlify/functions/   Endpoint API (lihat komentar tiap file untuk skema routing)
netlify/lib/         Kode bersama: db, auth, captcha, validasi, rate limit, bulan berjalan
scripts/migrate-db.ts  Migrasi bernomor versi — lihat bagian "Migrasi" di bawah
src/types/           Tipe data dipakai bersama klien & function
src/pages/            Halaman publik + src/pages/admin untuk panel admin
src/config/           contact.ts (statis), campaign.ts (id campaign default)
                      -- rekening & WhatsApp bendahara TIDAK di sini lagi, lihat
                      "Pengaturan yang dapat diubah admin" di bawah
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

## Pengaturan yang dapat diubah admin

Rekening transfer (bank, cabang, jenis, nomor, atas nama) dan WhatsApp bendahara
**tidak** di-hardcode di kode — keduanya disimpan di tabel `settings` (migrasi v3) dan
bisa diubah kapan saja lewat `/admin/pengaturan` tanpa perlu redeploy. Halaman publik
(konfirmasi donasi, Kontak) mengambilnya lewat `GET /api/settings`
(`src/hooks/useSettings.ts`); admin baca/tulis lewat `GET`/`PATCH /api/admin/settings`.
Nilai lain di `src/config/contact.ts` (alamat, link grup WhatsApp, Instagram, koordinat
jadwal sholat) tetap statis di kode — belum diminta jadi bisa-diubah-admin juga.

## Cache

`/api/stats`, `/api/laporan`, dan `/api/kegiatan` (list) di-cache in-memory di dalam
function-nya sendiri (`netlify/lib/cache.ts`) — pola yang sama seperti
`kanazawa-masjid/netlify/functions/register.mjs`: variabel JS module-scope, **bukan**
Redis atau layanan tambahan apa pun. TTL 6 jam sebagai jaring pengaman (sama seperti
`SESSION_CACHE_TTL` di referensi), tapi mekanisme utamanya adalah invalidate-on-write:
begitu admin verifikasi/tolak donasi, CRUD kegiatan, CRUD pengeluaran, atau ubah target
campaign, cache yang relevan langsung dihapus (`netlify/functions/admin.mts`) — jadi
perubahan admin langsung terlihat, tidak menunggu jam-jaman. TTL 6 jam hanya jaring
pengaman kalau ada perubahan yang lupa di-invalidate, atau instance function lain (lihat
keterbatasan di bawah) belum tahu ada perubahan.

Keterbatasan yang perlu diketahui: cache ini per-instance function (Netlify bisa
menjalankan beberapa instance bersamaan, masing-masing punya cache sendiri-sendiri) —
cukup untuk trafik situs komunitas seperti ini, tapi bukan jaminan semua orang selalu
lihat angka yang identik detik itu juga.

## Deploy (Netlify)

Checklist sebelum deploy pertama kali:

### 1. Isi konfigurasi yang masih placeholder

Rekening & WhatsApp bendahara **tidak** perlu diisi sebelum deploy — isi lewat
`/admin/pengaturan` setelah deploy pertama sukses (lihat langkah 6). Yang masih perlu
dicek manual di kode sebelum deploy:

- `src/config/contact.ts` — `mapsEmbedUrl` (masih kosong, isi begitu alamat
  musala/titik kumpul final)
- Logo/badge asli (lihat `Design-System.md`) — belum ada file gambarnya, situs masih
  pakai placeholder huruf "K" di navbar

### 2. Siapkan Turso

```bash
turso db create kmii-ishikawa
turso db tokens create kmii-ishikawa
```

Catat `TURSO_DATABASE_URL` (dari `turso db show kmii-ishikawa --url`) dan
`TURSO_AUTH_TOKEN` (dari command tokens di atas).

### 3. Generate kredensial produksi (JANGAN pakai yang di `.env` lokal — itu untuk testing)

```bash
bun scripts/hash-password.ts 'password-admin-produksi-anda'   # -> ADMIN_PASSWORD_HASH
bun -e "console.log(crypto.randomUUID() + crypto.randomUUID())"  # -> SESSION_SECRET
bun -e "console.log(crypto.randomUUID())"                        # -> IP_SALT
```

### 4. Set environment variables di Netlify (Site settings → Environment variables)

| Key | Nilai |
|---|---|
| `TURSO_DATABASE_URL` | dari langkah 2 |
| `TURSO_AUTH_TOKEN` | dari langkah 2 |
| `ADMIN_PASSWORD_HASH` | dari langkah 3 |
| `SESSION_SECRET` | dari langkah 3 |
| `IP_SALT` | dari langkah 3 |
| `RUN_MIGRATIONS` | `true` (**hanya untuk deploy pertama** — lihat bagian "Migrasi" di atas, unset lagi setelahnya) |

**Jangan** set `APP_ENV` di produksi (biarkan kosong — itu yang membuat app baca dari
Turso, bukan `local.db`).

### 5. Hubungkan repo & deploy

Di Netlify: **Add new site → Import an existing project**, pilih repo GitHub ini.
Build command dan publish directory sudah otomatis kebaca dari `netlify.toml`
(`bun run build` → `dist/`). Deploy.

### 6. Verifikasi setelah deploy pertama sukses

- [ ] Buka domain Netlify-nya, cek Beranda tampil dengan jadwal sholat
- [ ] Cek `/donasi` → submit donasi tes → kode konfirmasi muncul
- [ ] Login `/admin/login` dengan password dari langkah 3 → verifikasi donasi tes tadi
  → cek `/donasi` progress bertambah
- [ ] Isi rekening asli & nomor WhatsApp bendahara di `/admin/pengaturan` — sebelum ini
  diisi, halaman konfirmasi donasi & Kontak menampilkan field kosong
- [ ] **Unset `RUN_MIGRATIONS`** di Netlify env vars (supaya deploy berikutnya tidak
  query Turso untuk migrasi yang percuma)
- [ ] Hapus donasi/campaign data tes lewat `turso db shell kmii-ishikawa` kalau perlu
  data produksi yang bersih

### Deploy berikutnya (setelah yang pertama)

Push ke branch yang dihubungkan Netlify — otomatis build & deploy. Kalau ada migrasi
schema baru di `scripts/migrate-db.ts`, set `RUN_MIGRATIONS=true` untuk deploy itu saja,
lalu unset lagi (lihat bagian "Migrasi").

## Keamanan

- Tidak ada rahasia di bundle klien — semua `TURSO_*`/`SESSION_SECRET`/`ADMIN_PASSWORD_HASH`
  hanya dibaca di `netlify/functions`.
- Form donasi publik dilindungi honeypot + captcha matematika sederhana (cek di browser
  saja, seperti `kanazawa-masjid`) + rate limit per IP (di-hash, IP asli tidak disimpan).
  Captcha sengaja tidak diverifikasi ulang di server — donasi tetap harus diverifikasi
  manual oleh admin (lewat kode konfirmasi) sebelum terhitung di mana pun yang publik,
  jadi captcha di sini hanya penyaring spam ringan, bukan gerbang keamanan.
- Sesi admin: cookie `HttpOnly; SameSite=Strict` ditandatangani HMAC, tanpa tabel sesi.

## Desain

Warna & wordmark mengikuti `Design-System.md` (badge KMII) — `kmii-green #1b7717`,
`ink #0c1014`, `on-green #ffffff`. Tema terang diturunkan dari token yang sama karena
sumber hanya mendokumentasikan satu tema (gelap). Ganti token di `src/index.css`
begitu ada panduan brand yang lebih lengkap.

## Belum dikerjakan (backlog)

- **Paginasi & filter tanggal** untuk list yang berpotensi panjang seiring waktu:
  `/admin/donasi` (semua donasi, tanpa batas), `/admin/laporan` (semua pengeluaran),
  `/kegiatan` & `/admin/kegiatan` (semua event). Saat ini semua query `SELECT *` tanpa
  `LIMIT`/`OFFSET` — baik-baik saja di awal, tapi query & payload akan makin besar tiap
  bulan berjalan.
