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
- **`netlify dev` butuh Node 22, bukan Node 24** di mesin Windows ini — Node 24 segfault
  di proxy function lokal `netlify-cli` untuk rute bersegmen (`/api/kegiatan/:slug`, dll).
  `.node-version` di root mengunci ini untuk fnm/nvm. Kalau menambah endpoint baru dengan
  path bersegmen, uji dulu dengan Node 22 sebelum menyimpulkan ada bug di kode.

## Perintah

```bash
bun run dev         # netlify dev — Vite + /api/* sekaligus
bun run dev:vite     # UI saja, tanpa /api/*
bun run typecheck    # tsc --noEmit
bun run migrate      # migrasi manual, selalu jalan (--force; APP_ENV=dev untuk local.db)
bun run build        # migrate (gated RUN_MIGRATIONS) + typecheck + vite build
```
