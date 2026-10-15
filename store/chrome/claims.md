# Claims and evidence

Every factual statement in `listing.md`, and every answer on the Privacy tab, is listed here with the file and a short quote
that proves it. Line numbers refer to commit `3a52a6e` (version 2.39.0). If a later commit changes one of these lines,
check the claim again before you resubmit.

The second half, **Problems found**, lists statements elsewhere in the repository (and on the project site) that the code
does not support, or that a reviewer could flag.

Checked on 2026-10-15.

## 1. Store listing claims

| # | Claim (as worded in listing.md) | File : line | Quote |
|---|---|---|---|
| L1 | Name "Better Scholar" | `src/manifest.json:3`, `src/_locales/en/messages.json:3` | `"name": "__MSG_extName__"` · `"message": "Better Scholar"` |
| L2 | Current summary (from the package) | `src/manifest.json:6`, `src/_locales/en/messages.json:6` | `"Enhance Google Scholar: authorship roles, CCF & CORE ranks, conference awards, year distribution charts, and instant search."` (124 characters) |
| L3 | Works on Google Scholar profile pages | `src/content/main.js:2-3, 7` | "Runs on Google Scholar profile pages only (the manifest matches /citations*, and isProfile() double-checks" · `!B.scholar.isProfile()) return;` |
| L4 | Rows where the owner is first, co-first, second or last author are tinted; other positions stay plain | `src/lib/names.js:224`, `src/_locales/en/messages.json:389` | "Role of the author at `idx`: 'cofirst' \| 'first' \| 'last' \| 'second' \| 'middle'" · "Papers where you are in the middle stay plain." |
| L5 | The owner's name is marked | `src/lib/prefs.js:34` | `bool("markName", true, "Mark your own name in the author line of a highlighted row (bold, tinted).")` |
| L6 | CCF list, 7th edition (2026); ICORE 2026 conference ranking | `src/_locales/en/messages.json:404, 410`; `src/data/ccf.js:8`; `src/data/core.js:8` | "China Computer Federation list, 7th edition (2026)." · "CORE conference ranking, ICORE 2026." · `"label":"CCF 2026 (7th edition)"` · `"label":"ICORE 2026"` |
| L7 | A rank chip whose tooltip says how the venue was matched | `src/content/chips.js:10, 18-19` | `const RULE_TEXT = { name: "ruleName", acronym: "ruleAcronym", prefix: "rulePrefix" };` · `edition + " — " + t("tipToday")` |
| L8 | Venues it cannot match get no chip and are listed in the panel | `src/_locales/en/messages.json:218`; `src/content/panel.js:509-523` | "$N1$ papers at venues without a rank" · `if (parts.status && c.unmatched.length) {` |
| L9 | Role × rank table; click a cell to list those papers | `src/_locales/en/messages.json:12`; `src/content/panel.js:426` | "Papers by role and rank" · `onClick: () => cb.onSelect({ role: undefined, tier: c })` |
| L10 | Citation totals and h-index of the highlighted papers; a chart by year | `src/lib/prefs.js:63-64`; `src/_locales/en/messages.json:476, 704` | "Papers, citations, h-index and i10-index of the highlighted papers." · "Highlighted papers by year" |
| L11 | Award chips from a bundled list of 7,830 paper awards at major conferences | `src/data/awards.js:8`; `src/_locales/en/messages.json:63` | `"meta":{"label":"Paper awards (curated)","edition":"2026-10","count":7830}` · "a bundled list of award-winning papers at major conferences" |
| L12 | Oral, Spotlight and Highlight labels that authors write in the title or venue | `src/_locales/en/messages.json:63` | "From the authors' own words in each paper's title and venue text on Scholar (not checked)" |
| L13 | Search: press / and type `role:first ccf:a cites:>100` | `src/_locales/en/messages.json:838`; `src/lib/query.js:21, 25, 27` | "Press / to search" · `example: "cites:>100"` · `example: "ccf:a"` · `example: "role:first"` |
| L14 | Copy and export: summary or papers as plain text, a table, APA, BibTeX, Markdown, JSON or CSV | `src/lib/prefs.js:69-76`; `src/content/main.js:359-362` | `bool("copy.summary", …)` … `bool("copy.csv", true, "Copy button: the papers shown as CSV (RFC 4180).")` · `B.dom.downloadFile((safe \|\| "scholar") + "-papers.csv", text);` |
| L15 | The toolbar button gives the same data | `src/popup/popup.js:1, 86-87` | "Toolbar popup: the same role × tier summary as the in-page panel" · `...data.copyButtons.map((kind) => h("button", …` |
| L16 | Page events for scripts or AI agents give the same data | `src/lib/agent.js:85`; `src/content/main.js:591-619` | `EVENTS = { request: "better-scholar:request", response: "better-scholar:response", marker: "data-rr-ready" }` · `summary: () => …` `papers: …` `export: …` |
| L17 | A switch for each role and panel part; your own colours; merging duplicate entries; hiding parts of the profile page | `src/lib/prefs.js:30-33, 36-39, 51, 53-57, 59-67` | `bool("roles.first", true, …)` · `color("colors.first", …)` · `bool("mergeDuplicates", false, …)` · `bool("hide.cited", false, …)` · `bool("panel.show", true, …)` |
| L18 | 30 languages | `src/lib/i18n.js:11` (30 entries); `src/_locales/` (30 folders) | `const LANGUAGES = [` |
| L19 | Reopening search and profile pages in a language you choose (off unless chosen) | `src/lib/prefs.js:28`; `src/content/lang-redirect.js:7, 16-17` | `language("scholarLanguage", "keep", …)` · `/^\/(scholar\|citations)\/?$/.test(location.pathname)` · `if (!hl) { clear(); return; }` |
| L20 | Ranks are today's CCF and CORE lists, not the rank at publication | `src/_locales/en/messages.json:280, 305` | "Ranks come from today's $N1$ lists, not the rank at publication time." · "current list, not the rank at publication" |
| L21 | CCF states that its list is not a basis for academic evaluation | `src/_locales/en/messages.json:280`; `NOTICE:10-11` | "CCF states that its list is not a basis for academic evaluation." |
| L22 | By default it presses the page's own "Show more" button about once a second, only while the tab is in front | `src/lib/prefs.js:79`; `src/content/main.js:484`; `src/content/scholar.js:101, 113, 117` | `bool("autoLoad", true, …)` · `foregroundOnly: origin === "auto"` · `TIMING = { pause: 600, jitter: 400, …}` · `const foreground = () => !foregroundOnly \|\| !document.hidden;` |
| L23 | It stops if no more rows arrive; a setting turns it off | `src/content/main.js:484`; `src/content/scholar.js:128`; `src/_locales/en/messages.json:517` | `maxStalls: origin === "auto" ? 1 : 2` · `if (++stalls >= maxStalls) { … return "stalled"; }` · "Load all papers automatically" |
| L24 | "Read full lists" opens each paper's own page on the same site, only when you click it, about once a second | `src/content/panel.js:490`; `src/content/detail.js:9, 39-40` | `onClick: () => cb.onResolve()` · `1000 + Math.random() * 600` · `if (url.origin !== location.origin) throw …` · `fetch(url.href, { credentials: "include", signal })` |
| L25 | It stops at the first CAPTCHA | `src/content/detail.js:18-20, 41, 71` | `#captcha-form, #gs_captcha_ccl, form[action*='sorry'], #recaptcha` · `res.status === 429 \|\| res.status === 503` · `return { done, stopped: "captcha" };` |
| L26 | Semantic Scholar: off by default; asked first for those lists | `src/lib/prefs.js:78`; `src/content/detail.js:53` | `bool("semanticScholar", false, …)` · "Semantic Scholar first when the settings allow it" |
| L27 | Each Semantic Scholar request's only content is the paper's title (and your API key, if you add one); no cookies are sent | `src/content/semantic.js:13-15` | `API + "?fields=title,authors,year&query=" + encodeURIComponent(title)` · `credentials: "omit", referrerPolicy: "no-referrer", headers: apiKey ? { "x-api-key": apiKey } : {}` |
| L28 | No account, no analytics, no ads | grep over `src/` (section 3) | The only `fetch(` calls are `detail.js:40`, `semantic.js:15`, `background.js:9`; no `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `new Image(` |
| L29 | Settings and name spellings in Chrome's storage | `src/content/store.js:7, 9` | "sync  prefs" · "sync  variants   { profileId: [name spellings] }" |
| L30 | Author lists it has read stay on this device for 90 days | `src/content/store.js:10, 63`; `src/_locales/en/messages.json:485` | "local resolved" · `const TTL = 90 * 24 * 3600 * 1000;` · "(kept for 90 days)" |
| L31 | One permission, storage | `src/manifest.json:9-11`; `test/extension.test.js:36-37` | `"permissions": [ "storage" ]` · `assert.equal(manifest.host_permissions, undefined, …)` |
| L32 | Runs only on Scholar's pages | `src/manifest.json:35-223, 257-445`; `test/extension.test.js:51-59` | every pattern is `https://scholar.google.<domain>/citations*` or `https://scholar.google.<domain>/*` |
| L33 | Free and open source (Apache 2.0) | `LICENSE:2-3`; `package.json` | "Apache License, Version 2.0, January 2004" · `"license": "Apache-2.0"` |
| L34 | Independent project, not affiliated with or endorsed by Google | `NOTICE:23-24` | "This extension is an independent project and is not affiliated with, endorsed by, or sponsored by Google or CCF." |
| L35 | Two summary alternatives (listing.md) | same evidence as L4–L6, L9, L13–L14, L20 | Both stay within 132 characters (measured: 128 and 127). |

Reviewer test instructions (listing.md, last section). The expected results for the five rows were computed with the
extension's own libraries (`src/lib/analysis.js` with the bundled data) on the rows as Scholar printed them on 2026-10-15:

| Row (Scholar's text) | Role | Chips |
|---|---|---|
| "Imagenet classification with deep convolutional neural networks" / "A Krizhevsky, I Sutskever, GE Hinton" / "Advances in neural information processing systems 25, 2012" | last (3 of 3) | CCF A NeurIPS, CORE A* NeurIPS, Test of time (`src/data/awards.js`: `["imagenetclassificationwithdeepconvolutionalneuralnetworks","krizhevsky","NeurIPS",2022,"tot","Test of Time Award"]`) |
| "Deep learning" / "Y LeCun, Y Bengio, G Hinton" / "Nature 521 (7553), 436-44, 2015" | last | none (Nature is on neither list) |
| "Visualizing data using t-SNE" / "L van der Maaten, G Hinton" / "Journal of Machine Learning Research 9 (Nov), …" | last (2 of 2; `names.js:226`: "In a two-author paper the second author is the senior (last) author") | CCF A JMLR |
| "Dropout: a simple way to prevent neural networks from overfitting" / "N Srivastava, G Hinton, …" / "The journal of machine learning research 15 (1), …" | second | CCF A JMLR |
| "Learning internal representations by error-propagation" / "DE Rumelhart, GE Hinton, RJ Williams" / "Parallel Distributed Processing: …" | second | none |

Other statements in the test instructions:

| Statement | File : line | Quote |
|---|---|---|
| Panel at the top of the right-hand column, above the list in a narrow window | `src/content/scholar.js:69-83` | "top of the right sidebar on wide layouts, above the paper list on narrow ones" |
| Default role colours blue, amber, green | `src/popup/popup.js:16` | `first: "var(--rr-c-first, #1a73e8)"`, `second: "var(--rr-c-second, #f9ab00)"`, `last: "var(--rr-c-last, #1e8e3e)"` |
| "Loading… N" with "Cancel" while the list loads | `src/content/panel.js:480-481`; `src/_locales/en/messages.json:156, 167` | `c.loadingAll ? t("loadingAll", …)` · `onClick: () => cb.onCancelLoad() }, t("cancel")` |
| Settings > Paper list > "Load all papers automatically" | `src/_locales/en/messages.json:514, 517`; `src/options/options.js:644` | "Paper list" · "Load all papers automatically" · `card(10, t("optLoadTitle"), …` |
| "Read full lists" is offered when Scholar cut off author lists | `src/content/panel.js:486-490` | `if (c.hidden > 0 \|\| c.resolving) {` … `t("resolveBtn")` |
| The popup's settings button opens the settings page | `src/popup/popup.js:13`; `src/options/options.html:20-29` | `chrome.runtime.openOptionsPage()` · the preview card |
| Loading stops when Scholar sends no more rows; paper reading stops at the first CAPTCHA | `src/content/scholar.js:123, 128`; `src/content/detail.js:71` | `return "stalled";` · `stopped: "captcha"` |
| When loading stops early the panel says "Scholar sent no more papers (N loaded). Try “Load all” again in a moment." | `src/content/main.js:495`; `src/_locales/en/messages.json:523` | `state.loadMessage = stopped === "stalled" ? t("loadStalled", …)` · "Scholar sent no more papers ($N1$ loaded). Try “Load all” again in a moment." |
| The example rows are among the first 20 | observed 2026-10-15 | A signed-out fetch of the test profile listed "Articles 1–20", most cited first, with these five rows at the top. |

## 2. Privacy tab answers

| # | Answer (listing.md, Privacy tab) | File : line | Quote |
|---|---|---|---|
| P1 | Single purpose: roles and venue ranks on Scholar profile pages | `src/content/main.js:1-3`; `src/lib/prefs.js:26-80` | "Content-script entry: wires the Scholar page, the analysis libraries and the panel." Every setting in the one table is about what the profile page shows, how the list is loaded, or the language. |
| P2 | `storage`: settings and name spellings in `chrome.storage.sync` | `src/content/store.js:6-9, 37-38, 51-61` | "sync  prefs      what to show" · "sync  variants   { profileId: [name spellings] }" · `if (keys.length > 40) delete all[keys[0]];` |
| P3 | `storage`: panel state, cache (author lists and venue text), API key in `chrome.storage.local` | `src/content/store.js:8, 10, 72, 77-79`; `src/content/detail.js:68`; `src/lib/prefs.js:187-190` | "local ui         { collapsed, source }" · "local resolved" · `{ authors: d.authors, venue: d.venue, ts: Date.now() }` · `.slice(0, 3000)` · "on this device only (never synced), sent only to Semantic Scholar" |
| P4 | Nothing in storage is sent to the developer | grep (section 3) | No request goes to any host the developer controls; the only hosts are the Scholar page's own origin and `api.semanticscholar.org`. |
| P5 | Host access comes only from two content scripts | `src/manifest.json:33-452`; `test/extension.test.js:36, 47-60` | `assert.equal(cs.length, 2);` · `assert.equal(m.length, 187);` |
| P6 | Script 1: `/citations*` on 187 domains; draws only on profile pages | `src/manifest.json:35-36, 254`; `src/content/main.js:7`; `src/content/scholar.js:8` | `"https://scholar.google.com/citations*"` · `const isProfile = () => !!$("#gsc_prf_in") && !!$("#gsc_a_b");` |
| P7 | Script 2: every path on the same domains, at document start; acts only on `/scholar` and `/citations`, only when a language is chosen | `src/manifest.json:257-258, 446-450`; `src/content/lang-redirect.js:7, 16-17, 27` | `"https://scholar.google.com/*"` · `"run_at": "document_start"` · `/^\/(scholar\|citations)\/?$/` · `location.replace(…)` |
| P8 | Why 187 domains: a match pattern cannot wildcard the top-level domain; the list is generated from Google's published domain list | `scripts/update-scholar-domains.sh:5-8, 21, 37, 43` | "Scholar is served from every Google country domain (scholar.google.com.sg, scholar.google.co.uk, …)" · "a Manifest V3 match pattern cannot wildcard a TLD — "https://scholar.google.*/*" is rejected" · `SOURCE="https://www.google.com/supported_domains"` |
| P9 | Remote code: none; every script is in the package | `src/manifest.json:227-253, 446-449`; `src/options/options.html` and `src/popup/popup.html` (`<script src="../…">` only) | grep (section 3): no `eval(`, `new Function`, `import(`, `innerHTML`, `document.write`, `WebAssembly`, no remote `<script>` |
| P10 | Fetched data is never executed | `src/content/detail.js:17, 24-32`; `src/content/semantic.js:20`; `src/background.js:9` | `new DOMParser().parseFromString(html, "text/html")` (fields read with `textContent`) · `(await res.json()).data` · `fetch(chrome.runtime.getURL("_locales/" + …))` |
| P11 | The page-event listener runs only six fixed, validated calls and executes nothing it receives | `src/content/bridge.js:10-14, 27-31`; `src/lib/agent.js:17-81` | `const checked = B.agent.validate(method, params);` · `if (!own(METHODS, method)) return { ok: false, error: …` (ping, summary, papers, export, filter, clearFilters) |
| P12 | Page calls cannot read or change settings or start a network request | `src/content/bridge.js:3-4`; `src/content/main.js:591-618` | "they cannot read or change the settings" · none of the six methods calls `fetch`, `resolveAll` or `loadAll` |
| P13 | Data: website content is read, cached, and (opt-in) titles sent | `src/content/scholar.js:37-58`; `src/content/store.js:71-74`; `src/content/semantic.js:13` | `title: link ? link.textContent.trim() : ""` · `saveResolved(map)` · `encodeURIComponent(title)` |
| P14 | Data: an optional API key (a credential) is stored and sent only to Semantic Scholar | `src/content/store.js:77-79`; `src/content/semantic.js:14-15` | `get("local", "s2key")` · `headers: apiKey ? { "x-api-key": apiKey } : {}` |
| P15 | Data: names (author names on the page; name spellings the user adds) | `src/content/scholar.js:14`; `src/content/store.js:51-61` | `const ownerName = () => (($("#gsc_prf_in") \|\| {}).textContent \|\| "").trim();` · `all[profileId] = list.slice(-8)` |
| P16 | Data: no browsing history, location, user activity, communications, health or financial data | grep (section 3) | No `chrome.history`, `chrome.tabs` outside the popup (active tab id only, `popup.js:32`), no geolocation, keystrokes handled only for `/` and Escape and never stored (`main.js:570-583`); the other page-wide listeners close the panel's own menus on an outside pointer press, scroll or resize (`panel.js:50, 214-218`), redraw on resize (`main.js:562`) and check whether Scholar's "Show more" button was pressed (`main.js:555`: `e.target.closest("#gsc_bpf_more")`); none records anything |
| P17 | The only transfer: titles to Semantic Scholar, on a switch the user turns on, after an in-UI explanation | `src/lib/prefs.js:78`; `src/_locales/en/messages.json:187, 698, 701`; `src/content/panel.js:491` | default `false` · "Read author lists from Semantic Scholar first" · "(it receives the paper's title and nothing else)" · the hint under the button: "Asks Semantic Scholar for each paper's author list first (it receives only the title)" |
| P18 | No preset turns the network option on | `src/lib/prefs.js:165` | "everything the extension can show; the choice of network use (semanticScholar) and the language are not touched" |
| P19 | Clipboard and files only after a click | `src/content/dom.js:71-85, 98-109`; callers `main.js:356-364, 428`, `popup.js:77-84`, `options.js:436-449, 568-578, 594` | every `copyText(` / `downloadFile(` call sits in a button's `onClick` handler |
| P20 | Privacy policy URL | `src/options/options.js:138` | `["lnk-privacy", "https://boyugou.github.io/better-scholar/privacy/", t("optLinkPrivacy")]` |
| P21 | Support URL | `src/content/dom.js:113`; `src/options/options.js:139` | `const REPO = "https://github.com/boyugou/better-scholar";` · `B.dom.REPO + "/issues/new/choose"` |

## 3. What the code does on the network, in storage and on the page (grep over `src/`)

Run from the repository root, `src/data/` excluded (bundled data only):

| Pattern | Hits | What they are |
|---|---|---|
| `fetch(` | 3 | `content/detail.js:40` the paper's own Scholar page, same origin only (line 39), cookies included; `content/semantic.js:15` `api.semanticscholar.org`, `credentials: "omit"`, `referrerPolicy: "no-referrer"`; `background.js:9` the extension's own `_locales/<lang>/messages.json` via `chrome.runtime.getURL` |
| `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource`, `importScripts`, `new Worker`, `new Image(` | 0 | |
| `eval(`, `new Function`, `import(`, `innerHTML`, `insertAdjacentHTML`, `document.write`, `WebAssembly` | 0 | (`dom.js:1` mentions "no innerHTML" in a comment) |
| `document.cookie` | 0 | |
| `localStorage` | 1 file | `content/scholar.js:94-99`: key `rr-load-lock`, value `{ id: <random>, t: <time> }`, in the Scholar origin's storage, taken before each automatic "Show more" press and removed when the run ends |
| `sessionStorage` | 1 file | `content/lang-redirect.js:10-13`: key `rr-hl`, value `<language>\|<time>`, in the Scholar tab's session storage, so that a redirect happens at most once per tab and language |
| `indexedDB`, `caches.` | 0 | |
| `clipboard` | `content/dom.js:73` | `navigator.clipboard.writeText(text)`, with an `execCommand("copy")` fallback (line 81); called only from button handlers |
| `download` | `content/dom.js:98-109` | a Blob and a temporary `<a download>`; callers: CSV (`main.js:362`, `popup.js:83`) and the settings file (`options.js:569`) |
| `chrome.storage` keys | 5 | sync: `prefs`, `variants`; local: `ui`, `resolved`, `s2key` (`content/store.js:6-10, 78`) |
| `chrome.tabs` | popup only | `popup.js:32` `chrome.tabs.query({ active: true, currentWindow: true })` (uses only `tab.id`), `popup.js:38` `chrome.tabs.sendMessage` (no `tabs` permission needed) |
| `chrome.runtime` messages | 3 types | `rr:call` (popup → content script, `bridge.js:19`), `rr:options` (`main.js:399` → `background.js:7`), `rr:messages` (`dom.js:39` → `background.js:8`); `background.js:6` drops messages from any other sender |
| page events | 2 + marker | `better-scholar:request` (listened to), `better-scholar:response` (dispatched), attribute `data-rr-ready="true"` on `<html>` (`bridge.js:27-33`, `agent.js:85`) |
| external messaging | 0 | no `externally_connectable` in the manifest, no `onMessageExternal`, no `web_accessible_resources` (`test/extension.test.js:40`) |
| hard-coded URLs in code (besides the SVG namespace `http://www.w3.org/2000/svg`) | 5 | `popup.js:26` scholar.google.com (a link), `options.js:138` the privacy page (a link), `dom.js:113` the GitHub repository (links), `semantic.js:7` the API endpoint, `semantic.js:1` a comment. `src/data/ccf.js` holds 679 dblp and publisher URLs from the CCF list; they are data and never requested or shown as links. |

## 4. Problems found

Severity: **Blocker** means fix before you press Submit (the policy URL, the homepage and the screenshots are part of the
submission). **Should fix** means a reviewer or a user could read it as false. **Minor** means wrong but unlikely to matter
to the review. Another agent is fixing the documents; nothing here was edited.

### 4.1 Things the brief said that the code contradicts

| What was said | What is true |
|---|---|
| "content scripts run on about 200 scholar.google.<tld> domains under /citations*" | 187 domains, and two content scripts, so 374 patterns. Only the main script is limited to `/citations*`. The second (`lib/i18n.js` + `content/lang-redirect.js`) matches `https://scholar.google.<domain>/*` at `document_start` (`src/manifest.json:257-450`) and acts on `/scholar` and `/citations` (`lang-redirect.js:7`). The listing and the justification in `listing.md` say so. |
| "Network: only the Scholar pages the user opens, plus pressing Show more …" | Also, on a click of *Read full lists*, `fetch` of each paper's own Scholar page with the user's Scholar cookies (`detail.js:40`, `credentials: "include"`). This is in `listing.md`. |
| "chrome.storage.local holds per-device view state, a cache …, and an optional Semantic Scholar API key" | True, and the extension also writes two keys in the Scholar site's own web storage: `localStorage["rr-load-lock"]` and `sessionStorage["rr-hl"]` (section 3). |

### 4.2 PRIVACY.md (and its copy at https://boyugou.github.io/better-scholar/privacy/, the privacy policy URL)

The live page was downloaded with `curl` on 2026-10-15 and compared with PRIVACY.md sentence by sentence: the text is the
same (only the markup differs), and the quotes below ("tiny script", "Nothing else", "Scholar shows 100 papers", "nothing
else — no cookies, no referrer") were found verbatim in the page; "Limited Use" does not occur. Every item below is
therefore also on the URL you submit.

| Sev. | Quote | What is true |
|---|---|---|
| Blocker | PRIVACY.md:6-7: "It runs only on `scholar.google.*/citations*` pages. A second, tiny script … is loaded on Scholar's search (`/scholar`) and author (`/citations` …) pages … it reads nothing from the page." | The second script is injected on every page of the 187 Scholar domains (`/*`, `document_start`) and returns at once unless the path is `/scholar` or `/citations` (`lang-redirect.js:7`). It reads the settings record and the page's address (`location.search`), not its content, and keeps `rr-hl` in the tab's sessionStorage (`lang-redirect.js:10-13`). |
| Blocker | PRIVACY.md:8-11: "What it stores: … whether the panel is folded and a cache of the paper pages you asked it to read (kept at most 90 days). … Nothing else." | `chrome.storage.local` also holds which list the table shows (`ui.source`, `prefs.js:189`) and the optional API key (`s2key`, `store.js:78`; the policy mentions the key further down, which contradicts "Nothing else"). The cache holds each paper's author list and venue text, not the page, for at most 3,000 papers (`store.js:72`). On Scholar's own origin the extension writes `localStorage["rr-load-lock"]` (`scholar.js:96-99`) and `sessionStorage["rr-hl"]` (`lang-redirect.js:10-13`). |
| Blocker | (missing) | No Limited Use statement. The Limited Use policy (section 6) asks for "An affirmative statement that your use of the data complies with the Limited Use restrictions" on a website belonging to the extension. Suggested line: "Better Scholar's use of this data complies with the Chrome Web Store User Data Policy, including the Limited Use requirements." |
| Should fix | PRIVACY.md:13-14: "**Read full lists**, which — only when you click it — opens each paper's own page on `scholar.google.*` (same origin …)" | Correct, but it should say that these requests carry the user's Scholar cookies, as when the user opens the page (`detail.js:40`, `credentials: "include"`). |
| Should fix | PRIVACY.md:18-19: "the request carries the paper's title and nothing else — no cookies, no referrer, no identifier of you or of the profile." | The URL also carries `fields=title,authors,year` (`semantic.js:13`). Like any web request, it shows Semantic Scholar the user's IP address and browser, and, because the request is made from the Scholar page, an `Origin` header naming the Scholar domain (the referrer policy removes `Referer`, not `Origin`). With a key, the browser sends a preflight first. Suggested: "its only content is the paper's title (and your API key, if you set one)". |
| Should fix | (missing) | The page-event interface: scripts on a Scholar profile page can ask for the summary, the paper records and the exports the extension computed from that page (`bridge.js`, `main.js:591-618`), and the `data-rr-ready` attribute tells the page the extension is there. No network, no settings. One sentence would cover it. |
| Minor | PRIVACY.md:21: "Scholar shows 100 papers and loads the rest when its own *Show more* button is pressed." | A signed-out visit to the test profile on 2026-10-15 showed "Articles 1–20". Say "the first papers" (as the settings page does: "Scholar shows only the first papers at first", `messages.json:520`). |
| Minor | PRIVACY.md:26-27: "the *Report* links in the panel … carry only the venue text you can see in the panel." | The layout-warning *Report* link carries the page's path and query string with the `user=` value replaced by "…" (`panel.js:531`). The venue link carries up to six venue strings and a fixed sentence (`panel.js:514-515`). |
| Minor | PRIVACY.md:30-32: "a small service worker … it has no network or storage access." | Accurate in effect, but `background.js:9` calls `fetch` on `chrome.runtime.getURL(…)`, the extension's own files. "It reads only the extension's own files" avoids a reviewer's double take. |

### 4.3 The project homepage (https://boyugou.github.io/better-scholar/, the Homepage URL)

| Sev. | Quote | What is true |
|---|---|---|
| Blocker | Header badge on `/en/`: "100% Offline & Private" (found verbatim in the page's HTML with `curl`, 2026-10-15) | Not offline: by default it presses Scholar's own *Show more* (Scholar's request), *Read full lists* fetches Scholar pages, and the opt-in lookup goes to `api.semanticscholar.org`. A reviewer who opens the homepage from the listing sees this next to a listing that describes network use. |
| Minor | "A Chrome Web Store listing may follow." | Update it with the store link after publishing. |

### 4.4 README.md and README.zh-CN.md

| Sev. | Quote | What is true |
|---|---|---|
| Should fix | README.md:51 "No accounts, no telemetry, no tracking, and no external network calls." | There are network calls: *Read full lists* (Scholar) and, opt-in, `api.semanticscholar.org` (`detail.js:40`, `semantic.js:15`). |
| Should fix | README.md:160 "External extension components can also communicate via Chrome runtime messaging using `{ type: "rr:papers" }`, `{ type: "rr:export", format: "json" }`, or `{ type: "rr:filter" }`." · README.zh-CN.md:160 (same, "外部扩展间亦支持") | No such channel: there is no `externally_connectable` and no `onMessageExternal`; `chrome.runtime.onMessage` only hears the extension's own pages, and the one message type is `rr:call` (`bridge.js:16-19`). A reviewer reading this would look for an undisclosed channel. |
| Should fix | README.md:49, 139-158 and README.zh-CN.md:49, 141-158: events `better-scholar:ping`, `…:pong`, `…:request-papers`, `…:response-papers`, `…:request-export`, `…:response-export`, `…:query` | None exists in 2.39.0 (CHANGELOG 2.39.0: "The dual event names, the second id field and the four extra message types are gone."). The API is one pair, `better-scholar:request` / `better-scholar:response` with `{ id, method, params }` (`agent.js:85`, `bridge.js:26-31`). |
| Minor | README.md:116-121 (and zh-CN): `>100`, `>=50`, `<10`, `>2020`, `<=2015`, `r:cofirst`, `is:award` | 2.39.0 reads only `cites:`, `year:`, `ccf:`, `core:`, `role:`, `has:` (`query.js:20-31`); a bare `>100` is searched as text. |
| Minor | README.md:47 "Copy publication data to clipboard as … CSV" | CSV is saved as a file (`main.js:359-362`). |
| Minor | README.md:48 presets "🎓 Senior author focus"; colour presets "Classic Scholar, Ocean Sapphire, Sunset Orchid, High Contrast Pro, Nordic Slate"; "WCAG AA contrast ratio" | Presets: All features, Last author focus, First author focus, Minimalist (`messages.json:913-923`). Themes: Default, Cool, Warm, High contrast, Soft (`messages.json:653-665`). The badge rates the colour against white with a 3:1 threshold (`messages.json:668`). |
| Minor | README.md:11, 82, 202, 216 "416 unit tests" | `npm test` on 2026-10-15: 429 tests, 429 pass. |

### 4.5 SECURITY.md, CONTRIBUTING.md, AGENTS.md, docs

| Sev. | File : line, quote | What is true |
|---|---|---|
| Should fix | SECURITY.md:5 "… or bypasses origin fencing on DOM CustomEvents." | There is no origin fence: any script on the Scholar page can send `better-scholar:request` and read the answer (`bridge.js:27-31`). The real boundary is that page calls are six validated methods that cannot read or change settings or start a request. |
| Minor | SECURITY.md:3 "zero external network transmission (with the optional exception of user-initiated Semantic Scholar lookups)" | Leaves out *Read full lists* (Scholar pages, user-initiated). |
| Minor | CONTRIBUTING.md:105 "User-visible strings live in `src/_locales/{en,zh_CN}/messages.json`; keep both in sync (tested)." | 30 locales, all kept in sync (`test/i18n.test.js`). |
| Should fix | AGENTS.md §2-§4 (linked from README.md:226): marker `dataset.betterScholar === "ready"`, events `better-scholar:ping` … `better-scholar:clear-filters`, messages `rr:summary`, `rr:papers`, `rr:export`, `rr:filter`, syntax `>500`, `2020..2024`, `has:oral` | The marker is `data-rr-ready="true"` (`bridge.js:33`); the events, messages and syntax are as in the rows above. |
| Minor | docs/store/README.md (an older listing kit): "Host access: only the Google Scholar profile pages (content-script matches)"; "Category: Productivity"; "no personal data is collected" | Superseded by `store/`. The host line ignores the second script; the store's categories are now finer (Education, Tools, Workflow & Planning …); and the User Data FAQ (FAQ 3) counts data handled only on the device. Delete it or point it here. |
| Minor | docs/ARCHITECTURE.md:221 "No other persistence, no remote code, no third-party requests." | `rr-load-lock` and `rr-hl` in Scholar's web storage, the `s2key`, and the opt-in third-party request. |

### 4.6 Text that ships inside the extension

| Sev. | File : line, quote | What is true |
|---|---|---|
| Should fix | `src/lib/agent.js:148` (the guide users copy from the settings page): "the extension marks the document with `data-rr-ready="ready"`" | `bridge.js:33` sets `"true"`. A script waiting for `"ready"` never starts. |
| Should fix | `src/lib/agent.js:148`: "This works with the setting `agentBridge` on (the default), and the page cannot tell the extension is here with it off." | There is no `agentBridge` setting (`prefs.js:26-80`); `B.bridge.install(methods)` runs on every profile page (`main.js:619`). The page can always tell the extension is there, and the interface cannot be switched off. Either add the setting or remove the sentence. |
| Minor | `src/_locales/en/messages.json:508` "Settings are stored in your browser and sync with your Chrome profile. Nothing is sent anywhere unless you switch on Semantic Scholar." | *Read full lists* still requests Scholar's pages. "Nothing goes to any other site unless you switch on Semantic Scholar" is exact. |

### 4.7 Manifest and package

| Sev. | Finding | Detail |
|---|---|---|
| Minor | `short_name` is 14 characters | "Better Scholar"; the manifest reference recommends at most 12. Only a recommendation; it does not block upload. |
| Minor | Spanish description is exactly 132 characters | `src/_locales/es/messages.json` `extDescription`: 132, the limit. Any edit to it must keep that length or shorter (`test/i18n.test.js:40` checks every locale). |
| None | Permissions, host permissions, web-accessible resources | `storage` only; no `host_permissions`, `optional_permissions`, `web_accessible_resources` or `externally_connectable`. Nothing to remove. |
| Note | Bundled third-party data | `NOTICE:15`: "CORE's terms of use have not been confirmed". Not a review item, but it is the one intellectual-property question in the package. |

### 4.8 Store images (made in another worktree)

| Sev. | Finding | Detail |
|---|---|---|
| Blocker | The images show version 2.38.1, not 2.39.0 | The image worktree's `src/manifest.json` says `"version": "2.38.1"` and has no `content/bridge.js`, `lib/agent.js`, `lib/formats.js` or `lib/query.js`. Screenshot 5's popup has seven copy buttons in the 2.38.1 order (summary, table, BibTeX, Markdown, APA, JSON, CSV); 2.39.0's popup has eight (summary, table, papers, APA, BibTeX, Markdown, JSON, CSV; `prefs.js:69-76`). Regenerate all images from the commit you submit. See `screenshots-plan.md`. |
