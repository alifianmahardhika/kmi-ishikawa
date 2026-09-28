/**
 * Guards `bun run dev` (netlify dev) against Node 24 — it segfaults/hangs in
 * netlify-cli's local function proxy on this project (Windows), silently, with no
 * useful error. .node-version pins Node 22, but that file is only honored by
 * fnm/nvm when you actually run `fnm use`/`nvm use` first — this script catches the
 * case where that was forgotten and fails fast with clear instructions instead.
 *
 * Note: this checks the `node` binary resolved from PATH (via a real subprocess),
 * NOT Bun's own bundled Node-compat version (process.versions.node) — netlify-cli
 * runs as a separate `node` process, so that's the one that actually matters here.
 */
const required = (await Bun.file(new URL("../.node-version", import.meta.url)).text()).trim();
const requiredMajor = Number(required.split(".")[0]);

const proc = Bun.spawnSync(["node", "--version"]);
const output = proc.stdout.toString().trim(); // e.g. "v24.13.0"
const currentMajor = Number(output.replace(/^v/, "").split(".")[0]);

if (!proc.success || !Number.isFinite(currentMajor)) {
  console.warn(`⚠ Tidak bisa mendeteksi versi Node dari PATH (output: "${output}") — lanjut tanpa cek.`);
} else if (currentMajor !== requiredMajor) {
  console.error(
    `\n✗ netlify dev butuh Node ${requiredMajor}.x, tapi \`node\` di PATH sekarang ${output}.\n` +
      `  Node 24 diketahui menyebabkan netlify-cli macet/crash diam-diam di proyek ini.\n\n` +
      `  Perbaiki dengan salah satu:\n` +
      `    fnm use           (kalau pakai fnm — baca .node-version otomatis)\n` +
      `    nvm use           (kalau pakai nvm)\n` +
      `  lalu jalankan lagi: bun run dev\n`,
  );
  process.exit(1);
} else {
  console.log(`✓ Node ${output} di PATH — sesuai .node-version.`);
}
