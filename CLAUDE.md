# KMII Ishikawa — catatan untuk Claude Code

Lihat `README.md` untuk gambaran umum. Beberapa hal yang perlu diingat saat mengedit repo ini:

- **Tanpa ORM** — semua akses DB pakai SQL mentah berparameter lewat `@libsql/client`
  (`netlify/lib/db.ts`). Jangan tambahkan Prisma/Drizzle kecuali diminta eksplisit.
- **Migrasi digate `RUN_MIGRATIONS`** (`scripts/migrate-db.ts`) — sengaja diminta begitu
  oleh pemilik proyek supaya `bun run build` tidak menambah round-trip Turso di setiap
  deploy. `bun run migrate` (script npm) selalu memaksa jalan lewat flag `--force`
  (bukan env var) supaya gampang dipakai lintas shell (bash/PowerShell). Risikonya —
  kalau lupa set `RUN_MIGRATIONS=true` di Netlify, migrasi baru tidak ikut ter-apply saat
  deploy — sudah didokumentasikan di README, jangan dihapus tanpa sepengetahuan pemilik
  proyek.
- **`netlify/functions/admin.mts`** menangani SEMUA sub-path `/api/admin/*` dalam satu
  file (login, logout, me, donasi, kegiatan, laporan) karena redirect di `netlify.toml`
  hanya mem-forward path apa adanya — Netlify merutekan berdasarkan nama function sebagai
  prefix path, bukan pattern matching bersarang. Jangan pecah jadi banyak file kecuali
  ikut menyesuaikan redirect/nama function.
- **Tidak ada rahasia di klien** — `TURSO_*`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`,
  `IP_SALT` hanya boleh diakses dari `netlify/` (server), tidak pernah dari `src/`.
  Setelah `bun run build`, `grep` `dist/` untuk nama-nama itu harus nihil.
- **Donasi `pending` tidak boleh terlihat publik** — `/api/stats` dan `/api/laporan`
  hanya menghitung donasi `status = 'verified'`.
- **Target donasi bulanan, bukan akumulasi** — kampanye default (`nafkah-imam`, lihat
  `src/config/campaign.ts`) adalah nafkah rutin Imam, target ¥/bulan. `/api/stats`
  (`netlify/lib/month.ts`) menghitung `collected`/`donorCount`/`recentDonors` hanya dari
  donasi terverifikasi di bulan kalender berjalan (UTC) — jangan diubah jadi sum
  sepanjang waktu (itu ada terpisah di field `allTimeCollected`). Admin ubah nominal
  target lewat `PATCH /api/admin/campaign` (form-nya di `src/components/admin/CampaignTargetForm.tsx`).
- **Desain**: token warna dari `Design-System.md` didefinisikan di `src/index.css`
  (`@theme` + CSS var per tema). Update di satu tempat itu saja.
- **Bahasa**: situs ini Indonesia saja — jangan tambahkan layer i18n multi-bahasa kecuali
  diminta.
- **`bun run dev` TIDAK pakai `netlify-cli` lagi** (`scripts/dev-server.ts`) — `netlify-cli`
  terbukti tidak andal di Windows: segfault di Node 24 untuk rute bersegmen, DAN macet
  total tanpa error di Node 22 juga untuk `POST /api/donasi` yang sederhana (request
  masuk, tidak pernah direspons). Kalau ada endpoint baru yang "sepertinya tidak
  merespons" saat diuji, jangan langsung curiga ke kode — coba panggil handler-nya
  langsung dulu (`bun -e` atau script sekali pakai yang mengimpor & memanggil
  `mod.default(req, context)`) sebelum menyimpulkan ada bug. `bun run dev:netlify` (perlu
  Node 22, dicek otomatis lewat `predev:netlify`/`scripts/check-node-version.ts`) masih
  ada untuk sesekali cek perilaku spesifik Netlify, tapi bukan default lagi.
- **Captcha donasi cuma dicek di klien** (`src/lib/captcha.ts`) — sengaja, atas permintaan
  pemilik proyek: karena donasi tetap perlu verifikasi manual admin via kode konfirmasi
  sebelum terhitung publik, captcha di sini hanya penyaring spam ringan (bukan gerbang
  keamanan), jadi tidak perlu token bertanda tangan server seperti sebelumnya. Jangan
  tambahkan lagi endpoint `/api/captcha` kecuali diminta ulang.
- **JANGAN hapus/reset `local.db`** untuk keperluan testing (`rm -f local.db*` dkk.) —
  pemilik proyek isi data uji coba sendiri di situ dan migrasi ulang manual kapan perlu
  (`bun run migrate`). Kalau butuh DB kosong untuk verifikasi suatu fitur, jangan sentuh
  `local.db` yang ada — pakai `:memory:` (`file::memory:`), file sementara di scratchpad,
  atau panggil handler function langsung dengan client libSQL sendiri yang dibuat di situ.

## Perintah

```bash
bun run dev          # scripts/dev-server.ts — Bun.serve untuk /api/* + Vite, tanpa netlify-cli
bun run dev:vite      # UI saja, tanpa /api/*
bun run dev:netlify   # netlify dev asli (butuh Node 22) — sesekali saja, lihat catatan di atas
bun run typecheck     # tsc --noEmit
bun run migrate       # migrasi manual, selalu jalan (--force; APP_ENV=dev untuk local.db)
bun run build         # migrate (gated RUN_MIGRATIONS) + typecheck + vite build
```
