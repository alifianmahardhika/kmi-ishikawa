# KMII Ishikawa — catatan untuk Claude Code

Lihat `README.md` untuk gambaran umum. Beberapa hal yang perlu diingat saat mengedit repo ini:

- **Tanpa ORM** — semua akses DB pakai SQL mentah berparameter lewat `@libsql/client`
  (`netlify/lib/db.ts`). Jangan tambahkan Prisma/Drizzle kecuali diminta eksplisit.
- **Migrasi selalu jalan saat build** (`scripts/migrate-db.ts`, dipanggil dari
  `bun run build`) — jangan tambahkan gate env seperti `RUN_MIGRATIONS` yang membuatnya
  tidak pernah jalan di deploy nyata (ini bug yang sengaja dihindari dari referensi
  `kanazawa-masjid`).
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
bun run migrate      # jalankan migrasi manual (APP_ENV=dev untuk local.db)
bun run build        # migrate + typecheck + vite build
```
