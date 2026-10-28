# Claims and evidence

Every factual statement in `listing.md`, and every answer on the Privacy tab, is listed here with the file that proves it and a
quote from that file. A quote is a fragment of one line (no line numbers: they go stale with every commit), so anyone can check it
with `grep -n -F -- "<quote>" <file>`. A quote that no longer matches means the claim must be looked at again: either the code
changed (then the listing or the Privacy answer may be wrong) or the line was only renamed (then fix the quote).

To check them all: `node store/chrome/check-claims.mjs` from the repository root. It reads the tables below, searches every
backticked quote in the file(s) of its row and exits 1 if one is missing. Rows with no quote (a count, a grep, something observed)
are read by a person; they say "none" in the Quote column. In a Quote cell, `\|` is a pipe.

Checked on 2026-10-15 against commit `f1cd4f1` (version 2.41.0). The commit that adds this file changes only `store/`. Checked
again on 2026-10-28 (`main`, still 2.41.0): rows L41 and L42 added for what the description now says, L29 extended, and the
problems of section 4 that were fixed since are marked so.

## 1. Store listing claims

| # | Claim (as worded in listing.md) | File | Quote |
|---|---|---|---|
| L1 | Name "Better Scholar" | `src/manifest.json` · `src/_locales/en/messages.json` | `"name": "__MSG_extName__"` · `"message": "Better Scholar"` |
| L2 | Summary (from the package): 130 characters, the limit is 132 | `src/manifest.json` · `src/_locales/en/messages.json` · `test/i18n.test.js` | `"description": "__MSG_extDescription__"` · `On Google Scholar profiles: the profile owner's author role and the venue's CCF and CORE rank on each paper, counted in one table.` · `m.extName.message.length <= 75 && m.extDescription.message.length <= 132` |
| L3 | Works on Google Scholar profile pages | `src/content/main.js` · `src/content/scholar.js` | `Runs on Google Scholar profile pages only (the manifest matches /citations*, and` · `!B.scholar.isProfile()) return;` · `const isProfile = () => !!$("#gsc_prf_in") && !!$("#gsc_a_b");` |
| L4 | Rows where the owner is first, co-first, second or last author are tinted; other positions stay plain | `src/lib/names.js` · `src/lib/analysis.js` · `src/_locales/en/messages.json` | `'cofirst' \| 'first' \| 'last' \| 'second' \| 'middle'` · `const ROLE_KEYS = ["first", "cofirst", "second", "last"];` · `ROLE_KEYS.includes(a.role) && !!roles[a.role]` · `Papers where you are in the middle stay plain.` |
| L5 | The owner's name is marked | `src/lib/prefs.js` · `src/content/main.js` | `bool("rows.name", true, "Mark your own name in the author line of a highlighted row (bold, tinted).` · `if (!prefs.rows.name \|\| row.a.fromDetail) return tipOnLine();` |
| L6 | CCF list, 7th edition (2026); ICORE 2026 conference ranking | `src/_locales/en/messages.json` · `src/data/ccf.js` · `src/data/core.js` | `China Computer Federation list, 7th edition (2026).` · `CORE conference ranking, ICORE 2026.` · `"label":"CCF 2026 (7th edition)"` · `"label":"ICORE 2026"` |
| L7 | A rank chip whose tooltip says how the venue was matched | `src/content/chips.js` | `const RULE_TEXT = { name: "ruleName", acronym: "ruleAcronym", prefix: "rulePrefix", mine: "ruleMine" };` · `edition + " — " + t("tipToday")` |
| L8 | Venues it cannot match get no chip and are listed in the panel | `src/content/main.js` · `src/lib/prefs.js` · `src/content/panel.js` · `src/_locales/en/messages.json` | `for (const k of shown) chips.push(chip.tierChip(k, a.venue[k], edition[k],` · `const ranked = RANKS.filter((k) => drawn[k] && v[k]), w = winner(prefs, drawn);` · `if (sp.unranked && c.unmatched.length) {` · `$N1$ papers at venues without a rank` |
| L9 | Role × rank table; click a cell to list those papers | `src/content/panel.js` · `src/_locales/en/messages.json` | `onClick: () => cb.onSelect({ role: r.role, tier: c })` · `Papers by role and rank` |
| L10 | Citation totals and h-index of the highlighted papers; a chart by year | `src/lib/prefs.js` · `src/_locales/en/messages.json` | `part("metrics", "Citation totals (papers, citations, h-index, i10-index) of all papers and of the highlighted ones."` · `Papers, citations, h-index and i10-index of the highlighted papers.` · `Highlighted papers by year` |
| L11 | Award chips from a bundled list of 7,830 paper awards at major conferences | `src/data/awards.js` · `src/_locales/en/messages.json` | `"meta":{"label":"Paper awards (curated)","edition":"2026-10","count":7830}` · `a bundled list of award-winning papers at major conferences` |
| L12 | Oral, Spotlight and Highlight labels that authors write in the title or venue | `src/_locales/en/messages.json` | `the words that authors write in a paper's title or venue line on Scholar (not checked)` |
| L13 | Search: press / and type `role:first ccf:a cites:>100` (the test instructions add `type:journal` and `type:conference`) | `src/content/main.js` · `src/lib/query.js` · `src/_locales/en/messages.json` | `if (e.key === "/" && !typing) {` · `example: "cites:>100"` · `example: "ccf:a"` · `example: "role:first"` · `example: "type:journal"` · `suggest: ["type:conference", "type:journal"]` · `Press / to search` |
| L14 | Copy and export: the summary or the papers shown as plain text, a table, APA, BibTeX, Markdown, JSON or CSV (and IEEE, GB/T 7714 and the table as a picture, off until switched on, so the default row is eight buttons) | `src/lib/prefs.js` · `src/content/main.js` | `const COPY_BUTTONS = ["summary", "table", "image", "papers", "apa", "ieee", "gbt", "bibtex", "markdown", "json", "csv"];` · ``bool(`panel.copy.${k}`, !COPY_OFF.includes(k), COPY_DOC[k]`` · `const COPY_OFF = ["image", "ieee", "gbt"];` · `csv: "Copy button: the papers shown as CSV (RFC 4180)."` · `B.dom.downloadFile((safe \|\| "scholar") + "-papers.csv", text);` |
| L15 | The toolbar button gives the same data | `src/popup/popup.js` | `Toolbar popup: the same role × tier summary as the in-page panel` · `copyKinds.map((kind) => h("button", { class: "btn", "data-act": "copy-" + kind,` · `const res = await call("export", { format: kind, html: true,` |
| L16 | Page events for scripts or AI agents give the same data | `src/lib/agent.js` · `src/content/main.js` | `const EVENTS = { request: "better-scholar:request", response: "better-scholar:response", marker: "data-rr-ready" };` · `const methods = {` · `ping: () =>` · `summary: ({ filtered = false } = {}) => {` · `papers: ({ filtered = true } = {}) =>` · `export: async ({ format, source, html, filtered }) =>` · `filter: (p) => {` · `clearFilters: () =>` |
| L17 | A switch for each role and panel part; your own colours; merging duplicate entries; hiding parts of the profile page | `src/lib/prefs.js` | ``...ROLES.map((r) => bool(`roles.${r}`, true, ROLE_DOC[r]`` · ``bool(`panel.${id}.show`, show, doc, { label: "optShowSection", ...(popup ? {} : { parent: "panel.show" }) })`` · `color("colors.first", "Row colour of the first-author role` · `bool("mergeDuplicates", false, "Count a paper once when Scholar lists it twice` · `bool("hide.cited", false, "Hide Scholar's whole` |
| L18 | 30 languages | `src/lib/i18n.js` · `test/i18n.test.js` | `const LANGUAGES = [` · `assert.deepEqual(dirs, [...i18n.codes].sort());` |
| L19 | Reopening search and profile pages in a language you choose (off unless chosen) | `src/lib/prefs.js` · `src/content/lang-redirect.js` | `language("scholarLanguage", "keep", "Language Google Scholar pages are opened in.` · `/^\/(scholar\|citations)\/?$/.test(location.pathname)` · `if (!hl) { clear(); return; }` |
| L20 | Ranks are today's CCF and CORE lists, not the rank at publication | `src/_locales/en/messages.json` | `Ranks come from today's $N1$ lists, not the rank at publication time.` · `current list, not the rank at publication` |
| L21 | CCF states that its list is not a basis for academic evaluation | `src/_locales/en/messages.json` · `NOTICE` | `CCF states that its list is not a basis for academic evaluation.` · `the catalogue is not a basis for academic evaluation` |
| L22 | By default it presses the page's own "Show more" button about once a second, only while the tab is in front | `src/lib/prefs.js` · `src/content/main.js` · `src/content/scholar.js` | `bool("autoLoad", true, "Press Scholar's own` · `foregroundOnly: origin === "auto"` · `const TIMING = { pause: 600, jitter: 400, rowTimeout: 9000, regrace: 1500 };` · `const foreground = () => !foregroundOnly \|\| !document.hidden;` |
| L23 | It stops if no more rows arrive; a setting turns it off | `src/content/main.js` · `src/content/scholar.js` · `src/_locales/en/messages.json` | `maxStalls: origin === "auto" ? 1 : 2` · `if (++stalls >= maxStalls)` · `return "stalled";` · `Load all papers automatically` |
| L24 | "Read full lists" opens each paper's own page on the same site, only when you click it, about once a second | `src/content/panel.js` · `src/content/detail.js` | `onClick: () => cb.onResolve() }, t("resolveBtn")` · `1000 + Math.random() * 600` · `if (url.origin !== location.origin) throw` · `fetch(url.href, { credentials: "include", signal })` |
| L25 | It stops at the first CAPTCHA | `src/content/detail.js` | `#captcha-form, #gs_captcha_ccl, form[action*='sorry'], #recaptcha` · `res.status === 429 \|\| res.status === 503` · `return { done, stopped: "captcha" };` |
| L26 | Semantic Scholar: off by default; asked first for those lists | `src/lib/prefs.js` · `src/content/detail.js` | `bool("semanticScholar", false,` · `Semantic Scholar first when the settings allow it` |
| L27 | Each Semantic Scholar request's only content is the paper's title (and your API key, if you add one); no cookies are sent | `src/content/semantic.js` | `API + "?fields=title,authors,year&query=" + encodeURIComponent(title)` · `credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", headers: apiKey ? { "x-api-key": apiKey } : {}` |
| L28 | No account, no analytics, no ads: the only `fetch(` calls in `src/` are the four quoted here (three requests, and the popup reading back the `data:` address of the picture the page drew), and none of `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `new Image(` occurs (the greps of section 3) | `src/content/detail.js` · `src/content/semantic.js` · `src/background.js` · `src/popup/popup.js` | `fetch(url.href, { credentials: "include", signal })` · `const res = await fetch(url, { signal, credentials: "omit"` · `fetch(chrome.runtime.getURL("_locales/" + msg.lang + "/messages.json"))` · `blob = res.result.png ? await (await fetch(res.result.png)).blob() : null;` |
| L29 | Settings, name spellings and venue mappings in Chrome's storage | `src/content/store.js` | `get("sync", "prefs")` · `get("sync", "variants")` · `all[profileId] = list.slice(-8)` · `const loadMine = async () => cleanMine(await get("sync", "mine"));` |
| L30 | Author lists it has read stay on this device for 90 days | `src/content/store.js` · `src/_locales/en/messages.json` | `get("local", "resolved")` · `const TTL = 90 * 24 * 3600 * 1000;` · `(kept for 90 days)` |
| L31 | One permission, storage | `src/manifest.json` · `test/extension.test.js` | `"storage"` · `assert.deepEqual(manifest.permissions, ["storage"]);` · `assert.equal(manifest.host_permissions, undefined, "content-script matches are enough");` |
| L32 | Runs only on Scholar's pages | `test/extension.test.js` | `for (const p of m) assert.match(p, /^https:\/\/scholar\.google\.[a-z.]+\/citations\*$/, p);` · `assert.deepEqual(r.matches, m.map((p) => p.replace(/\/citations\*$/, "/*")));` |
| L33 | Free and open source (Apache 2.0) | `LICENSE` · `package.json` | `Version 2.0, January 2004` · `"license": "Apache-2.0"` |
| L34 | Independent project, not affiliated with or endorsed by Google | `NOTICE` | `project and is not affiliated with, endorsed by, or sponsored by Google or CCF.` |
| L36 | The table, the papers, APA, IEEE and GB/T 7714 also go to the clipboard as HTML (said in the description, the test instructions and the Privacy answers) | `src/content/dom.js` · `src/content/main.js` · `src/popup/popup.js` · `src/lib/formats.js` | `"text/html": new Blob([html], { type: "text/html" })` · `} else if (await copyText(text, exportHtml(kind, { filtered: true }))) panel.flash(kind);` · `if (kind === "apa") return formats.apaHtml(paperRecords(), { markMe: !!prefs.rows.name });` · `else if (await copyText(res.result.text, res.result.html)) say(button, t("copied"));` · `the clipboard's second flavour: HTML` |
| L37 | Your own names for titles and buttons | `src/lib/prefs.js` | `const nameRow = (key, ui) => text("labels." + key,` · `const NAME_MAX = 30;` |
| L38 | The look and colours of the chips | `src/lib/prefs.js` | `{ id: "lists", name: "optChipThemeLists"` · `color("colors.ccf", "Colour of the CCF chips` |
| L39 | A live preview that you edit by hovering it (hide, move, rename); a box that checks a venue against the lists | `src/options/options.js` · `src/options/editor.js` | `editor = B.editor.attach({ aside: document.querySelector(".preview")` · `btn("pv-x", "✕"` · `btn("pv-grip", "⠿"` · `btn("pv-edit", "✎"` · `"data-act": "venue-check"` · `resolver = resolver \|\| makeResolver();` |
| L40 | With a filter on, the table, the awards counts and the copy summary count the papers the filters leave (a year range or `age:<5` gives the table of those years); the search language has `age:` | `src/content/main.js` · `src/lib/query.js` · `src/lib/prefs.js` | `function counted() {` · `if (!prefs.panel.filters.follow \|\| !scopeFiltering()) return live();` · `{ name: "age"` · `bool("panel.filters.follow", true,` |
| L41 | A venue it cannot match can be tied by you to a listed one; its chip then says it is your own mapping | `src/lib/venues.js` · `src/content/chips.js` · `src/_locales/en/messages.json` | `out[m.list] = badge(m.list, m.row, "mine");` · `(info.rule === "mine" ? " rr-chip-mine" : "")` · `Your own mapping (settings → Check a venue), not the list's rule` |
| L42 | The papers and the reference styles paste into a word processor with the profile owner's name in bold | `src/lib/formats.js` · `src/content/main.js` | `const ownToHtml = (html) => html.replace(/\u0002/g, "<b>").replace(/\u0003/g, "</b>");` · `if (kind === "gbt") return formats.gbtHtml(paperRecords(), { markMe: !!prefs.rows.name });` |

Counts used in the listing and measured on 2026-10-15 (not quotable): 187 domains and 374 match patterns (`manifest.json`; the
187 equal the 187 entries of https://www.google.com/supported_domains fetched that day), 7,830 awards, 30 locale folders, the
description of 3,048 characters (`listing.md`, re-counted 2026-10-28).

### Reviewer test instructions (listing.md, last section)

The expected results for the five rows were computed on 2026-10-15 with the extension's own libraries (`src/lib/analysis.js`
with the bundled data, at `f1cd4f1`) on the rows Scholar printed that day: a signed-out fetch of the test profile
(`https://scholar.google.com/citations?user=JicYPdAAAAAJ&hl=en`) listed "Articles 1–20", most cited first, with these five rows
as numbers 1 to 5.

| Row (Scholar's text: title / author line / venue line) | Role | Chips |
|---|---|---|
| "Imagenet classification with deep convolutional neural networks" / "A Krizhevsky, I Sutskever, GE Hinton" / "Advances in neural information processing systems 25, 2012" | last (3 of 3) | CCF A NeurIPS, CORE A* NeurIPS, Test of time (`src/data/awards.js` has `["imagenetclassificationwithdeepconvolutionalneuralnetworks","krizhevsky","NeurIPS",2022,"tot","Test of Time Award"]`) |
| "Deep learning" / "Y LeCun, Y Bengio, G Hinton" / "Nature 521 (7553), 436-44, 2015" | last | none (Nature is on neither list) |
| "Visualizing data using t-SNE" / "L van der Maaten, G Hinton" / "Journal of Machine Learning Research 9 (Nov), 2579-2605, 2008" | last (2 of 2; `names.js`: "In a two-author paper the second author is the senior (last) author") | CCF A JMLR |
| "Dropout: a simple way to prevent neural networks from overfitting" / "N Srivastava, G Hinton, A Krizhevsky, I Sutskever, R Salakhutdinov" / "The journal of machine learning research 15 (1), 1929-1958, 2014" | second | CCF A JMLR |
| "Learning internal representations by error-propagation" / "DE Rumelhart, GE Hinton, RJ Williams" / "Parallel Distributed Processing: Explorations in the Microstructure of …, 1986" | second | none |

The "Check a venue" examples (step 7 of the instructions), computed the same way with the page's own resolver
(`createResolver` over `src/data/ccf.js`, `src/data/core.js`, `src/data/aliases.js`):

| Text typed into "Check a venue" | Result |
|---|---|
| "Proceedings of the IEEE conference on computer vision and pattern recognition" (the box's own placeholder) | CCF A, "IEEE/CVF Computer Vision and Pattern Recognition Conference (CVPR)", matched by name; CORE A*, "IEEE Conference on Computer Vision and Pattern Recognition (CVPR)", matched by name |
| "Findings of the Association for Computational Linguistics: ACL 2023" | no rank; the box says "finding" marks a secondary track (a workshop, a poster, a short paper …) and gets no rank |

Other statements in the test instructions:

| Statement | File | Quote |
|---|---|---|
| Panel at the top of the right-hand column, above the list in a narrow window | `src/content/scholar.js` | `top of the right sidebar on wide layouts,` · `above the paper list on narrow ones` · `side.insertBefore(panel, side.firstChild)` · `table.parentNode.insertBefore(panel, table)` |
| Default role colours blue, amber, green | `src/popup/popup.js` | `first: "var(--rr-c-first, #1a73e8)"` · `second: "var(--rr-c-second, #f9ab00)"` · `last: "var(--rr-c-last, #1e8e3e)"` |
| "Loading… N" with "Cancel" while the list loads | `src/content/panel.js` · `src/_locales/en/messages.json` | `c.loadingAll ? t("loadingAll", [String(c.loaded)])` · `onClick: () => cb.onCancelLoad() }, t("cancel")` · `Loading… $N1$` |
| Settings > Paper list > "Load all papers automatically" | `src/lib/prefs.js` · `src/_locales/en/messages.json` | `card("load", "optLoadTitle"` · `bool("autoLoad", true,` · `Paper list` · `Load all papers automatically` |
| Settings > Semantic Scholar is off by default | `src/lib/prefs.js` · `src/_locales/en/messages.json` | `card("semantic", "optSemanticTitle"` · `bool("semanticScholar", false,` · `Read author lists from Semantic Scholar first` |
| "Read full lists" is offered when Scholar cut off author lists | `src/content/panel.js` | `if (c.hidden > 0 \|\| c.resolving) {` · `t("resolveBtn")` |
| The panel's and the popup's settings buttons open the settings page, in a tab | `src/content/main.js` · `src/background.js` · `src/popup/popup.js` · `src/manifest.json` | `chrome.runtime.sendMessage({ type: "rr:options" })` · `if (msg.type === "rr:options") chrome.runtime.openOptionsPage();` · `chrome.runtime.openOptionsPage(); window.close();` · `"open_in_tab": true` |
| Loading stops when Scholar sends no more rows; paper reading stops at the first CAPTCHA | `src/content/scholar.js` · `src/content/detail.js` | `return "stalled";` · `stopped: "captcha"` |
| When loading stops early the panel says "Scholar sent no more papers (N loaded). Try “Load all” again in a moment." | `src/content/main.js` · `src/_locales/en/messages.json` | `state.loadMessage = stopped === "stalled" ? t("loadStalled", [String(state.rows.length)]) : "";` · `Scholar sent no more papers ($N1$ loaded). Try “Load all” again in a moment.` |
| The example rows are among the first 20 | (the live profile) | none: observed 2026-10-15, the signed-out fetch listed "Articles 1–20" and the five rows were numbers 1 to 5 |
| "Copy as table", "Copy papers" and "Copy APA" put text and HTML on the clipboard; the extension never reads the clipboard | `src/content/dom.js` · `src/content/main.js` | `"text/html": new Blob([html], { type: "text/html" })` · `if (kind === "table") { const s = summaryOf(source, filtered); return formats.summaryHtml(s.summary, summaryWords(filtered, s.src)); }` · `if (kind === "papers") return formats.papersHtml(` · `await navigator.clipboard.writeText(text);` |
| The settings page's preview is the real panel over sample rows; hovering a part gives ✕ (hide), ⠿ (move), ✎ (rename) and ⚙ (jump to its setting), and a tray "Hidden: N" shows what was hidden | `src/options/options.html` · `src/options/options.js` · `src/options/editor.js` · `src/_locales/en/messages.json` | `<div id="pv-panel"></div>` · `editor = B.editor.attach({ aside: document.querySelector(".preview")` · `btn("pv-x", "✕"` · `btn("pv-grip", "⠿"` · `btn("pv-edit", "✎"` · `btn("pv-go", "⚙"` · `Hover a part to hide it (✕), move it (⠿) or find its setting (⚙).` · `Hidden: $N1$` |
| The "Check a venue" card tells what the CCF and CORE lists make of a pasted venue, and by which rule, using the bundled lists (and the person's own venue mappings, marked as theirs) | `src/options/options.js` · `src/options/options.html` · `src/_locales/en/messages.json` | `function checkVenue() {` · `const makeResolver = () => B.venues.createResolver({ ccf: B.data.ccf.venues, core: B.data.core.venues, aliases: B.aliases, mine });` · `<script src="../data/ccf.js"></script>` · `<script src="../data/core.js"></script>` · `<script src="../data/aliases.js"></script>` · `Check a venue` · `e.g. Proceedings of the IEEE conference on computer vision and pattern recognition` |

## 2. Privacy tab answers

| # | Answer (listing.md, Privacy tab) | File | Quote |
|---|---|---|---|
| P1 | Single purpose: roles and venue ranks on Scholar profile pages | `src/content/main.js` · `src/lib/prefs.js` | `Content-script entry: wires the Scholar page, the analysis libraries and the panel.` · `What the extension draws, and per-device view state.` · `const CARDS = [` |
| P2 | `storage`: settings and name spellings in `chrome.storage.sync` | `src/content/store.js` | `get("sync", "prefs")` · `get("sync", "variants")` · `all[profileId] = list.slice(-8)` · `while (Object.keys(all).length > 40 ||` |
| P3 | `storage`: panel state, the cache (author lists, venue text and page ranges) and the API key in `chrome.storage.local` | `src/content/store.js` · `src/content/detail.js` · `src/_locales/en/messages.json` | `get("local", "ui")` · `get("local", "resolved")` · `get("local", "s2key")` · `set("local", "askVenue"` · `cache[item.id] = { authors: d.authors, venue: d.venue, ...(d.pages ? { pages: d.pages } : {}), ts: Date.now() };` · `const RESOLVED_BUDGET = 3000000;` · `on this device only (never synced), sent only to Semantic Scholar` · `View saved details` · `Clear saved paper details` |
| P4 | Nothing in storage is sent to the developer: the only requests go to the Scholar page's own origin and to `api.semanticscholar.org`, and nothing else sends (the greps of section 3) | `src/content/detail.js` · `src/content/semantic.js` | `if (url.origin !== location.origin) throw` · `const API = "https://api.semanticscholar.org/graph/v1/paper/search/match";` |
| P5 | Host access comes only from two content scripts | `test/extension.test.js` | `assert.equal(cs.length, 2);` · `assert.equal(m.length, 187);` |
| P6 | Script 1: `/citations*` on 187 domains; draws only on profile pages | `src/manifest.json` · `src/content/scholar.js` | `"https://scholar.google.com/citations*"` · `const isProfile = () => !!$("#gsc_prf_in") && !!$("#gsc_a_b");` |
| P7 | Script 2: every path on the same domains, at document start; acts only on `/scholar` and `/citations`, only when a language is chosen | `src/manifest.json` · `src/content/lang-redirect.js` | `"https://scholar.google.com/*"` · `"run_at": "document_start"` · `/^\/(scholar\|citations)\/?$/.test(location.pathname)` · `if (!hl) { clear(); return; }` · `location.replace(location.pathname` |
| P8 | Why 187 domains: a match pattern cannot wildcard the top-level domain; the list is generated from Google's published list (the 187 equal that list, fetched 2026-10-15) | `scripts/update-scholar-domains.sh` | `Scholar is served from every Google country domain` · `"https://scholar.google.*/*" is rejected` · `SOURCE="https://www.google.com/supported_domains"` |
| P9 | Remote code: none; every script is in the package | `test/extension.test.js` · `src/options/options.html` · `src/popup/popup.html` | `"dynamic code in " + f` · `"no inline scripts (they would break the extension CSP)"` · `<script src="../lib/i18n.js"></script>` · `<script src="popup.js"></script>` |
| P10 | Fetched data is never executed | `src/content/detail.js` · `src/content/semantic.js` · `src/background.js` | `new DOMParser().parseFromString(html, "text/html")` · `(await res.json()).data` · `fetch(chrome.runtime.getURL("_locales/" + msg.lang + "/messages.json"))` |
| P11 | The page-event listener runs only six fixed, validated calls and executes nothing it receives | `src/content/bridge.js` · `src/lib/agent.js` | `const checked = B.agent.validate(method, params);` · `if (!own(METHODS, method)) return { ok: false, error:` · `const METHODS = {` |
| P12 | Page calls cannot read or change settings or start a network request. The 28 lines of `main.js` between `const methods = {` and `B.bridge.install(methods);` have no `B.detail`, `B.semantic`, `startLoad`, `B.store.`, `fetch(`, `chrome.`, `copyText` or `downloadFile`: `sed -n '/const methods = {/,/B.bridge.install(methods);/p' src/content/main.js \| grep -c -E 'B\.detail\|B\.semantic\|startLoad\|B\.store\.\|fetch\(\|chrome\.\|copyText\|downloadFile'` prints 0 | `src/content/bridge.js` · `src/content/main.js` | `they cannot read or change the` · `const methods = {` · `B.bridge.install(methods);` |
| P13 | Data: website content is read, cached, and (opt-in) titles sent | `src/content/scholar.js` · `src/content/store.js` · `src/content/semantic.js` | `title: link ? link.textContent.trim() : "",` · `async function saveResolved(map) {` · `encodeURIComponent(title)` |
| P14 | Data: an optional API key (a credential) is stored and sent only to Semantic Scholar | `src/content/store.js` · `src/content/semantic.js` | `get("local", "s2key")` · `headers: apiKey ? { "x-api-key": apiKey } : {}` |
| P15 | Data: names (author names on the page; name spellings the user adds) | `src/content/scholar.js` · `src/content/store.js` | `const ownerName = () => (($("#gsc_prf_in") \|\| {}).textContent \|\| "").trim();` · `all[profileId] = list.slice(-8)` |
| P16 | Data: no browsing history, location, user activity, communications, health or financial data. No `chrome.history`, no geolocation (section 3); the only page-wide key handler is `/` and Escape and stores nothing; the other page-wide listeners close the panel's own menus on an outside press, scroll or resize, redraw on resize and notice a press of Scholar's "Show more"; none records anything | `src/content/main.js` · `src/content/panel.js` · `src/popup/popup.js` | `if (e.key === "/" && !typing) {` · `} else if (e.key === "Escape" && !typing &&` · `e.target.closest("#gsc_bpf_more")` · `window.addEventListener("scroll", onScroll, true);` · `chrome.tabs.query({ active: true, currentWindow: true })` |
| P17 | The only transfer: titles to Semantic Scholar, on a switch the user turns on, after an in-UI explanation | `src/lib/prefs.js` · `src/_locales/en/messages.json` · `src/content/panel.js` | `bool("semanticScholar", false,` · `Read author lists from Semantic Scholar first` · `It gets the paper's title and nothing else.` · `First asks Semantic Scholar for each paper's author list (it gets only the title)` · `t(m.prefs.semanticScholar ? "resolveHintSemantic" : "resolveHint")` |
| P18 | No preset turns the network option on | `src/lib/prefs.js` · `test/prefs.test.js` | `the choice of network use (semanticScholar) and the language are not touched` · `no preset switches a network call on` |
| P19 | Clipboard and files only after a click; the table, papers and APA buttons put text and HTML on the clipboard; the clipboard is never read. Every `copyText(` and `downloadFile(` call (7 and 3) sits in a button's handler, and `clipboard.read` and `readText` occur nowhere (section 3) | `src/content/dom.js` · `src/content/main.js` · `src/content/panel.js` · `src/popup/popup.js` · `src/options/options.js` | `"text/html": new Blob([html], { type: "text/html" })` · `await navigator.clipboard.writeText(text);` · `onCopy(kind) { return deliver(kind); },` · `onClick: () => cb.onCopy(kind) },` · `onClick: deliver(kind) }, t(B.dom.COPY_LABEL[kind])` · `data-act": "agent-guide-copy", onClick: async () => {` · `data-act": "config-export", onClick: () => B.dom.downloadFile(` |
| P20 | Privacy policy URL | `src/options/options.js` | `["lnk-privacy", "https://boyugou.github.io/better-scholar/privacy/", t("optLinkPrivacy")]` |
| P21 | Support URL | `src/content/dom.js` · `src/options/options.js` | `const REPO = "https://github.com/boyugou/better-scholar";` · `B.dom.REPO + "/issues/new/choose"` |
| P22 | The settings page and the popup make no request of their own (no `fetch(` in `src/options/` or `src/popup/`: section 3); "Check a venue" uses the bundled lists | `src/options/options.html` · `src/options/options.js` | `<script src="../data/ccf.js"></script>` · `const makeResolver = () => B.venues.createResolver({ ccf: B.data.ccf.venues, core: B.data.core.venues, aliases: B.aliases, mine });` |

## 3. What the code does on the network, in storage and on the page (grep over `src/`)

Searched in `src/` with `src/data/` and `src/_locales/` left out (bundled data and strings only), 2026-10-15, at `f1cd4f1`, and
again on 2026-10-28 at `8a21ae41` (what changed: a fourth `fetch(`, of a `data:` address; the clipboard's picture; 8 copy calls):

| Pattern | Hits | What they are |
|---|---|---|
| `fetch(` | 4 | `popup/popup.js`: the `data:` address of the picture *Copy as image* drew in the page, turned back into a PNG for the clipboard (no request leaves the browser); `content/detail.js`: the paper's own Scholar page, same origin only, cookies included; `content/semantic.js`: `api.semanticscholar.org`, `credentials: "omit"`, `referrerPolicy: "no-referrer"`; `background.js`: the extension's own `_locales/<lang>/messages.json` through `chrome.runtime.getURL`. None in `options/` or `popup/`. |
| `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `importScripts`, `new Worker`, `new Image(` | 0 | |
| `eval(`, `new Function`, `import(`, `innerHTML`, `insertAdjacentHTML`, `document.write`, `WebAssembly` | 0 | (one comment in `content/dom.js` says "no innerHTML") |
| `document.cookie` | 0 | |
| `localStorage` | 1 file | `content/scholar.js`: key `rr-load-lock`, value `{ id: <random>, t: <time> }`, in the Scholar origin's storage, taken before each automatic "Show more" press and removed when the run ends |
| `sessionStorage` | 1 file | `content/lang-redirect.js`: key `rr-hl`, value `<language>\|<time>`, in the Scholar tab's session storage, so that a redirect happens at most once per tab and language |
| `indexedDB`, `caches.` | 0 | |
| `postMessage`, `onMessageExternal`, `externally`, `chrome.runtime.connect`, `onConnect`, a `message` listener on `window` | 0 | no way in from another page or extension but the page events below; the manifest has no `externally_connectable` and no `web_accessible_resources` (`test/extension.test.js` checks the second) |
| `clipboard`, `ClipboardItem`, `execCommand` | `content/dom.js` | `navigator.clipboard.write` of a `ClipboardItem` with `text/plain` and `text/html` (the table, papers, APA, IEEE and GB/T 7714 buttons give both; the others give text only), then `navigator.clipboard.writeText`, then a hidden textarea and `document.execCommand("copy")`; for *Copy as image* (`copyImage`) a `ClipboardItem` with `image/png` and `text/plain`; called only from button handlers. `clipboard.read` and `clipboard.readText`: 0 (the one `readText` in `src/` is a function of `lib/analysis.js`) |
| `download` | `content/dom.js` | a Blob and a temporary `<a download>`; callers: CSV (`main.js`, `popup.js`) and the settings file (`options.js`) |
| `copyText(`, `copyImage(` and `downloadFile(` | 7, 2 and 3 calls | in `main.js` (`deliver`, `onCopyUnmatched`), `popup.js` (`deliver`) and `options.js` (bug-report details, cache JSON, config JSON, agent guide; the config file): each inside a button's handler |
| `chrome.storage` keys | 6 | sync: `prefs`, `variants`; local: `ui`, `resolved`, `s2key`, `askVenue` (`content/store.js`); `content/dom.js` and `content/lang-redirect.js` also read `prefs` |
| `chrome.tabs` | popup only | `popup.js` `chrome.tabs.query({ active: true, currentWindow: true })` (only `tab.id` is used) and `chrome.tabs.sendMessage` (no `tabs` permission is needed for either) |
| other `chrome.*` APIs (`history`, `cookies`, `webRequest`, `scripting`, `downloads`, `identity`, `permissions`, `alarms`, `notifications`), geolocation | 0 | |
| `navigator.userAgent` | 1 | `options.js`, only in the text of the settings page's "Copy details for a bug report" button |
| `chrome.runtime` messages | 3 types | `rr:call` (popup → content script, `bridge.js`), `rr:options` (`main.js` → `background.js`), `rr:messages` (`dom.js` → `background.js`); `background.js` drops messages from any other sender (`sender.id !== chrome.runtime.id`) |
| page events | 2 + marker | `better-scholar:request` (listened to), `better-scholar:response` (dispatched), attribute `data-rr-ready="true"` on `<html>` (`bridge.js`, `agent.js`) |
| hard-coded URLs in code (besides the SVG namespace `http://www.w3.org/2000/svg`) | 6 | `popup.js` scholar.google.com (a link), `options.js` the privacy page (a link), `dom.js` the GitHub repository (links), `semantic.js` the API endpoint and a comment, `query.js` a comment (`http://…`). `src/data/ccf.js` holds 679 dblp and publisher URLs from the CCF list; they are data, never requested and never shown as links. |

## 4. Problems found

Severity: **Blocker** means fix before you press Submit (the policy URL, the homepage and the screenshots are part of the
submission). **Should fix** means a reviewer or a user could read it as false. **Minor** means wrong but unlikely to matter to the
review. Nothing here was edited: the code, the documents and the site are the maintainer's.

Re-checked on 2026-10-15 against `f1cd4f1`. Fixed since the first check (2.39.0), and so removed from these tables: in PRIVACY.md,
the second script's scope, the storage list, the Limited Use statement, the cookies of *Read full lists*, the content of the
Semantic Scholar request, the page-event interface, the Report links and the service worker; the "100% Offline & Private" badge on
the homepage; in README.md and README.zh-CN.md, the network, runtime-messaging, event-name, operator, CSV, preset and
unit-test-count statements; the "origin fencing" sentence in SECURITY.md; CONTRIBUTING.md; AGENTS.md (now generated from
`src/lib/agent.js`); docs/ARCHITECTURE.md; the old `docs/store/README.md`; the `"ready"` marker and the `agentBridge` setting in
the agent guide; the settings page's "Nothing is sent anywhere" sentence; the store images of 2.38.1.

### 4.1 Things the original brief said that the code contradicts

Kept so that the listing never goes back to the first wording. All three are handled in `listing.md`.

| What was said | What is true |
|---|---|
| "content scripts run on about 200 scholar.google.<tld> domains under /citations*" | 187 domains and two content scripts, so 374 patterns. Only the main script is limited to `/citations*`. The second (`lib/i18n.js` + `content/lang-redirect.js`) matches `https://scholar.google.<domain>/*` at `document_start` and acts on `/scholar` and `/citations` (`src/manifest.json`, `lang-redirect.js`). |
| "Network: only the Scholar pages the user opens, plus pressing Show more …" | Also, on a click of *Read full lists*, `fetch` of each paper's own Scholar page with the user's Scholar cookies (`detail.js`, `credentials: "include"`). |
| "chrome.storage.local holds per-device view state, a cache …, and an optional Semantic Scholar API key" | True, and the extension also writes two keys in the Scholar site's own web storage: `localStorage["rr-load-lock"]` and `sessionStorage["rr-hl"]` (section 3). |

### 4.2 PRIVACY.md and its copy on the site (https://boyugou.github.io/better-scholar/privacy/, the privacy policy URL)

The live page was fetched with `curl` on 2026-10-15. It carried the text of `src/privacy.md` on the `site` branch, which equalled
PRIVACY.md except for one paragraph (first row). **All three fixed** (checked 2026-10-28): the site no longer keeps a copy, its
`build.mjs` builds the page from the repository's PRIVACY.md; the live page has the clipboard section (with *Copy as image*) and
no stray asterisk; PRIVACY.md says what `summary` returns (the profile's name, the lists' editions and counts, no paper's title,
authors or venue: `summary` in `content/main.js`).

| Sev. | Quote | What is true |
|---|---|---|
| Fixed (was Blocker) | (missing on the site) PRIVACY.md, Clipboard: "*Copy as table*, *Copy papers* and *Copy APA* put the same content on the clipboard twice, as text and as HTML (which a word processor reads as a real table or as italics); the HTML is made from the same data and contains nothing else" | The live policy page, the policy URL you submit, does not have it (`diff` of `site:src/privacy.md` and PRIVACY.md; the live HTML has no "twice"). The Privacy tab and the policy URL must agree, and the reviewer compares them. Run `npm run sync-privacy` on the `site` branch, deploy, and check the live page for "as text and as HTML" (step A1 of the kit's `README.md`) before the policy URL is entered. |
| Fixed (was Should fix) | PRIVACY.md, Page events: "`summary` also reports a few display settings: which rank lists and copy buttons are on, whether the table and the awards counts are shown, and how talks are counted." | `summary` in `content/main.js` returns `{ owner, loaded, shown, loadingAll, layoutBroken, edition, noRanks, summaries, marks, metrics }`: numbers only. CHANGELOG 2.40.0: "The `summary` call returns the numbers only (not the display settings)". The sentence describes 2.39.0 and overstates what a page can learn; delete it (then sync the site). |
| Fixed (was Should fix) | PRIVACY.md breaks four emphasised phrases over two lines (it hard-wraps its lines at about 120 characters): *Read full lists* (twice, in different places), *Copy APA* and *Copy cache (JSON)* | The site's renderer reads emphasis line by line, so the live page shows stray asterisks and shifted italics: "click *Read full lists*, the extension first asks", "*Copy APA, Copy BibTeX, … Copy list* under the unranked venues", "*Copy cache (JSON) … bug report*", "the author lists that *Read full lists* saved". Keep each emphasised phrase on one line (or make the renderer join lines). The policy URL is the page a reviewer reads. |

### 4.3 The project homepage (https://boyugou.github.io/better-scholar/, the Homepage URL)

| Sev. | Quote | What is true |
|---|---|---|
| Fixed (was Should fix) | The search section's operator cards on every language page: `>100 >=50 <10`, `role:first role:last r:cofirst`, `>2020 year:>=2021` (live `/en/` fetched with `curl`; the source is `OPERATORS` in `build.mjs` on the `site` branch) | The search reads only the explicit operators `cites:`, `year:`, `ccf:`, `core:`, `role:`, `type:` and `has:` (`src/lib/query.js`; the bare comparisons and the short names went in 2.39.0, `type:` came in 2.41.0). A bare `>100` or `>2020` is searched as text, and `r:` is not an operator. Use `cites:>100 cites:>=50 cites:<10`, `role:cofirst`, `year:>2020`. |
| Minor | "A Chrome Web Store listing may follow." | Replace it with the store link after publishing (step G2 of the kit's README). |

The badge now says "Runs in your browser" (live `/en/`, 2026-10-15); "100% Offline & Private" is gone. Checked 2026-10-28: the
operator cards show only operators the search reads (`role:first`, `type:journal`, `cites:>100` …; `verify.mjs` on the `site`
branch now fails when an operator of `lib/query.js` has no card); the store sentence reads "A Chrome Web Store version may come
later" and stays until the store link exists.

### 4.4 README.md and README.zh-CN.md

| Sev. | Quote | What is true |
|---|---|---|
| Fixed (was Minor) | README.md and README.zh-CN.md: "npm run test:e2e   # 78 end-to-end checks" / "78 项端到端检查" | A test count: commit `9970baa` says "the docs no longer carry test counts (a CI badge instead)", and this one cannot be checked without running `npm run test:e2e`. Drop the number. |
| Fixed (was Minor) | README.md and README.zh-CN.md, repository layout: "docs/   Architecture, roadmap, store listing kit, pictures" | `docs/` holds `ARCHITECTURE.md` and `ROADMAP.md`; the store kit is `store/`, which the layout does not show. |
| Fixed (was Minor) | README.md and README.zh-CN.md, page calls table: `export` result "`{ format, text }`", and no `html` parameter | The call takes `html: true` and then returns `html` as well (`METHODS.export` in `src/lib/agent.js`; the paragraph under *Copy and export* says so). |

All three fixed (checked 2026-10-28): the counts in the README are counted by `scripts/numbers.mjs` and checked by
`test/numbers.test.js` (rounded down where they grow: "500+ · 90+ · 15"); the layout shows `store/`; the page calls' table names
`html` for `table`, `papers`, `apa`, `ieee` and `gbt`, the `image` format and its `png`, and `test/readme-examples.test.js` now
fails when a call, a parameter, a format or a record field of `lib/agent.js` is missing from it.

### 4.5 SECURITY.md, CONTRIBUTING.md, AGENTS.md, docs

Nothing open. SECURITY.md now says there is no origin check and what a call can do; CONTRIBUTING.md names the 30 locales;
AGENTS.md is generated from `src/lib/agent.js` (`npm run agents:doc`); docs/ARCHITECTURE.md lists `rr-load-lock`, `rr-hl` and
`s2key`.

### 4.6 Text that ships inside the extension

| Sev. | File, quote | What is true |
|---|---|---|
| Fixed (was Minor) | `src/_locales/en/messages.json` `optStorage`: "Scholar pages are read only when you open them, and paper titles go to Semantic Scholar only if you switch that on." | Correct for the pages you open. *Read full lists* (on a click) also requests each paper's own Scholar page, which you did not open, with your Scholar cookies (`detail.js`), as PRIVACY.md says. "…only when you open them or press Read full lists" would be exact. |
| Fixed (was Minor) | `src/lib/agent.js` (the guide users copy; AGENTS.md is made from it), step 3: "pastes it into *Settings → Configuration → Config editor* and presses **Apply**" | The labels on the page are "Configuration & presets" (`optConfigTitle`), "Paste or edit a configuration (JSON)" (`optConfigEditor`) and "Apply configuration" (`optConfigApply`). |
| Fixed (was Minor) | `src/lib/agent.js` `METHODS.papers.result`: `{ owner, total, papers: [{ id, title, authors, venue, year, citations, role, status, highlighted, rank, marks, url }] }` | The records also carry `type` (`"conference"`, `"journal"` or `null`: `paperRecords` in `content/main.js`, `lib/formats.js`, README.md). |

All three fixed (checked 2026-10-28): `optStorage` names *Read full lists*; the guide names *Configuration & presets*, *Paste or
edit a configuration (JSON)* and *Apply configuration*; the `papers` result lists `type` (and `pages`, `me`).

### 4.7 Manifest and package

| Sev. | Finding | Detail |
|---|---|---|
| Minor | `short_name` is 14 characters | "Better Scholar"; the manifest reference recommends at most 12 ("maximum of 12 characters recommended"). Only a recommendation; it does not block upload. |
| Minor (fixed 2026-10-17) | Spanish description was exactly 132 characters | The new summary is 130 characters in English and at most 132 in the other locales (Danish, Greek, Spanish, Dutch and Brazilian Portuguese are exactly 132) (`test/i18n.test.js` checks every locale against 132). |
| None | Permissions, host permissions, web-accessible resources | `storage` only; no `host_permissions`, `optional_permissions`, `web_accessible_resources` or `externally_connectable`. Nothing to remove. |
| Note | Bundled third-party data | `NOTICE`: "CORE's terms of use have not been confirmed". Not a review item, but it is the one intellectual-property question in the package. |

### 4.8 Store images (made by `npm run store:images`)

The images were made again on 2026-10-28 from that day's `main` (the popup's copy buttons two to a row, the preview's current
hint); screenshot 1's caption and the marquee no longer promise a chip for every listed venue. See `screenshots-plan.md`.

| Sev. | Finding | Detail |
|---|---|---|
| Note | Guidance only | The small tile carries the name and a line of text (the image guide says "Avoid text"); the icon's artwork fills the square instead of 96×96 with 16 px of transparent padding. |
