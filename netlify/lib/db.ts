import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

/**
 * Single shared libSQL client for all functions.
 * APP_ENV=dev -> local SQLite file (bun run migrate / netlify dev use this too).
 * otherwise    -> Turso, via TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
 */
export function getDb(): Client {
  if (client) return client;

  if (process.env.APP_ENV === "dev") {
    client = createClient({ url: "file:./local.db" });
    return client;
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set (or APP_ENV=dev for local sqlite)",
    );
  }
  client = createClient({ url, authToken });
  return client;
}
