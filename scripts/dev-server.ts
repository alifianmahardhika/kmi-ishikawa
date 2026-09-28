/**
 * Local dev, replacing `netlify dev` for day-to-day work.
 *
 * Why: netlify-cli's local function proxy proved unreliable on this machine —
 * segmentation faults under Node 24 on segmented routes, and silent hangs (no
 * response, no error) under Node 22 too, on plain POST requests. Every time, calling
 * the same function handler directly (bypassing netlify-cli entirely) worked instantly
 * and correctly — so the bug is in netlify-cli's local proxy, not in this app's code.
 *
 * This script serves /api/* itself with Bun.serve, dynamically importing the matching
 * netlify/functions/<name>.mts handler and calling it directly — no bundler, no proxy
 * layer, nothing to hang. Vite (spawned below) serves the frontend and forwards /api/*
 * to this server via vite.config.ts's server.proxy.
 *
 * `netlify dev` is still available as `bun run dev:netlify` for an occasional check
 * against Netlify's own redirects/edge-function behavior — but expect the instability
 * described above.
 */
import type { FunctionContext } from "../netlify/lib/types";

const API_PORT = 8889;

// Every file in netlify/functions/ handles one first path segment under /api/ (see
// each function's own top comment for how it routes sub-paths itself).
const FUNCTION_NAMES = new Set(["donasi", "stats", "laporan", "kegiatan", "admin", "settings"]);

const server = Bun.serve({
  port: API_PORT,
  async fetch(req, bunServer) {
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const apiIndex = segments.indexOf("api");
    const name = apiIndex === -1 ? undefined : segments[apiIndex + 1];

    if (!name || !FUNCTION_NAMES.has(name)) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    try {
      const mod = await import(`../netlify/functions/${name}.mts`);
      const context: FunctionContext = { ip: bunServer.requestIP(req)?.address ?? "unknown" };
      return await mod.default(req, context);
    } catch (err) {
      console.error(`[api:${name}]`, err);
      return new Response(JSON.stringify({ error: "server_error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    }
  },
});

console.log(`✓ API server ready: http://localhost:${API_PORT} (proxied from Vite's /api)`);

const vite = Bun.spawn(["bun", "run", "dev:vite"], {
  stdio: ["inherit", "inherit", "inherit"],
});

function shutdown() {
  vite.kill();
  server.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await vite.exited;
server.stop();
