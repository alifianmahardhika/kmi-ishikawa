import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Functions run through `netlify dev` (see package.json "dev" script), which proxies
// /api/* to netlify/functions/* itself. We intentionally do NOT duplicate that logic
// here as a Vite middleware — kanazawa-masjid did, and it meant the same request
// handling existed twice and could drift. Use `bun run dev` (netlify dev) whenever
// you need /api/*; `bun run dev:vite` is fine for UI-only work.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
  },
});
