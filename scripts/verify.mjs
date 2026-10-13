#!/usr/bin/env node
// Checks the built site: every language has every string (none left in English by accident is NOT checked: that is a translation matter),
// every page exists with the right lang / dir, no unreplaced template text, every relative link and asset resolves.
import { readFileSync, existsSync } from "node:fs";
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

const pages = [["index.html", null], ...languages.map((l) => [`${l.code}/index.html`, l])];
for (const [rel, l] of pages) {
  const f = join(site, rel);
  if (!existsSync(f)) { fail("not built: " + rel); continue; }
  const html = readFileSync(f, "utf8");
  if (l && !html.includes(`<html lang="${l.code}" dir="${l.dir}">`)) fail(`${rel}: wrong lang/dir`);
  if (/\{\{|\}\}|undefined|\[object/.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) fail(`${rel}: unreplaced text`);
  for (const m of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:)/.test(ref)) continue;
    const target = normalize(join(dirname(f), ref.split("?")[0]));
    if (!existsSync(target) && !existsSync(join(target, "index.html"))) fail(`${rel}: broken link ${ref}`);
  }
}
if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1); }
console.log(`ok: ${languages.length} languages, ${pages.length} pages`);
