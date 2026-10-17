// Dev tool: does anything on the settings page (and the panel in its preview) run out of its box, get cut, or make the page scroll sideways — in each of the 30
// languages, at several widths, light and dark? It builds the web demo (scripts/build-demo.mjs: the real settings page in a plain page), serves it, and measures.
//   node scripts/overflow-audit.mjs                       every language, five widths, both schemes (a few minutes)
//   node scripts/overflow-audit.mjs --lang de,ja --width 900,390 --scheme dark       a part of that
//   node scripts/overflow-audit.mjs --long-names [spaced|cjk|wide]
//                 every renamable text named with 30 characters (the longest a name can be) and the venue list on: "spaced" (default) is words with spaces,
//                 "cjk" 30 full-width characters in a row, "wide" 30 capital Ws in a row (a stress test: nothing real is that wide)
// Exit code 1 if anything is found. Nothing here is a dependency; it needs the same Chromium as the end-to-end tests.
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, fallback) => { const i = process.argv.indexOf("--" + name); return i > 0 ? process.argv[i + 1].split(",") : fallback; };
const built = spawnSync("node", [path.join(root, "scripts/build-demo.mjs")], { encoding: "utf8" });
if (built.status !== 0) { console.error(built.stderr || built.stdout); process.exit(1); }
const demo = path.join(root, "dist", "demo");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/manifest.json"), "utf8"));
const languages = arg("lang", fs.readdirSync(path.join(root, "src/_locales")).map((c) => c.replace("_", "-")));
const widths = arg("width", ["1360", "1100", "900", "700", "420"]).map(Number);
const schemes = arg("scheme", ["light", "dark"]);
const longAt = process.argv.indexOf("--long-names");
const longNames = longAt > 0;
const longKind = longNames && process.argv[longAt + 1] && !process.argv[longAt + 1].startsWith("--") ? process.argv[longAt + 1] : "spaced";
const LONG = { spaced: "Wmw Wmw Wmw Wmw Wmw Wmw Wmw Wm", cjk: "漢".repeat(30), wide: "W".repeat(30) }[longKind];
const LABELS = Object.fromEntries(Object.keys(createRequire(import.meta.url)(path.join(root, "src/lib/prefs.js")).NAMES).map((k) => [k, LONG]));

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.normalize(path.join(demo, decodeURIComponent(new URL(req.url, "http://x").pathname)));
  if (!file.startsWith(demo)) { res.writeHead(403).end(); return; }
  const f = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, "index.html") : file;
  fs.readFile(f, (err, data) => (err ? res.writeHead(404).end() : res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }).end(data)));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const { pw, chromiumPath } = await import(pathToFileURL(path.join(root, "test/e2e/find-browser.mjs")).href);
const browser = await pw.chromium.launch({ executablePath: chromiumPath, args: process.env.CI ? ["--no-sandbox"] : [] });

// In the page: the elements whose text or box goes outside the box that holds them. A box is a button, a row, a card, a cell, a label…; the overlays of the preview's
// editor (tags, rails, drop bar) are meant to stick out and are left out.
function measure(opts) {
  for (const d of document.querySelectorAll("details")) d.open = true;                      // (what is folded away is measured too: the name help, the unranked list, the tray)
  const BOXES = "button, .opt, .row, .card, .chip-theme, label, summary, td, th, .seg-btn, .name-edit, .toc a, .opt-search-box, .rr-sec, .rr-copybar";
  const SKIP = ".pv-tag, .pv-rail, .pv-drop, .pv-rename, .pv-tray, .rr-sr, [hidden], .sr-only, .skip, .demo-bar, .rr-dd-list, .rr-suggest";
  const out = [];
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "");
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) {
    const wide = [...document.body.querySelectorAll("*")].filter((el) => !el.closest(SKIP) && el.getBoundingClientRect().right > doc.clientWidth + 1 && el.getBoundingClientRect().width).slice(0, 3).map(desc);
    out.push({ kind: "page scrolls sideways", what: `scrollWidth ${doc.scrollWidth} > ${doc.clientWidth}; beyond the edge: ${wide.join(", ") || "(nothing visible)"}` });
  }
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest(SKIP) || el.matches(SKIP)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    // text cut by its own box
    if ((cs.overflowX === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 1 && (el.textContent || "").trim() && cs.textOverflow !== "ellipsis" && !el.matches(".opt-search, .chip-sample, .rr-bars, .toc") && !el.closest(".chip-theme")) {
      out.push({ kind: "cut by its own box", what: `${desc(el)} ${el.scrollWidth} > ${el.clientWidth}: "${(el.textContent || "").trim().slice(0, 40)}"` });
    }
    // a one-word label of a script that has spaces ("Ad|d", "Hinzufü|gen"): the word's text is on more than one line
    const label = (el.textContent || "").trim();
    if (!opts.longNames && el.matches("button, summary, label, a") && /^[A-Za-zÀ-ÖØ-öø-ÿĀ-žА-я\u0590-\u06ff\u0900-\u097f\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af.'’-]{2,}$/.test(label) && !el.closest(".rr-dd-list")) {          // (not with every name at 30 letters in a row: such a name breaks where it must)
      const range = document.createRange(), lines = new Set();
      for (const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); walker.nextNode();) {          // (the text only: an icon beside it has a box of its own)
        range.selectNodeContents(walker.currentNode);
        for (const q of range.getClientRects()) if (q.width > 0.5) lines.add(Math.round(q.top / 4));
      }
      if (lines.size > 1) out.push({ kind: "a word broken in two", what: `${desc(el)}: "${label.slice(0, 30)}" is on ${lines.size} lines` });
    }
    // runs out of the box that holds it
    const box = el.parentElement && el.parentElement.closest(BOXES);
    if (box && !box.contains(document.querySelector(".pv-rail")) && (el.childElementCount === 0 || el.matches(".rr-chip, .name-input, input, select, button"))) {
      const b = box.getBoundingClientRect();
      const bs = getComputedStyle(box);
      const clipped = bs.overflowX !== "visible";
      if ((r.right > b.right + 1.5 || r.left < b.left - 1.5) && b.width > 0 && !(bs.display === "inline" && !clipped)) {
        out.push({ kind: clipped ? "cut by the box that holds it" : "sticks out of the box that holds it", what: `${desc(el)} ${Math.round(r.left)}..${Math.round(r.right)} not in ${desc(box)} ${Math.round(b.left)}..${Math.round(b.right)}${(el.textContent || "").trim() ? `: "${(el.textContent || "").trim().slice(0, 30)}"` : ""}` });
      }
    }
  }
  return out;
}

const found = new Map();                                              // "kind · what (selectors only)" → where it was seen
let loads = 0;
for (const scheme of schemes) for (const width of widths) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
  const page = await ctx.newPage();
  if (longNames) await page.addInitScript((labels) => { try { localStorage.setItem("rr-demo:sync:prefs", JSON.stringify({ labels, panel: { venues: { show: true } } })); } catch (e) { /* no localStorage */ } }, LABELS);
  for (const lang of languages) {
    await page.goto(`${origin}/?lang=${lang}`);
    await page.waitForSelector("#card-table");
    await page.waitForTimeout(120);
    loads++;
    for (const f of await page.evaluate(measure, { longNames })) {
      const key = f.kind + " · " + f.what.replace(/[0-9.]+/g, "#").replace(/"[^"]*"/g, "").trim();
      if (!found.has(key)) found.set(key, []);
      found.get(key).push(`${lang}@${width}${scheme === "dark" ? "d" : ""}: ${f.what}`);
    }
  }
  await ctx.close();
  process.stderr.write(`${scheme} ${width}px done\n`);
}
await browser.close();
server.close();
console.log(`${loads} page loads (version ${manifest.version}; ${languages.length} languages × ${widths.length} widths × ${schemes.length} schemes)`);
for (const [key, where] of found) console.log(`\n✗ ${key}\n    ${where.length} time(s), e.g. ${where.slice(0, 3).join("\n         ")}`);
console.log(found.size ? `\n${found.size} kind(s) of problem` : "\nNothing runs out of its box, is cut or scrolls sideways.");
process.exit(found.size ? 1 : 0);
