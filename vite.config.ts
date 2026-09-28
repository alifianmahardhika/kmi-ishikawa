import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `bun run dev` (scripts/dev-server.ts) runs a plain Bun.serve on API_PORT that calls
// netlify/functions/*.mts handlers directly — netlify-cli's local `netlify dev` proxy
// proved unreliable on Windows (segfaults / silent hangs, independent of Node version;
// see scripts/check-node-version.ts and scripts/dev-server.ts's top comments for the
// history). This proxy rule sends the Vite dev server's /api/* requests to that server;
// `netlify dev` itself is still available as `bun run dev:netlify` for an occasional
// check against Netlify's own redirects/edge behavior.
const API_PORT = 8889;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": `http://localhost:${API_PORT}`,
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
  },
});
