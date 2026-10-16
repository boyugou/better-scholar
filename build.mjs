#!/usr/bin/env node
// Builds the site into _site/: one page per language (/<code>/), a root page that sends visitors to their language,
// a sitemap with hreflang alternates, the assets, and the web demo (/demo/). No dependencies. Every link is relative, so
// the site works at any base path (a GitHub Pages project site lives under /<repo>/).
//   SITE_URL   the public address, used only for canonical / sitemap / social-card links
//   REPO_URL   the extension's GitHub repository
//   EXT_DIR    the extension's repository on this machine (default: ../google-scholar-highlighter, next to this one). The site takes three
//              things from it at build time and keeps no copy: the hero picture (store/chrome/images/screenshot-1.jpg), the demo (its own
//              scripts/build-demo.mjs builds the real settings page into _site/demo), the text of the export samples (src/lib/formats.js) and the
//              numbers of the "By the numbers" section (scripts/numbers.mjs counts them from the extension's code and data).
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const SITE_URL = (process.env.SITE_URL || "https://boyugou.github.io/better-scholar").replace(/\/$/, "");
const REPO_URL = (process.env.REPO_URL || "https://github.com/boyugou/better-scholar").replace(/\/$/, "");
const EXT_DIR = resolve(process.env.EXT_DIR || join(root, "..", "google-scholar-highlighter"));
const out = join(root, "_site");

// What the extension's repository must hold for this build: said plainly, because the likeliest cause of a failure is a wrong EXT_DIR
const HERO = join(EXT_DIR, "store", "chrome", "images", "screenshot-1.jpg");
const needed = (file, what) => {
  if (existsSync(file)) return file;
  console.error(`build: ${what} not found: ${file}\n  EXT_DIR (${EXT_DIR}) must be the extension's repository, at a commit that has it. Set EXT_DIR=/path/to/google-scholar-highlighter.`);
  process.exit(1);
};
needed(HERO, "the hero picture");
const DEMO_BUILDER = needed(join(EXT_DIR, "scripts", "build-demo.mjs"), "the demo builder (scripts/build-demo.mjs)");
const FORMATS = needed(join(EXT_DIR, "src", "lib", "formats.js"), "the export code (src/lib/formats.js)");
const EXT_WORDS = needed(join(EXT_DIR, "src", "_locales", "en", "messages.json"), "the extension's English strings");
const NUMBERS = needed(join(EXT_DIR, "scripts", "numbers.mjs"), "the numbers (scripts/numbers.mjs)");

// the size of a JPEG, read from its header: the page states it, so that nothing moves while the picture loads
function jpegSize(file) {
  const b = readFileSync(file);
  if (b[0] !== 0xff || b[1] !== 0xd8) throw new Error(file + " is not a JPEG");
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error("no size in " + file);
}
const hero = jpegSize(HERO);
// The store screenshot has a headline and a line of English above its browser window (scripts/store-images.mjs there: the window starts 156 px down).
// The page says the same in its own words and its own language, so the picture is shown from just above the window: this many pixels are cut at the top.
// (0 shows all of it. A new layout of the picture needs a look at the page: the figure below is the place.)
const HERO_CUT = 140;
const languages = JSON.parse(readFileSync(join(root, "src", "languages.json"), "utf8"));
const strings = Object.fromEntries(languages.map((l) => [l.code, JSON.parse(readFileSync(join(root, "src", "i18n", l.code + ".json"), "utf8"))]));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The order of the language menu: the languages most read first (the current one on top of the list is marked, not moved)
const ORDER = ["en", "zh-CN", "zh-TW", "es", "hi", "pt-BR", "id", "ja", "fr", "de", "ru", "ko", "vi", "tr", "th", "it", "pl", "nl", "el", "ro", "uk", "pt-PT", "cs", "sv", "da", "fi", "no", "hu", "ar", "he"];
const menu = ORDER.map((c) => languages.find((l) => l.code === c)).filter(Boolean);
for (const l of languages) if (!menu.includes(l)) menu.push(l);

// (the four role colours, in turn: the colour code of the product, not a rainbow)
const FEATURES = [
  ["roles", "#4d8ff5"], ["ranks", "#b36cf6"], ["summary", "#fbbc04"], ["awards", "#34a853"],
  ["complete", "#4d8ff5"], ["merge", "#b36cf6"], ["yours", "#fbbc04"], ["private", "#34a853"]
];

// The export section shows what the extension's own export code writes (src/lib/formats.js of EXT_DIR) for the invented papers of the settings
// page's preview, where "A Author" is you: the text a copy button puts on the clipboard, never sample output made by hand, and no real person's papers.
const formats = createRequire(import.meta.url)(FORMATS);
const words = JSON.parse(readFileSync(EXT_WORDS, "utf8"));
const w = (key) => { if (!words[key]) throw new Error(`the extension's English strings have no "${key}"`); return words[key].message; };
const EXPORTS = [["bibtex", "BibTeX (LaTeX-Ready)"], ["apa", "APA 7th Edition"], ["json", "Structured JSON"], ["markdown", "GitHub Markdown"], ["csv", "RFC-4180 CSV"]];

function exportSamples() {
  const ranked = (name, ccf, core) => ({ ccf: { tier: ccf, name }, core: { rank: core, name } });
  const paper = (n, authors, venue, year, citations, role, name, marks) => ({
    id: "sample-" + n, title: "Sample paper " + n, authors, venue, year, citations, role, status: "found", highlighted: true, type: "conference",
    rank: ranked(name, "A", "A*"), marks, url: ""
  });
  const papers = [
    paper(1, "A Author, B Writer, C Writer, D Writer", "ICLR 2025 (Oral)", 2025, 48, "first", "International Conference on Learning Representations", [w("markOral")]),
    paper(2, "B Writer, A Author, C Writer", "NeurIPS 2024", 2024, 133, "second", "Conference on Neural Information Processing Systems", [w("mkBest") + " (NeurIPS 2024)"]),
    paper(3, "A Author*, B Writer*, C Writer", "CVPR 2024 (Highlight)", 2024, 27, "cofirst", "IEEE/CVF Conference on Computer Vision and Pattern Recognition", [w("markHighlight")]),
    paper(4, "B Writer, C Writer, D Writer, A Author", "ACL 2023 (Spotlight)", 2023, 215, "last", "Annual Meeting of the Association for Computational Linguistics", [w("markSpotlight")])
  ];
  const labels = {
    year: w("tsvYear"), title: w("tsvTitle"), authors: w("tsvAuthors"), role: w("tsvRole"), venue: w("tsvVenue"), ccf: w("srcCcf"), core: w("srcCore"),
    awards: w("tsvAwards"), citations: w("tsvCitations"), hidden: w("roleHidden"),
    roles: { first: w("copyFirst"), cofirst: w("copyCofirst"), second: w("copySecond"), last: w("copyLast"), middle: w("copyMiddle") }
  };
  const ctx = { ccfOn: true, coreOn: true };
  return {
    bibtex: formats.bibtex(papers, ctx),
    apa: formats.apa(papers),
    json: formats.json({ owner: "A Author", source: "ccf", papers }),
    markdown: formats.markdown(papers, ctx),
    csv: formats.papersCsv(papers, { labels, ...ctx }).replace(/^\ufeff/, "").replace(/\r\n/g, "\n")      // (the byte-order mark is for Excel, the line ends for a file)
  };
}
const samples = exportSamples();

// The numbers section: what the extension is made of, counted from its repository by its own scripts/numbers.mjs when this page is built, never typed here.
// A number that grows with every fix comes as "450+" (rounded down); the number is written in the page's language with Latin digits, whatever the language's own.
const { numbers: countNumbers, headline } = await import(pathToFileURL(NUMBERS).href);
const STATS = headline(countNumbers());
const stat = (text, code) => {
  const n = Number(text.replace(/[,+]/g, ""));
  return n.toLocaleString(code + "-u-nu-latn") + (text.endsWith("+") ? "+" : "");
};

// the operator cards of the search section: [key, the sample tokens shown on the card]
const OPERATORS = [
  ["cite", '<code>cites:&gt;100</code> <code>cites:&gt;=50</code> <code>cites:&lt;10</code>'],
  ["tier", "<code>ccf:a</code> <code>ccf:b</code> <code>core:a*</code>"],
  ["role", "<code>role:first</code> <code>role:last</code> <code>role:cofirst</code>"],
  ["year", "<code>year:&gt;2020</code> <code>year:&gt;=2021</code> <code>year:&lt;=2015</code>"],
  ["honors", "<code>has:award</code> <code>has:talk</code>"],
  ["reset", "<kbd>Escape</kbd>"]
];

function page(lang) {
  const t = (k) => esc(strings[lang.code][k] ?? strings.en[k]).replace(/chrome:\/\/extensions/g, "<code>chrome://extensions</code>");
  const url = `${SITE_URL}/${lang.code}/`;
  const demoUrl = `../demo/?lang=${lang.code}`;           // (the settings page, in this page's language: the demo reads ?lang= as the browser's language)
  const switcher = `<details class="lang">
        <summary aria-label="${t("nav.language")}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><span>${esc(lang.name)}</span></summary>
        <ul class="lang-menu">
${menu.map((l) => `          <li><a href="../${l.code}/" hreflang="${l.code}" lang="${l.code}" dir="${l.dir}"${l.code === lang.code ? ' aria-current="true"' : ""}>${esc(l.name)}</a></li>`).join("\n")}
        </ul>
      </details>`;

  return `<!doctype html>
<html lang="${lang.code}" dir="${lang.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t("meta.title")}</title>
<meta name="description" content="${t("meta.description")}">
<link rel="canonical" href="${url}">
${languages.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}/${l.code}/">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${SITE_URL}/">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="${t("meta.title")}">
<meta property="og:description" content="${t("meta.description")}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="../assets/styles.css">
<meta name="theme-color" content="#161d33">
<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Better Scholar", applicationCategory: "BrowserApplication", operatingSystem: "Chrome, Chromium browsers", description: strings[lang.code]["meta.description"] ?? strings.en["meta.description"], inLanguage: lang.code, url, image: `${SITE_URL}/assets/og.png`, license: "https://www.apache.org/licenses/LICENSE-2.0", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } }).replace(/</g, "\\u003c")}</script>
</head>
<body>
<header class="top">
  <div class="wrap bar">
    <a class="brand" href="./" aria-label="Better Scholar"><img src="../assets/icon.svg" width="30" height="30" alt=""><span>Better Scholar</span></a>
    <nav>
      <a href="${REPO_URL}">${t("nav.github")}</a>
      <a class="btn small" href="#install">${t("nav.install")}</a>
      ${switcher}
    </nav>
  </div>
</header>
<main>
  <section class="hero">
    <div class="wrap">
      <div class="hero-badges">
        <span class="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg> Manifest V3</span>
        <span class="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> Runs in your browser</span>
        <span class="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg> 0 Dependencies</span>
      </div>
      <div class="stripes" aria-hidden="true"><i style="--c:#4d8ff5"></i><i style="--c:#b36cf6"></i><i style="--c:#fbbc04"></i><i style="--c:#34a853"></i></div>
      <h1>${t("hero.title")}</h1>
      <p class="lead">${t("hero.sub")}</p>
      <p class="cta"><a class="btn" href="#install">${t("hero.install")}</a> <a class="btn ghost" href="${REPO_URL}">${t("hero.github")}</a></p>
      <p class="note">${t("hero.note")}</p>
    </div>
  </section>

  <section class="shots">
    <div class="wrap">
      <figure class="hero-shot">
        <div class="hero-frame" style="aspect-ratio: ${hero.width} / ${hero.height - HERO_CUT}">
          <img src="../assets/hero.jpg" alt="${t("shot.caption")}" width="${hero.width}" height="${hero.height}" fetchpriority="high" decoding="async">
        </div>
        <figcaption>${t("shot.caption")}</figcaption>
      </figure>
    </div>
  </section>

  <section class="try" id="try">
    <div class="wrap">
      <h2>${t("demo.title")}</h2>
      <p class="note">${t("demo.hint")}</p>
      <div class="try-bar">
        <a class="skip" href="#after-try">${t("demo.skip")}</a>
        <p>${t("demo.local")}</p>
        <a class="try-open" href="${demoUrl}" target="_blank" rel="noopener">${t("demo.open")}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg></a>
      </div>
      <div class="try-frame">
        <iframe src="${demoUrl}" title="${t("demo.frame")}" loading="lazy"></iframe>
      </div>
    </div>
  </section>

  <section class="export-section" id="after-try">
    <div class="wrap">
      <h2>${t("export.title")}</h2>
      <p class="note">${t("export.note")}</p>
      <div class="export-card">
        <div class="export-tabs" role="tablist" aria-label="${t("export.title")}">
${EXPORTS.map(([k, label], i) => `          <button type="button" class="tab-btn${i ? "" : " active"}" role="tab" id="tab-${k}" aria-selected="${i ? "false" : "true"}" aria-controls="export-${k}"${i ? ' tabindex="-1"' : ""}>${label}</button>`).join("\n")}
        </div>
        <div class="code-preview-wrap">
${EXPORTS.map(([k], i) => `          <pre class="code-preview" role="tabpanel" id="export-${k}" aria-labelledby="tab-${k}" tabindex="0"${i ? " hidden" : ""}><code>${esc(samples[k])}</code></pre>`).join("\n")}
          <button type="button" class="copy-code-btn" data-label="${t("export.copy")}" data-copied="${t("export.copied")}">${t("export.copy")}</button>
        </div>
      </div>
    </div>
  </section>

  <section class="operators-section">
    <div class="wrap">
      <h2>${t("ops.title")}</h2>
      <p class="note">${t("ops.note").replace("[/]", "<kbd>/</kbd>")}</p>
      <div class="operators-grid">
${OPERATORS.map(([k, head]) => `        <div class="op-card">
          <div class="op-header">${head}</div>
          <p class="op-title">${t(`ops.${k}.title`)}</p>
          <p class="op-desc">${t(`ops.${k}.text`)}</p>
        </div>`).join("\n")}
      </div>
    </div>
  </section>

  <section class="features">
    <div class="wrap grid">
${FEATURES.map(([k, c]) => `      <article style="--c:${c}"><h3>${t(`f.${k}.title`)}</h3><p>${t(`f.${k}.text`)}</p></article>`).join("\n")}
    </div>
  </section>

  <section class="numbers">
    <div class="wrap">
      <h2>${t("numbers.title")}</h2>
      <p class="note">${t("numbers.note")}</p>
      <div class="numbers-grid">
${STATS.map(([id, text], i) => `        <div class="num" style="--c:${FEATURES[i % 4][1]}"><b dir="ltr">${stat(text, lang.code)}</b><span>${t(`numbers.${id}`)}</span></div>`).join("\n")}
      </div>
    </div>
  </section>

  <section id="install" class="install">
    <div class="wrap">
      <h2>${t("install.title")}</h2>
      <ol>
        <li>${t("install.step1")}</li>
        <li>${t("install.step2")}</li>
        <li>${t("install.step3")}</li>
      </ol>
      <p class="note">${t("install.note")}</p>
    </div>
  </section>

  <section class="honest">
    <div class="wrap">
      <h2>${t("honest.title")}</h2>
      <p>${t("honest.text")}</p>
    </div>
  </section>
</main>
<footer>
  <div class="wrap">
    <span>${t("footer.license")}</span>
    <a href="../privacy/">${t("footer.privacy")}</a>
    <a href="${REPO_URL}/blob/main/ROADMAP.md">Roadmap</a>
    <a href="${REPO_URL}/blob/main/AGENTS.md">Agent API</a>
    <a href="${REPO_URL}/blob/main/SECURITY.md">Security</a>
    <a href="${REPO_URL}/issues">${t("footer.issues")}</a>
    <a href="${REPO_URL}">GitHub</a>
  </div>
</footer>
<script src="../assets/site.js" defer></script>
</body>
</html>
`;
}

// the root page: remembered choice, else the best match among the browser's languages, else English
function rootPage() {
  const codes = JSON.stringify(languages.map((l) => l.code));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(strings.en["meta.title"])}</title>
<meta name="description" content="${esc(strings.en["meta.description"])}">
<link rel="canonical" href="${SITE_URL}/">
${languages.map((l) => `<link rel="alternate" hreflang="${l.code}" href="${SITE_URL}/${l.code}/">`).join("\n")}
<link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="stylesheet" href="assets/styles.css">
<script>
(function () {
  var codes = ${codes}, pick = "en";
  try { var saved = localStorage.getItem("rr-lang"); if (saved && codes.indexOf(saved) >= 0) pick = saved; else throw 0; } catch (e) {
    var prefs = navigator.languages || [navigator.language || "en"], found = false;
    for (var i = 0; i < prefs.length && !found; i++) {
      var p = String(prefs[i]).replace("_", "-"), low = p.toLowerCase();
      var alias = { "zh": "zh-CN", "zh-hans": "zh-CN", "zh-sg": "zh-CN", "zh-hant": "zh-TW", "zh-hk": "zh-TW", "zh-mo": "zh-TW", "pt": "pt-BR", "nb": "no", "nn": "no", "iw": "he", "in": "id" };
      var cand = alias[low] || p;
      for (var j = 0; j < codes.length; j++) if (codes[j].toLowerCase() === cand.toLowerCase() || codes[j].toLowerCase() === cand.split("-")[0].toLowerCase()) { pick = codes[j]; found = true; break; }
    }
  }
  location.replace(pick + "/" + location.hash);
})();
</script>
<noscript><meta http-equiv="refresh" content="0; url=en/"></noscript>
</head>
<body class="redirect">
<main class="wrap"><h1>Better Scholar</h1>
<ul>
${languages.map((l) => `<li><a href="${l.code}/" hreflang="${l.code}" lang="${l.code}" dir="${l.dir}">${esc(l.name)}</a></li>`).join("\n")}
</ul></main>
</body>
</html>
`;
}

// PRIVACY.md as one English page
function inline(text) {
  return esc(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/(https:\/\/[^\s<)]+?)([.,]?)(?=\s|$|<)/g, '<a href="$1">$1</a>$2');
}
function privacyPage() {
  const lines = readFileSync(join(root, "src", "privacy.md"), "utf8").split("\n");
  // (a paragraph or a list item is read whole before its emphasis is: *two words* may be broken over two lines of the source)
  let html = "", list = false, para = [], item = null;
  const endItem = () => { if (item !== null) { html += `<li>${inline(item)}</li>\n`; item = null; } };
  const endList = () => { endItem(); if (list) { html += "</ul>\n"; list = false; } };
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>\n`; para = []; } };
  for (const line of lines) {
    if (/^# /.test(line)) { endList(); flush(); html += `<h1>${inline(line.slice(2))}</h1>\n`; }
    else if (/^- /.test(line)) { flush(); if (!list) { html += "<ul>\n"; list = true; } endItem(); item = line.slice(2); }
    else if (/^\s+\S/.test(line) && list) item += " " + line.trim();
    else if (!line.trim()) { endList(); flush(); }
    else if (list) { endList(); para.push(line.trim()); }
    else para.push(line.trim());
  }
  endList();
  flush();
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy: Better Scholar</title>
<meta name="description" content="What Better Scholar reads, stores and sends: nothing leaves your browser unless you switch on the Semantic Scholar lookup.">
<link rel="canonical" href="${SITE_URL}/privacy/">
<link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
<header class="top"><div class="wrap bar"><a class="brand" href="../" aria-label="Better Scholar"><img src="../assets/icon.svg" width="30" height="30" alt=""><span>Better Scholar</span></a><nav><a href="${REPO_URL}">GitHub</a></nav></div></header>
<main class="doc"><div class="wrap narrow">
${html}</div></main>
</body>
</html>
`;
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "src", "assets"), join(out, "assets"), { recursive: true });
copyFileSync(HERO, join(out, "assets", "hero.jpg"));            // (the extension's own picture: nothing of it is kept in this repository)
// the demo is the extension's own build of its real settings page (what it does, and what it needs: docs/ARCHITECTURE.md there, "The web demo")
execFileSync(process.execPath, [DEMO_BUILDER, "--out", join(out, "demo")], { stdio: "inherit" });
for (const l of languages) {
  mkdirSync(join(out, l.code), { recursive: true });
  writeFileSync(join(out, l.code, "index.html"), page(l));
}
writeFileSync(join(out, "index.html"), rootPage());
mkdirSync(join(out, "privacy"), { recursive: true });
writeFileSync(join(out, "privacy", "index.html"), privacyPage());
writeFileSync(join(out, "404.html"), rootPage().replace('location.replace(pick + "/" + location.hash);', 'location.replace(location.pathname.replace(/[^/]*$/, "") + pick + "/");'));
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
// for AI assistants that look for a site's own description (llmstxt.org): what the extension is, and where everything an agent needs is kept
writeFileSync(join(out, "llms.txt"), `# Better Scholar

> A free, open-source Chrome extension for Google Scholar profile pages. It works out the profile owner's authorship role in each paper (first, co-first, second, last), matches each venue against the CCF (2026, 7th edition) and CORE (ICORE 2026) lists, marks award-winning papers and Oral / Spotlight / Highlight talks, and sums it up in a panel: a role x rank table, citation totals, papers per year, a search box with operators, and copy / export buttons. It runs in the browser and has no analytics.

Better Scholar can be set up and read by an AI assistant: the agent guide lists every setting with its path and allowed values, the page calls (events on the Scholar page) and the search syntax.

## For agents

- [Agent guide](${REPO_URL}/blob/main/AGENTS.md): every setting, the page calls, the search syntax, the rules (generated from the code)
- [README](${REPO_URL}/blob/main/README.md): features, search operators, copy and export formats
- [Privacy policy](${SITE_URL}/privacy/): what is stored, what is sent (Scholar's own pages; Semantic Scholar only if switched on)

## Try it

- [The real settings page, running in the browser](${SITE_URL}/demo/): change a setting and the preview changes; nothing leaves the browser
- [Source code and install steps](${REPO_URL})
`);
writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${languages.map((l) => `<url><loc>${SITE_URL}/${l.code}/</loc>\n${languages.map((a) => `  <xhtml:link rel="alternate" hreflang="${a.code}" href="${SITE_URL}/${a.code}/"/>`).join("\n")}\n</url>`).join("\n")}
<url><loc>${SITE_URL}/privacy/</loc></url>
</urlset>
`);
console.log(`built ${languages.length} languages into _site/ (${SITE_URL})`);
