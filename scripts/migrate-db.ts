/**
 * Versioned migration runner. Unlike kanazawa-masjid/scripts/migrate-db.mjs, this is
 * NOT gated behind a RUN_MIGRATIONS env flag — it always runs as part of `bun run build`,
 * so schema changes actually reach production instead of silently never applying.
 * Each migration is idempotent (IF NOT EXISTS) and tracked in schema_migrations.
 */
import { createClient } from "@libsql/client";

const url =
  process.env.APP_ENV === "dev"
    ? "file:./local.db"
    : process.env.TURSO_DATABASE_URL;
const authToken = process.env.APP_ENV === "dev" ? undefined : process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("No database URL configured (set APP_ENV=dev or TURSO_DATABASE_URL)");
}

const client = createClient(authToken ? { url, authToken } : { url });

interface Migration {
  version: number;
  name: string;
  sql: string[];
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
         'masjid-2026',
         'Pembangunan Musala KMI Ishikawa',
         'Donasi untuk pembangunan dan operasional musala komunitas Muslim Indonesia di Ishikawa.',
         3000000,
         1,
         '${new Date().toISOString()}'
       )`,
    ],
  },
];

async function ensureMigrationsTable() {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`,
  );
}

async function appliedVersions(): Promise<Set<number>> {
  const result = await client.execute("SELECT version FROM schema_migrations");
  return new Set(result.rows.map((row) => Number(row.version)));
}

async function run() {
  console.log(`Migrating database (APP_ENV=${process.env.APP_ENV ?? "production"})...`);
  await ensureMigrationsTable();
  const applied = await appliedVersions();

  for (const migration of MIGRATIONS.sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) {
      console.log(`  [skip] v${migration.version} ${migration.name} (already applied)`);
      continue;
    }
    console.log(`  [run]  v${migration.version} ${migration.name}`);
    for (const sql of migration.sql) {
      await client.execute(sql);
    }
    await client.execute({
      sql: "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
      args: [migration.version, new Date().toISOString()],
    });
  }

  console.log("Migration complete.");
}

run()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
