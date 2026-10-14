#!/usr/bin/env node
// Builds the site into _site/: one page per language (/<code>/), a root page that sends visitors to their language,
// a sitemap with hreflang alternates, and the assets. No dependencies. Every link is relative, so the site works at any
// base path (a GitHub Pages project site lives under /<repo>/).
//   SITE_URL   the public address, used only for canonical / sitemap / social-card links
//   REPO_URL   the extension's GitHub repository
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const SITE_URL = (process.env.SITE_URL || "https://boyugou.github.io/better-scholar").replace(/\/$/, "");
const REPO_URL = (process.env.REPO_URL || "https://github.com/boyugou/better-scholar").replace(/\/$/, "");
const out = join(root, "_site");
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

// Rich interactive demo dataset: representative high-impact publications
const DEMO = [
  {
    id: "p1",
    role: "first",
    title: "Chord: A Scalable Peer-to-peer Lookup Protocol for Internet Applications",
    venue: "ACM SIGCOMM",
    year: 2001,
    citations: 24510,
    chips: ["CCF A", "CORE A*"],
    award: "★ Test of Time",
    authors: ["Ion Stoica", "Robert Morris", "David Karger", "M. Frans Kaashoek", "Hari Balakrishnan"]
  },
  {
    id: "p2",
    role: "last",
    title: "Spark: Cluster Computing with Working Sets",
    venue: "USENIX HotCloud",
    year: 2010,
    citations: 16840,
    chips: [],
    award: "★ Best Paper",
    authors: ["Matei Zaharia", "Mosharaf Chowdhury", "Michael J. Franklin", "Scott Shenker", "Ion Stoica"]
  },
  {
    id: "p3",
    role: "last",
    title: "Ray: A Distributed Framework for Emerging AI Applications",
    venue: "USENIX OSDI",
    year: 2018,
    citations: 4120,
    chips: ["CCF A", "CORE A*"],
    award: "",
    authors: ["Philipp Moritz", "Robert Nishihara", "Stephanie Wang", "Alexey Tumanov", "Ion Stoica"]
  },
  {
    id: "p4",
    role: "first",
    title: "An Architecture for Bounded-Latency Services in the Internet",
    venue: "IEEE Transactions on Networking",
    year: 2001,
    citations: 2890,
    chips: ["CCF A"],
    award: "",
    authors: ["Ion Stoica", "Hui Zhang"]
  },
  {
    id: "p5",
    role: "second",
    title: "Coflow: A Networking Abstraction for Cluster Applications",
    venue: "ACM HotNets",
    year: 2012,
    citations: 1350,
    chips: [],
    award: "★ Best Paper",
    authors: ["Mosharaf Chowdhury", "Ion Stoica"]
  },
  {
    id: "p6",
    role: "cofirst",
    title: "L2P-FL: Latency-aware Personalized Federated Learning",
    venue: "IEEE INFOCOM",
    year: 2024,
    citations: 185,
    chips: ["CCF A", "CORE A*"],
    award: "Oral",
    authors: ["Ion Stoica*", "A Collaborator*", "B Researcher", "C Scientist"]
  }
];

// the operator cards of the search section: [key, the sample tokens shown on the card]
const OPERATORS = [
  ["cite", '<code>&gt;100</code> <code>&gt;=50</code> <code>&lt;10</code>'],
  ["tier", "<code>ccf:a</code> <code>ccf:b</code> <code>core:a*</code>"],
  ["role", "<code>role:first</code> <code>role:last</code> <code>r:cofirst</code>"],
  ["year", "<code>&gt;2020</code> <code>year:&gt;=2021</code>"],
  ["honors", "<code>has:award</code> <code>has:talk</code>"],
  ["reset", "<kbd>Escape</kbd>"]
];

function demoAuthors(authors, you) {
  return authors.map((a) => {
    if (a.startsWith("Ion Stoica")) {
      const star = a.includes("*") ? "*" : "";
      return `<mark>${you}${star}</mark>`;
    }
    return esc(a);
  }).join(", ");
}

function page(lang) {
  const t = (k) => esc(strings[lang.code][k] ?? strings.en[k]).replace(/chrome:\/\/extensions/g, "<code>chrome://extensions</code>");
  const url = `${SITE_URL}/${lang.code}/`;
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
        <span class="badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg> 100% Offline &amp; Private</span>
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
        <picture>
          <source media="(max-width: 700px)" srcset="../assets/panel.png">
          <img src="../assets/screenshot.png" alt="${t("shot.caption")}" width="1360" height="945" loading="eager">
        </picture>
        <figcaption>${t("shot.caption")}</figcaption>
      </figure>
    </div>
  </section>

  <section class="demo" id="demo" data-copied="${t("export.copied")}" data-empty="${t("export.empty")}">
    <div class="wrap">
      <h2>${t("demo.title")}</h2>
      <p class="note">${t("demo.hint")}</p>
      <div class="mockup-window">
        <div class="mockup-bar" aria-hidden="true">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="mockup-title">Google Scholar — Ion Stoica · Better Scholar Active</div>
          <div class="window-spacer"></div>
        </div>
        <div class="mockup-body">
          <div class="scholar-header">
            <div class="scholar-avatar" aria-hidden="true">IS</div>
            <div class="scholar-meta">
              <div class="scholar-name">Ion Stoica <svg class="verified-icon" width="16" height="16" viewBox="0 0 24 24" fill="#1a73e8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>
              <div class="scholar-affil">Professor of Computer Science, UC Berkeley · ACM Fellow</div>
              <div class="scholar-stats">
                <span><strong>184,200+</strong> Citations</span>
                <span><strong>h-index:</strong> 142</span>
                <span><strong>i10-index:</strong> 380</span>
              </div>
            </div>
          </div>
          <div class="mockup-search-row">
            <div class="search-wrap">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" id="demo-search-input" placeholder="${t("demo.search")}" aria-label="${t("demo.search")}" autocomplete="off">
              <kbd class="kbd">/</kbd>
            </div>
            <div class="pill-group" id="demo-operator-pills">
              <button type="button" class="pill active" data-query="">${t("demo.all")}</button>
              <button type="button" class="pill" data-query="ccf:a">ccf:a</button>
              <button type="button" class="pill" data-query="role:first">role:first</button>
              <button type="button" class="pill" data-query=">1000">&gt;1000</button>
              <button type="button" class="pill" data-query="year:>=2020">&ge;2020</button>
              <button type="button" class="pill" data-query="has:award">has:award</button>
            </div>
          </div>
          <div class="roles" role="group" aria-label="${t("demo.title")}">
${["first", "cofirst", "second", "last"].map((r) => `            <button type="button" class="role-btn" data-role="${r}" aria-pressed="true"><i></i>${t(`demo.role.${r}`)}</button>`).join("\n")}
          </div>
          <div class="mockup-content-grid">
            <div class="mockup-papers-col">
              <div class="demo-card" id="demo-papers-list" aria-live="polite">
${DEMO.map((d, i) => `                <div class="paper" data-role="${d.role}" data-id="${d.id}" data-citations="${d.citations}" data-year="${d.year}" data-venue="${esc(d.venue)}" data-award="${esc(d.award)}" data-chips="${d.chips.join(",")}" data-title="${esc(d.title)}">
                  <div class="paper-main">
                    <b class="ptitle">${esc(d.title)}</b>
                    <span class="auth">${demoAuthors(d.authors, t("demo.you"))}</span>
                    <span class="ven">${esc(d.venue)} (${d.year}) ${d.chips.map((c) => `<em class="${c.startsWith("CCF") ? "chip-ccf" : "chip-core"}">${c}</em>`).join("")}${d.award ? `<span class="award-chip">${esc(d.award)}</span>` : ""}</span>
                  </div>
                  <div class="paper-meta">
                    <span class="cites" title="Citations">${d.citations.toLocaleString()}</span>
                    <span class="year">${d.year}</span>
                  </div>
                </div>`).join("\n")}
              </div>
              <p class="demo-count">${t("demo.count")}: <b id="demo-n">6</b></p>
            </div>
            <div class="mockup-panel-col">
              <div class="mini-panel">
                <div class="mini-panel-header">
                  <span>${t("demo.panel")}</span>
                  <span class="mini-badge">CCF</span>
                </div>
                <div class="matrix-table-wrap">
                  <table class="mini-matrix">
                    <thead>
                      <tr><th>${t("demo.col.role")}</th><th>A</th><th>B</th><th>C</th><th>${t("demo.col.none")}</th></tr>
                    </thead>
                    <tbody>
                      <tr data-matrix-role="first"><td class="rlabel">${t("demo.role.first")}</td><td class="cell" data-filter="first:A">2</td><td class="cell zero">0</td><td class="cell zero">0</td><td class="cell zero">0</td></tr>
                      <tr data-matrix-role="cofirst"><td class="rlabel">${t("demo.role.cofirst")}</td><td class="cell" data-filter="cofirst:A">1</td><td class="cell zero">0</td><td class="cell zero">0</td><td class="cell zero">0</td></tr>
                      <tr data-matrix-role="second"><td class="rlabel">${t("demo.role.second")}</td><td class="cell zero">0</td><td class="cell zero">0</td><td class="cell zero">0</td><td class="cell" data-filter="second:none">1</td></tr>
                      <tr data-matrix-role="last"><td class="rlabel">${t("demo.role.last")}</td><td class="cell" data-filter="last:A">1</td><td class="cell zero">0</td><td class="cell zero">0</td><td class="cell" data-filter="last:none">1</td></tr>
                    </tbody>
                  </table>
                </div>
                <div class="mini-metrics">
                  <button type="button" class="metric-btn" id="demo-hcore" title="Filter to publications with &ge;142 citations">
                    <span>H-Core (&ge;142)</span>
                    <strong>6</strong>
                  </button>
                  <button type="button" class="metric-btn" id="demo-i10" title="Filter to publications with &ge;10 citations">
                    <span>i10-index (&ge;10)</span>
                    <strong>6</strong>
                  </button>
                </div>
                <div class="mini-export-bar">
                  <button type="button" class="export-btn" data-export="bibtex">BibTeX</button>
                  <button type="button" class="export-btn" data-export="apa">APA</button>
                  <button type="button" class="export-btn" data-export="json">JSON</button>
                  <button type="button" class="export-btn" data-export="markdown">Markdown</button>
                  <button type="button" class="export-btn" data-export="csv">CSV</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="toast-notification" id="demo-toast" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="export-section">
    <div class="wrap">
      <h2>${t("export.title")}</h2>
      <p class="note">${t("export.note")}</p>
      <div class="export-card">
        <div class="export-tabs" role="tablist">
          <button type="button" class="tab-btn active" data-tab="bibtex" role="tab">BibTeX (LaTeX-Ready)</button>
          <button type="button" class="tab-btn" data-tab="apa" role="tab">APA 7th Edition</button>
          <button type="button" class="tab-btn" data-tab="json" role="tab">Structured JSON</button>
          <button type="button" class="tab-btn" data-tab="markdown" role="tab">GitHub Markdown</button>
          <button type="button" class="tab-btn" data-tab="csv" role="tab">RFC-4180 CSV</button>
        </div>
        <div class="code-preview-wrap">
          <pre class="code-preview"><code id="export-code-display"></code></pre>
          <button type="button" class="copy-code-btn" id="copy-export-display" data-label="${t("export.copy")}">${t("export.copy")}</button>
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

  <section class="shots">
    <div class="wrap">
      <figure>
        <img src="../assets/settings.png" alt="${t("shot2.caption")}" width="1360" height="1180" loading="lazy">
        <figcaption>${t("shot2.caption")}</figcaption>
      </figure>
    </div>
  </section>

  <section class="features">
    <div class="wrap grid">
${FEATURES.map(([k, c]) => `      <article style="--c:${c}"><h3>${t(`f.${k}.title`)}</h3><p>${t(`f.${k}.text`)}</p></article>`).join("\n")}
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
    <a href="${REPO_URL}/issues">${t("footer.issues")}</a>
    <a href="${REPO_URL}">GitHub</a>
  </div>
</footer>
<script src="../assets/site.js" defer></script>
<script src="../assets/demo.js" defer></script>
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
  let html = "", list = false, para = [];
  const flush = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>\n`; para = []; } };
  for (const line of lines) {
    if (/^# /.test(line)) { flush(); html += `<h1>${inline(line.slice(2))}</h1>\n`; }
    else if (/^- /.test(line)) { flush(); if (!list) { html += "<ul>\n"; list = true; } else html += "</li>\n"; html += `<li>${inline(line.slice(2))}`; }
    else if (/^\s+\S/.test(line) && list) html += " " + inline(line.trim());
    else if (!line.trim()) { if (list) { html += "</li>\n</ul>\n"; list = false; } flush(); }
    else if (list) { html += "</li>\n</ul>\n"; list = false; para.push(line.trim()); }
    else para.push(line.trim());
  }
  if (list) html += "</li>\n</ul>\n";
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
writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${languages.map((l) => `<url><loc>${SITE_URL}/${l.code}/</loc>\n${languages.map((a) => `  <xhtml:link rel="alternate" hreflang="${a.code}" href="${SITE_URL}/${a.code}/"/>`).join("\n")}\n</url>`).join("\n")}
<url><loc>${SITE_URL}/privacy/</loc></url>
</urlset>
`);
console.log(`built ${languages.length} languages into _site/ (${SITE_URL})`);
