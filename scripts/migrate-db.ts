/**
 * Database migration script. Gated so it does NOT hit Turso on every build —
 * each run is one round-trip to check schema_migrations even when there's
 * nothing to do, and this repo's `bun run build` calls this script every deploy.
 *
 * Run manually:   bun run migrate            (equivalent to --force, any shell)
 * Auto-run:       set RUN_MIGRATIONS=true in Netlify env vars before deploying
 *                 (bun run build calls this every time, but it's a no-op unless
 *                 the flag/--force is set). Unset it again after the migration
 *                 completes so it doesn't re-run (and re-bill Turso) every deploy.
 *
 * Local dev:      APP_ENV=dev  -> writes to ./local.db (SQLite). The gate
 *                 applies locally too — if `netlify dev` throws "no such table",
 *                 run `bun run migrate` (with APP_ENV=dev in .env) first.
 * Production:     TURSO_DATABASE_URL + TURSO_AUTH_TOKEN required.
 *
 * Migrations are idempotent (IF NOT EXISTS / tracked by version in
 * schema_migrations) and never rewritten once applied — add new ones to
 * MIGRATIONS below instead of editing existing entries.
 */
import { createClient } from "@libsql/client";

const forced = process.argv.includes("--force");
if (process.env.RUN_MIGRATIONS !== "true" && !forced) {
  console.log(
    "RUN_MIGRATIONS is not 'true' (and no --force flag) — skipping migrations.",
  );
  process.exit(0);
}

function getClient() {
  if (process.env.APP_ENV === "dev") {
    console.log("Using local SQLite database: ./local.db");
    return createClient({ url: "file:./local.db" });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error(
      "ERROR: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set for production migrations.",
    );
    process.exit(1);
  }

  console.log(`Using Turso database: ${url}`);
  return createClient({ url, authToken });
}

type MigrationStatement = string | { sql: string; args: (string | number | null)[] };

interface Migration {
  version: number;
  name: string;
  sql: MigrationStatement[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "initial schema",
    sql: [
      `CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        target_amount INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        donor_name TEXT NOT NULL,
        is_anonymous INTEGER NOT NULL DEFAULT 0,
        amount INTEGER NOT NULL,
        message TEXT NOT NULL DEFAULT '',
        contact TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        verified_at TEXT,
        verified_by TEXT,
        admin_note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        ip_hash TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(campaign_id, status)`,
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL REFERENCES campaigns(id),
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'lainnya',
        amount INTEGER NOT NULL,
        spent_on TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        image TEXT NOT NULL DEFAULT '',
        is_published INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 2,
    name: "seed default campaign",
    sql: [
      `INSERT OR IGNORE INTO campaigns (id, title, description, target_amount, is_active, created_at)
       VALUES (
         'nafkah-imam',
         'Donasi Bulanan Imam KMII Ishikawa',
         'Donasi rutin bulanan untuk mendukung Imam KMII Ishikawa. Target dan progress direset setiap bulan.',
         150000,
         1,
         '${new Date().toISOString()}'
       )`,
    ],
  },
  {
    version: 3,
    name: "settings table (rekening & kontak bendahara, dapat diubah admin)",
    sql: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      {
        sql: "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('rekening', ?, ?)",
        args: [
          JSON.stringify({
            bankName: "Japan Post Bank (Yucho Ginko)",
            branchNumber: "",
            accountType: "Tabungan (普通)",
            accountNumber: "",
            accountHolder: "",
          }),
          new Date().toISOString(),
        ],
      },
      {
        sql: "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('whatsapp_treasurer', ?, ?)",
        args: [
          JSON.stringify({ name: "Bendahara KMII", phone: "" }),
          new Date().toISOString(),
        ],
      },
    ],
  },
  {
    version: 4,
    name: "Silaturahmi FC (jadwal, pendaftaran, teks halaman)",
    sql: [
      `CREATE TABLE IF NOT EXISTS fc_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL DEFAULT '',
        venue TEXT NOT NULL,
        map_url TEXT NOT NULL DEFAULT '',
        gk_quota INTEGER NOT NULL DEFAULT 0,
        player_quota INTEGER NOT NULL DEFAULT 0,
        fee INTEGER NOT NULL DEFAULT 0,
        gk_fee INTEGER NOT NULL DEFAULT 0,
        notes TEXT NOT NULL DEFAULT '',
        drive_url TEXT NOT NULL DEFAULT '',
        youtube_url TEXT NOT NULL DEFAULT '',
        is_closed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fc_events_date ON fc_events(date)`,
      `CREATE TABLE IF NOT EXISTS fc_bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL REFERENCES fc_events(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        position TEXT NOT NULL DEFAULT 'PLAYER',
        is_paid INTEGER NOT NULL DEFAULT 0,
        approved_at TEXT,
        created_at TEXT NOT NULL,
        ip_hash TEXT NOT NULL DEFAULT '',
        UNIQUE (event_id, phone)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fc_bookings_event ON fc_bookings(event_id, position, approved_at)`,
      `CREATE TABLE IF NOT EXISTS fc_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
  {
    version: 5,
    name: "Silaturahmi FC: PIN pendaftar untuk cari/batal dari perangkat lain",
    sql: [
      // pin_hash kosong = pendaftaran lama (sebelum ada PIN) -> tidak bisa dicari lewat PIN.
      `ALTER TABLE fc_bookings ADD COLUMN pin_hash TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE fc_bookings ADD COLUMN pin_fails INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE fc_bookings ADD COLUMN pin_locked_until TEXT`,
      `CREATE TABLE IF NOT EXISTS fc_pin_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_fc_pin_attempts_ip ON fc_pin_attempts(ip_hash, created_at)`,
    ],
  },
  {
    version: 6,
    name: "admin_login_attempts (batas percobaan login admin per IP)",
    sql: [
      `CREATE TABLE IF NOT EXISTS admin_login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip ON admin_login_attempts(ip_hash, created_at)`,
    ],
  },
  {
    version: 7,
    name: "Silaturahmi FC: member (kode permanen, cari langsung lewat kode)",
    sql: [
      // code_lookup = HMAC-SHA256(kode, FC_CODE_SECRET), hex. UNIQUE -> pencarian lewat kode O(1).
      // Satu member = satu orang dengan satu kode permanen; phone sengaja TIDAK unik supaya
      // pemilik nomor yang kehilangan kode (atau nomornya dipakai orang iseng) tidak terkunci.
      `CREATE TABLE IF NOT EXISTS fc_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        code_lookup TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )`,
      // Kolom pin_hash/pin_fails/pin_locked_until dari v5 tidak dipakai lagi (tidak bisa di-DROP
      // dengan aman di SQLite lama); biarkan saja.
      `ALTER TABLE fc_bookings ADD COLUMN member_id INTEGER REFERENCES fc_members(id)`,
      `CREATE INDEX IF NOT EXISTS idx_fc_bookings_member ON fc_bookings(member_id)`,
    ],
  },
  // Tambahkan migrasi baru di sini — jangan pernah mengedit/menghapus entri yang sudah ada.
  //
  // Contoh:
  // {
  //   version: 4,
  //   name: "tambah kolom X ke Y",
  //   sql: ["ALTER TABLE y ADD COLUMN x TEXT NOT NULL DEFAULT ''"],
  // },
];

async function migrate() {
  const client = getClient();

  await client.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`,
  );

  const applied = await client.execute("SELECT version FROM schema_migrations");
  const appliedSet = new Set(applied.rows.map((r) => Number(r.version)));

  let ran = 0;
  for (const migration of MIGRATIONS.sort((a, b) => a.version - b.version)) {
    if (appliedSet.has(migration.version)) {
      console.log(`  ✓ v${migration.version} ${migration.name} (already applied)`);
      continue;
    }

    console.log(`  → Running v${migration.version} ${migration.name} ...`);
    for (const sql of migration.sql) {
      await client.execute(sql);
    }
    await client.execute({
      sql: "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      args: [migration.version, new Date().toISOString()],
    });
    console.log(`  ✓ v${migration.version} applied`);
    ran++;
  }

  console.log(
    ran === 0
      ? "\nAll migrations already applied — nothing to do."
      : `\n${ran} migration(s) applied successfully.`,
  );

  client.close();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
