#!/usr/bin/env node
// Checks the built site: every language has every string (none left in English by accident is NOT checked: that is a translation matter),
// every page exists with the right lang / dir, no unreplaced template text, every relative link and asset resolves; the demo is built and
// complete (its scripts, the strings of every language) and each language's page embeds it; and no real person's name is anywhere in the site.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "_site");
const languages = JSON.parse(readFileSync(join(root, "src", "languages.json"), "utf8"));
const en = JSON.parse(readFileSync(join(root, "src", "i18n", "en.json"), "utf8"));
let bad = 0;
const fail = (m) => { bad++; console.error("✗ " + m); };

for (const l of languages) {
  const file = join(root, "src", "i18n", l.code + ".json");
  if (!existsSync(file)) { fail(`${l.code}: no translation file`); continue; }
  const s = JSON.parse(readFileSync(file, "utf8"));
  for (const k of Object.keys(en)) if (typeof s[k] !== "string" || !s[k].trim()) fail(`${l.code}: missing ${k}`);
  for (const k of Object.keys(s)) if (!(k in en)) fail(`${l.code}: extra ${k}`);
  for (const [k, v] of Object.entries(s)) if (/[{}]|\$\{|undefined/.test(v)) fail(`${l.code}: suspicious text in ${k}`);
}

const pages = [["index.html", null], ["privacy/index.html", null], ["demo/index.html", null], ...languages.map((l) => [`${l.code}/index.html`, l])];
for (const [rel, l] of pages) {
  const f = join(site, rel);
  if (!existsSync(f)) { fail("not built: " + rel); continue; }
  const html = readFileSync(f, "utf8");
  if (l && !html.includes(`<html lang="${l.code}" dir="${l.dir}">`)) fail(`${rel}: wrong lang/dir`);
  // the demo, embedded in this language (the demo reads ?lang= as the browser's language), loaded when it is near, and named for a screen reader
  if (l && !new RegExp(`<iframe src="\\.\\./demo/\\?lang=${l.code}" title="[^"]+" loading="lazy">`).test(html)) fail(`${rel}: no demo iframe for ${l.code}`);
  if (l && !html.includes(`href="../demo/?lang=${l.code}" target="_blank" rel="noopener"`)) fail(`${rel}: no link to open the demo on its own`);
  if (/\{\{|\}\}|undefined|\[object/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) fail(`${rel}: unreplaced text`);
  // the explainer: four steps beside a picture whose labels are the extension's own words in this language (the build fills it from the extension's code)
  if (l && ((html.match(/<button type="button" data-step="\d"/g) || []).length !== 4 || !html.includes('class="how-stage" aria-hidden="true"'))) fail(`${rel}: the explainer is not complete`);
  for (const m of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:)/.test(ref)) continue;
    const target = normalize(join(dirname(f), ref.split("?")[0]));
    if (!existsSync(target) && !existsSync(join(target, "index.html"))) fail(`${rel}: broken link ${ref}`);
  }
}

// The demo is the extension's own build of its settings page (scripts/build-demo.mjs there). A link to the directory resolves as long as the
// directory exists, so what it must hold is checked here: the page's scripts, in the list its stand-in reads, and the strings of every language.
const demo = join(site, "demo");
if (existsSync(join(demo, "index.html"))) {
  const listed = (/data-scripts="([^"]+)"/.exec(readFileSync(join(demo, "index.html"), "utf8")) || [])[1];
  if (!listed) fail("demo/index.html lists no scripts for its stand-in");
  else for (const f of listed.split(" ")) if (!existsSync(join(demo, f))) fail(`demo: script not built: ${f}`);
  if (!existsSync(join(demo, "demo-shim.js"))) fail("demo: the stand-in (demo-shim.js) is not built");
  // (the site's codes name a folder of the extension's _locales with an underscore: zh-CN is zh_CN)
  for (const l of languages) if (!existsSync(join(demo, "_locales", l.code.replace("-", "_"), "messages.json"))) fail(`demo: no strings for ${l.code}`);
}

// No real person's name, anywhere the site serves (the old demo used real researchers; nothing here is to name one). Pictures cannot be read: they
// are looked at by eye when they change (the hero picture is the extension's own, made from an invented profile).
// every operator of the extension's search language has an example in the operators section (a hand-written list goes stale: type: was missing)
{
  const EXT_DIR = process.env.EXT_DIR || join(root, "..", "google-scholar-highlighter");
  const query = join(EXT_DIR, "src", "lib", "query.js");
  if (existsSync(query)) {
    const { createRequire } = await import("node:module");
    const names = createRequire(import.meta.url)(query).OPERATORS.map((o) => o.name);
    const html = readFileSync(join(site, "en", "index.html"), "utf8"), ops = (html.match(/<section class="operators-section">[\s\S]*?<\/section>/) || [""])[0];
    for (const n of names) if (!ops.includes(`<code>${n}:`)) fail(`operators section: no example of ${n}:`);
  } else fail("the extension's src/lib/query.js not found (EXT_DIR)");
}

const NO_REAL_NAMES = ["Stoica", "Zaharia", "Karger", "Kaashoek", "Balakrishnan", "Chowdhury", "Moritz", "Nishihara"];
function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p); else yield p;
  }
}
for (const f of walk(site)) {
  if (!/\.(?:html|js|css|json|xml|txt|svg|md)$/i.test(f)) continue;
  const text = readFileSync(f, "utf8");
  for (const name of NO_REAL_NAMES) if (new RegExp(name, "i").test(text)) fail(`${f.slice(site.length + 1)}: names ${name}`);
}

if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1); }
console.log(`ok: ${languages.length} languages, ${pages.length} pages, the demo`);
