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
const SITE_URL = (process.env.SITE_URL || "https://boyugou.github.io/scholar-roles-and-ranks").replace(/\/$/, "");
const REPO_URL = (process.env.REPO_URL || "https://github.com/boyugou/scholar-roles-and-ranks").replace(/\/$/, "");
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

// The "Try it" demo: six invented papers, the reader's own name at the position that gives the row its role; the buttons switch roles on and off
const DEMO = [
  { role: "first", venue: "ICLR 2025", chips: ["CCF A", "CORE A*"] },
  { role: "second", venue: "NeurIPS 2024", chips: ["CCF A", "CORE A*"] },
  { role: "cofirst", venue: "CVPR 2024", chips: ["CCF A", "CORE A*"] },
  { role: "last", venue: "ACL 2023", chips: ["CCF A", "CORE A*"] },
  { role: "middle", venue: "EMNLP 2022", chips: ["CCF A", "CORE A*"] },
  { role: "last", venue: "AAAI 2021", chips: ["CCF A", "CORE A"] }
];
const OTHERS = ["B Writer", "C Writer", "D Writer"];
function demoAuthors(role, you) {
  const me = `<mark>${you}</mark>`;
  switch (role) {
    case "first": return [me, ...OTHERS].join(", ");
    case "cofirst": return [`${me}*`, "B Writer*", "C Writer"].join(", ");
    case "second": return ["B Writer", me, "C Writer"].join(", ");
    case "last": return [...OTHERS, me].join(", ");
    default: return ["B Writer", "C Writer", me, "D Writer"].join(", ");
  }
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
</head>
<body>
<header class="top">
  <div class="wrap bar">
    <a class="brand" href="./" aria-label="Scholar Roles &amp; Ranks"><img src="../assets/icon.svg" width="30" height="30" alt=""><span>Scholar Roles &amp; Ranks</span></a>
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
  <section class="demo" id="demo">
    <div class="wrap">
      <h2>${t("demo.title")}</h2>
      <p class="note">${t("demo.hint")}</p>
      <div class="roles" role="group" aria-label="${t("demo.title")}">
${["first", "cofirst", "second", "last"].map((r) => `        <button type="button" class="role-btn" data-role="${r}" aria-pressed="true"><i></i>${t(`demo.role.${r}`)}</button>`).join("\n")}
      </div>
      <div class="demo-card" aria-live="polite">
${DEMO.map((d, i) => `        <div class="paper" data-role="${d.role}"><b class="ptitle">${t("demo.paper")} ${i + 1}</b><span class="auth">${demoAuthors(d.role, t("demo.you"))}</span><span class="ven">${d.venue} ${d.chips.map((c) => `<em>${c}</em>`).join("")}</span></div>`).join("\n")}
      </div>
      <p class="demo-count">${t("demo.count")}: <b id="demo-n">0</b></p>
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
    <a href="${REPO_URL}/blob/main/PRIVACY.md">${t("footer.privacy")}</a>
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
<main class="wrap"><h1>Scholar Roles &amp; Ranks</h1>
<ul>
${languages.map((l) => `<li><a href="${l.code}/" hreflang="${l.code}" lang="${l.code}" dir="${l.dir}">${esc(l.name)}</a></li>`).join("\n")}
</ul></main>
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
writeFileSync(join(out, "404.html"), rootPage().replace('location.replace(pick + "/" + location.hash);', 'location.replace(location.pathname.replace(/[^/]*$/, "") + pick + "/");'));
writeFileSync(join(out, ".nojekyll"), "");
writeFileSync(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
writeFileSync(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${languages.map((l) => `<url><loc>${SITE_URL}/${l.code}/</loc>\n${languages.map((a) => `  <xhtml:link rel="alternate" hreflang="${a.code}" href="${SITE_URL}/${a.code}/"/>`).join("\n")}\n</url>`).join("\n")}
</urlset>
`);
console.log(`built ${languages.length} languages into _site/ (${SITE_URL})`);
