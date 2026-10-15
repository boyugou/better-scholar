#!/usr/bin/env node
// The web demo: the real settings page (the page options_ui names in src/manifest.json, and everything it loads) as a static folder that
// runs in an ordinary web page, so that a visitor can use it before installing anything. The page itself is not changed: a small stand-in
// for `chrome` (scripts/demo/shim.js) answers what it asks of the extension, and its settings stay in the visitor's own browser.
//
//   npm run build:demo                          writes dist/demo/ (git-ignored)
//   node scripts/build-demo.mjs --out <dir>     writes <dir> instead (the website's build asks for its own _site/demo this way)
//
// What goes into the folder is read from the page, never listed here: every script, stylesheet and picture the page names (and what a
// stylesheet's url() names), each at the same path under src/ as in the extension (so relative addresses keep their meaning), plus the icons
// and every language's messages.json. index.html is the page with its own scripts taken out and one tag put in their place: the stand-in's, which
// loads the strings first and then adds the page's scripts in the page's order. It has to be served over http (python3 -m http.server -d dist/demo):
// from file:// the browser will not let it read the strings.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..");
const src = path.join(repo, "src");
const shell = path.join(here, "demo");                                            // scripts/demo/: the stand-in and the note's style
const SHIM = "demo-shim.js", STYLE = "demo.css";                                  // (at the top of the folder, where no path under src/ can clash with them)

const fail = (msg) => { console.error("build-demo: " + msg); process.exit(1); };

// ---- arguments ----------------------------------------------------------------------------------------------------------------------------
let out = path.join(repo, "dist", "demo");
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--out" && args[i + 1]) out = path.resolve(args[++i]);
  else if (args[i].startsWith("--out=") && args[i].length > 6) out = path.resolve(args[i].slice(6));
  else fail("usage: node scripts/build-demo.mjs [--out <dir>]");
}
// the folder is emptied first: never one that holds the repository or the extension's own files. (Compared as the file system knows them: a way
// in through a symbolic link, such as macOS's /var for /private/var, must not slip past.)
const real = (p) => {
  const rest = [];
  let at = path.resolve(p);
  while (!fs.existsSync(at)) { rest.unshift(path.basename(at)); at = path.dirname(at); }
  return path.join(fs.realpathSync(at), ...rest);
};
const within = (child, parent) => { const r = path.relative(real(parent), real(child)); return r === "" || (!r.startsWith("..") && !path.isAbsolute(r)); };
if (within(repo, out) || within(out, src)) fail(`will not empty ${out}: it holds the repository or the extension's files`);

// ---- the page -----------------------------------------------------------------------------------------------------------------------------
const manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.json"), "utf8"));
const pageRel = manifest.options_ui && manifest.options_ui.page;
if (!pageRel) fail("src/manifest.json names no options_ui page");
const pageDir = path.posix.dirname(pageRel);
let html = fs.readFileSync(path.join(src, pageRel), "utf8");

const files = new Set();                                                          // the files of src/ the folder needs, as paths under src/
const scripts = [];                                                               // the page's own scripts, in its order
const sheets = [];

const isData = (ref) => /^data:/i.test(ref);
const isRemote = (ref) => !isData(ref) && /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref);

// A file the page names, as its path under src/. Only local files: the demo must run without the network, and a file that is not there is a
// mistake in the page, found now and not by a visitor.
function local(ref, from, what) {
  if (isRemote(ref)) fail(`${what} ${ref} is not a local file: the demo has to run without the network`);
  const rel = path.posix.normalize(path.posix.join(from, ref.split(/[?#]/)[0]));
  if (rel.startsWith("..") || path.posix.isAbsolute(rel)) fail(`${what} ${ref} is outside src/`);
  if (!fs.existsSync(path.join(src, rel))) fail(`${what} ${ref} (src/${rel}) does not exist`);
  files.add(rel);
  return rel;
}

// the page's scripts: noted in order and taken out of the page (the stand-in adds them once the strings are there). An inline script would run
// before the stand-in has defined `chrome`, so there is none to take: say so.
html = html.replace(/[ \t]*<script\b([^>]*)>([\s\S]*?)<\/script>[ \t]*\r?\n?/gi, (all, attrs, body) => {
  const s = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(" " + attrs);
  if (!s || body.trim() || /\stype\s*=\s*["']?module/i.test(attrs)) fail(`${pageRel} has a script that is not a plain <script src>: ${all.trim().slice(0, 80)}`);
  scripts.push(local(s[1] ?? s[2], pageDir, "script"));
  return "";
});
if (!scripts.length) fail(`${pageRel} loads no scripts`);
if (scripts.some((s) => /\s/.test(s))) fail("a script path with a space cannot be listed");

// the other files the page names: stylesheets, pictures, icons. A link to another page of the extension would lead nowhere here.
html = html.replace(/<([a-z][a-z0-9-]*)\b([^<>]*)>/gi, (tagText, tag, attrs) => {
  return tagText.replace(/(\s(?:src|href)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi, (attr, lead, dq, sq) => {
    const ref = dq ?? sq;
    if (tag.toLowerCase() === "a") {
      if (ref && !isRemote(ref) && !ref.startsWith("#")) fail(`${pageRel} links to ${ref}, a page the demo does not have`);
      return attr;
    }
    if (!ref || isData(ref) || ref.startsWith("#")) return attr;
    const rel = local(ref, pageDir, `<${tag.toLowerCase()}> ${tag.toLowerCase() === "link" ? "href" : "src"}`);
    if (tag.toLowerCase() === "link" && /rel\s*=\s*["']?stylesheet/i.test(attrs)) sheets.push(rel);
    return lead + '"' + rel + '"';
  });
});

// what a stylesheet names with url() travels with it (its own address does not change, so neither does the way it names them)
for (const sheet of sheets) {
  const css = fs.readFileSync(path.join(src, sheet), "utf8");
  if (/@import\b/i.test(css)) fail(`src/${sheet} uses @import, which the demo does not follow`);
  for (const m of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/gi)) {
    const ref = m[1] ?? m[2] ?? m[3];
    if (ref && !isData(ref) && !ref.startsWith("#")) local(ref, path.posix.dirname(sheet), `src/${sheet}: url()`);
  }
}

// the favicon (a page without one makes the browser ask for /favicon.ico) is the extension's own icon
const iconRel = manifest.icons && (manifest.icons["32"] || Object.values(manifest.icons)[0]);
if (!iconRel || !fs.existsSync(path.join(src, iconRel))) fail("src/manifest.json names no icon that exists");
files.add(iconRel);

// ---- what only a browser extension can read: the same file in an ordinary page would show it half-done ------------------------------------------
const FOREIGN = [[/__MSG_\w+__/, "a __MSG_…__ placeholder (Chrome fills those in for an extension's files only)"], [/chrome-extension:\/\//, "a chrome-extension:// address"]];
for (const rel of [...files].filter((f) => /\.(?:js|css|html)$/.test(f)).concat(pageRel)) {
  const lines = fs.readFileSync(path.join(src, rel), "utf8").split("\n");
  for (const [re, what] of FOREIGN) {
    const at = lines.findIndex((l) => re.test(l));
    if (at >= 0) fail(`src/${rel}:${at + 1} holds ${what}`);
  }
}
for (const clash of [SHIM, STYLE]) if (files.has(clash)) fail(`src/${clash} would be overwritten by the demo's own file`);

// ---- the page, with the demo's own parts --------------------------------------------------------------------------------------------------
const version = manifest.version;
const note = `<div class="rr-demo-note" role="note" lang="en" dir="ltr"><b>Demo</b> <span>Your changes are kept in this browser only.</span></div>`;
const head = [
  `<meta name="robots" content="noindex">`,                                           // (an app, not a page to find: the website holds the words)
  `<link rel="icon" href="${iconRel}">`,
  `<link rel="stylesheet" href="${STYLE}">`,
  ...scripts.map((s) => `<link rel="preload" as="script" href="${s}">`)               // (the stand-in adds the scripts one after the other: this fetches them all at once)
].map((l) => "  " + l).join("\n") + "\n";
const shimTag = `  <script src="${SHIM}" data-version="${version}" data-scripts="${scripts.join(" ")}"></script>\n`;

const inject = (needle, text, before) => {
  const at = html.search(needle);
  if (at < 0) fail(`${pageRel} has no ${needle}`);
  const end = at + html.match(needle)[0].length;
  html = before ? html.slice(0, at) + text + html.slice(at) : html.slice(0, end) + text + html.slice(end);
};
inject(/<\/head>/i, head, true);
inject(/<body\b[^>]*>\r?\n/i, "  " + note + "\n", false);
inject(/<\/body>/i, shimTag, true);

// ---- write --------------------------------------------------------------------------------------------------------------------------------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copy = (rel) => { fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true }); fs.copyFileSync(path.join(src, rel), path.join(out, rel)); };
for (const rel of files) copy(rel);
if (fs.existsSync(path.join(src, "icons"))) fs.cpSync(path.join(src, "icons"), path.join(out, "icons"), { recursive: true });
const languages = fs.readdirSync(path.join(src, "_locales")).filter((d) => fs.existsSync(path.join(src, "_locales", d, "messages.json")));
if (!languages.includes("en")) fail("src/_locales has no English");
for (const d of languages) copy(`_locales/${d}/messages.json`);
fs.copyFileSync(path.join(here, "demo", "shim.js"), path.join(out, SHIM));
fs.copyFileSync(path.join(shell, STYLE), path.join(out, STYLE));
fs.writeFileSync(path.join(out, "index.html"), html);

console.log(`demo built: ${path.relative(process.cwd(), out) || "."} (version ${version}: ${scripts.length} scripts, ${sheets.length} stylesheets, ${languages.length} languages)`);
