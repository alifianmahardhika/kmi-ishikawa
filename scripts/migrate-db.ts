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
