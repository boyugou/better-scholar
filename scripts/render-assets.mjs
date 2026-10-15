#!/usr/bin/env node
// Dev tool: renders src/assets/apple-touch-icon.png (180) and og.png (1200x630, the card a shared link shows) from the icon and a small HTML card:
// the name and the one line of the store listing, no screenshot and no one's name. Needs Playwright + Chromium (PLAYWRIGHT_PATH / CHROMIUM_PATH, or the
// usual caches). The results are committed; this is only for changes.
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const find = (cands, load) => { for (const c of cands.filter(Boolean)) { try { return load(c); } catch (e) { /* next */ } } return null; };
const npx = path.join(os.homedir(), ".npm", "_npx");
const pw = find([process.env.PLAYWRIGHT_PATH, ...(fs.existsSync(npx) ? fs.readdirSync(npx).map((d) => path.join(npx, d, "node_modules", "playwright")) : []), "playwright"], require);
const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
const chromium = process.env.CHROMIUM_PATH || (fs.existsSync(cache) ? fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
  .flatMap((d) => ["chrome-mac-arm64", "chrome-mac"].map((a) => path.join(cache, d, a, "Chromium.app", "Contents", "MacOS", "Chromium"))).find((p) => fs.existsSync(p)) : null);
if (!pw || !chromium) { console.error("Playwright/Chromium not found"); process.exit(1); }

const icon = fs.readFileSync(path.join(root, "src", "assets", "icon.svg"), "utf8");
const sized = (n) => icon.replace(/ width="\d+" height="\d+"/, ` width="${n}" height="${n}"`);
const browser = await pw.chromium.launch({ executablePath: chromium });
const shot = async (html, w, h, file) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.screenshot({ path: path.join(root, "src", "assets", file), clip: { x: 0, y: 0, width: w, height: h } });
  await page.close();
  console.log("wrote", file);
};
await shot(`<body style="margin:0;background:#161d33">${sized(180)}</body>`, 180, 180, "apple-touch-icon.png");
await shot(`<body style="margin:0;width:1200px;height:630px;background:linear-gradient(160deg,#27324f,#101626);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;display:flex;align-items:center">
<div style="padding:0 90px;display:flex;gap:56px;align-items:center;width:100%">
  <div>${sized(220)}</div>
  <div><div style="font-size:78px;font-weight:750;letter-spacing:-.02em;line-height:1.05">Better Scholar</div>
  <div style="margin-top:22px;font-size:32px;color:#b9c4de;line-height:1.35;max-width:640px">Your authorship role and each venue's CCF and CORE rank, on every Scholar profile.</div>
  <div style="display:flex;gap:10px;margin-top:34px"><i style="width:70px;height:16px;border-radius:8px;background:#4d8ff5"></i><i style="width:70px;height:16px;border-radius:8px;background:#b36cf6"></i><i style="width:70px;height:16px;border-radius:8px;background:#fbbc04"></i><i style="width:70px;height:16px;border-radius:8px;background:#34a853"></i></div></div>
</div></body>`, 1200, 630, "og.png");
await browser.close();
