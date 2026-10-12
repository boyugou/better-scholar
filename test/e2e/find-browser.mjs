// Locate Playwright and a Chromium build for the end-to-end test and scripts/check-saved-profile.mjs.
// (Branded Chrome ≥137 ignores --load-extension, so use Playwright's bundled Chromium / Chrome for Testing.)
// Not found? Set PLAYWRIGHT_PATH=/path/to/node_modules/playwright and CHROMIUM_PATH=/path/to/Chromium.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

function findPlaywright() {
  const cands = [process.env.PLAYWRIGHT_PATH];
  const npx = path.join(os.homedir(), ".npm", "_npx");
  if (fs.existsSync(npx)) for (const d of fs.readdirSync(npx)) cands.push(path.join(npx, d, "node_modules", "playwright"));
  cands.push("playwright");
  for (const c of cands.filter(Boolean)) { try { return require(c); } catch (e) { /* next */ } }
  return null;
}

function findChromium(pw) {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  // a Playwright-installed Chromium (CI: `npx playwright install chromium`)
  try { const p = pw && pw.chromium.executablePath(); if (p && fs.existsSync(p)) return p; } catch (e) { /* fall through to the macOS cache */ }
  const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
  if (!fs.existsSync(cache)) return null;
  const dirs = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort((a, b) => parseInt(b.slice(9)) - parseInt(a.slice(9)));
  for (const d of dirs) {
    for (const arch of ["chrome-mac-arm64", "chrome-mac"]) {
      const p = path.join(cache, d, arch, "Chromium.app", "Contents", "MacOS", "Chromium");
      if (fs.existsSync(p)) return p;
    }
  }
  return null;
}

const pw = findPlaywright();
export { pw };
export const chromiumPath = findChromium(pw);
