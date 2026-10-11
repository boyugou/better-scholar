#!/usr/bin/env node
// Render assets/icon*.svg into src/icons/icon-{16,32,48,128}.png (dev tool; needs Playwright + Chromium
// — see test/e2e/run.mjs for how they are located).
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
function find(cands, load) { for (const c of cands.filter(Boolean)) { try { return load(c); } catch (e) { /* next */ } } return null; }
const npx = path.join(os.homedir(), ".npm", "_npx");
const pw = find([process.env.PLAYWRIGHT_PATH, ...(fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, "node_modules", "playwright")) : []), "playwright"], require);
const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
const chromium = process.env.CHROMIUM_PATH || (fs.existsSync(cache)
  ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
      .flatMap((d) => ["chrome-mac-arm64", "chrome-mac"].map((a) => path.join(cache, d, a, "Chromium.app", "Contents", "MacOS", "Chromium")))
      .find((p) => fs.existsSync(p)) : null);
if (!pw || !chromium) { console.error("Playwright/Chromium not found (PLAYWRIGHT_PATH / CHROMIUM_PATH)"); process.exit(1); }

const big = fs.readFileSync(path.join(root, "assets", "icon.svg"), "utf8");
const small = fs.readFileSync(path.join(root, "assets", "icon-small.svg"), "utf8");
const browser = await pw.chromium.launch({ executablePath: chromium });
for (const size of [16, 32, 48, 128]) {
  const svg = (size <= 32 ? small : big).replace(/ width="\d+" height="\d+"/, ` width="${size}" height="${size}"`);
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${svg}</body>`);
  await page.screenshot({ path: path.join(root, "src", "icons", `icon-${size}.png`), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log("wrote icon-" + size + ".png");
}
await browser.close();
