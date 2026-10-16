<div align="center">

<img src="assets/icon.svg" alt="Better Scholar" width="128" height="128">

# Better Scholar

**Supercharge Google Scholar. Author roles, CCF & CORE ranks, awards, citation totals, and search with operators — with zero dependencies.**

[![License](https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://github.com/boyugou/better-scholar)
[![Tests](https://img.shields.io/github/actions/workflow/status/boyugou/better-scholar/test.yml?branch=main&style=flat-square&label=tests&logo=githubactions&logoColor=white)](https://github.com/boyugou/better-scholar/actions)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success?style=flat-square)](package.json)
[![Languages](https://img.shields.io/badge/languages-30%20locales-6B57D2?style=flat-square)](src/_locales)
[![Privacy](https://img.shields.io/badge/privacy-local--first%20·%20no%20tracking-008080?style=flat-square)](PRIVACY.md)

[Website (30 languages)](https://boyugou.github.io/better-scholar/) · [简体中文](README.zh-CN.md) · [Install](#install) · [Key features](#key-features) · [Search operators](#search-operators) · [How it works](#how-it-works) · [Copy and export](#copy-and-export) · [For AI agents](#for-ai-agents) · [Privacy](PRIVACY.md)

<br>

<img src="store/chrome/images/screenshot-1.jpg" alt="Better Scholar on a Google Scholar profile" width="920">

<br><br>

<table>
  <tr>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-2.jpg" alt="The panel: the role × rank table, copy and export buttons, awards and talks, filters" width="460"></td>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-3.jpg" alt="Searching with role:first ccf:a cites:>100 narrows the list and its totals" width="460"></td>
  </tr>
  <tr>
    <td align="center"><sub>The panel: role × rank table, copy / export, awards and talks, filters</sub></td>
    <td align="center"><sub>Search: <code>role:first ccf:a cites:&gt;100</code> narrows the list and the totals</sub></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-4.jpg" alt="The settings page with a switch for every part and a live preview" width="460"></td>
    <td align="center" width="50%"><img src="store/chrome/images/screenshot-5.jpg" alt="The toolbar popup with the open profile's table and the copy and export buttons" width="460"></td>
  </tr>
  <tr>
    <td align="center"><sub>Settings: a switch for every part, live preview</sub></td>
    <td align="center"><sub>Toolbar popup: the table and the copy / export buttons</sub></td>
  </tr>
</table>

</div>

---

Better Scholar is a Chrome (Manifest V3) extension for [Google Scholar](https://scholar.google.com) profile pages. It works out the profile owner's authorship role in each paper (first, co-first, second, last author), matches each venue against the **CCF** (2026, 7th edition) and **CORE** (ICORE 2026) lists, marks award-winning papers and the talk levels authors write (Oral, Spotlight, Highlight), and sums it up in a panel: a role × rank table, citation totals, papers per year, a search box with operators, and copy / export buttons.

- **No dependencies, no build step.** Load `src/` as an unpacked extension.
- **Precision first.** The venue matcher has no fuzzy or substring fallback. A venue it cannot place gets no badge and is listed in the panel; every badge's tooltip names the matched venue, the rule that matched and the list's edition.
- **Authorship roles.** First, co-first (a leading group of authors that share a mark such as `*` or `†`), second and last author. Your name is marked in the author line, with your position in a tooltip.
- **Awards and talks.** A bundled list of 7,830 award-winning papers taken from official award pages, plus the Oral / Spotlight / Highlight labels authors write themselves.
- **Citation totals.** Papers, citations, h-index and i10-index of your highlighted papers next to those of all papers. The h-index and i10-index buttons list the highlighted papers behind the number.
- **Search with operators.** `/` focuses the search box; words plus `cites:`, `year:`, `ccf:`, `core:`, `role:`, `type:` and `has:`, with suggestions as you type.
- **Copy and export.** Summary, table, papers, APA, BibTeX, Markdown and JSON to the clipboard, and CSV as a file; one switch per format in the settings, and the same buttons in the toolbar popup.
- **One settings page.** A live preview, presets, colour themes and a JSON configuration. The panel itself holds no settings.
- **For AI agents.** *Copy guide for agents* gives an AI assistant every setting, your current values, the page calls and the search syntax; page events let a browsing agent read the panel's numbers and set its filters.
- **30 interface languages**, and *Open Scholar in* to open Scholar itself in a language you choose.
- **Private.** No account, no analytics, no tracking. The only request to a site other than Scholar is the optional Semantic Scholar title lookup, off by default. See [`PRIVACY.md`](PRIVACY.md).

## How it works

```
Scholar profile page ──► content/scholar.js   (reads the rows; presses Scholar's "Show more")
                             │ title, author line, venue line, citations, year
                             ▼
                        lib/analysis.js ──► lib/names.js    owner and role (first, co-first, second, last …)
                             │          ├─► lib/venues.js   CCF / CORE rank  ◄── data/ccf.js, data/core.js, data/aliases.js
                             │          ├─► lib/marks.js    award and talk words the authors wrote
                             │          └─► lib/awards.js   award-winning papers  ◄── data/awards.js
                             ▼
                        content/main.js   (state, filters, row decoration; settings from lib/prefs.js)
                             │
        ┌────────────────────┼───────────────────────┬─────────────────────────────┐
        ▼                    ▼                       ▼                             ▼
  content/panel.js     the rows: role colours,  lib/formats.js              content/bridge.js
  table, search        rank and award chips,    the copy and export text    page events and the popup's
  (lib/query.js),      the marked name          (BibTeX, APA, CSV …)        calls (lib/agent.js)
  totals, years
```

Everything in `src/lib/` is pure (no DOM, no `chrome.*`): in the extension each file attaches to `globalThis.RolesRanks`, under Node it is `require`d, which is how the unit tests run the real code without a build step. The settings page and the toolbar popup are separate pages; the popup asks the profile tab for its numbers. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) has the details.

## Key features

### 1. Authorship roles and your name
- **Roles:** first; co-first (you are in a leading group of at least two authors that share a mark, `A*, B*, C`); second; last (only when the author list is complete; in a two-author paper the second author is the last); other positions are not highlighted.
- **Your name** is marked in the author line (*Mark my name in the author line*), with "First author · position 1 of 8" in its tooltip.
- **Cut author lists:** when Scholar cuts a list with "…" before your name, your role is hidden. *Read full lists* in the panel reads each such paper's own Scholar page (about one a second, only after the click; optionally asking Semantic Scholar first) and finds the role.
- **Name spellings:** initials as Scholar prints them (`GE Hinton` for Geoffrey Hinton) are matched. The other order of your profile name (`Tang Jie` for Jie Tang) is used automatically only when the profile's own rows show it; other spellings found in your papers are offered as one-click suggestions, and you can add your own (*Name not matching? Add a spelling*, up to eight per profile).

### 2. Venue ranks (CCF and CORE)
- **Precision over recall:** a venue is matched by its full name or a curated alias, by a strong acronym signal (`(ICML)`, `ISCA 2014`), or — when Scholar cut the name — by a beginning that only one venue has. Ambiguity means no badge.
- **Conferences and journals are looked up separately;** the string's own words decide which list is consulted.
- **Secondary tracks** — Findings, workshops, demos, posters, tutorials, extended abstracts, short and industry papers, shared tasks — get no badge unless the venue's official name contains the word.
- **Provenance:** a badge's tooltip names the matched venue, the rule and the list's edition. Ranks are today's lists, not the rank at publication time; the panel and every tooltip say so.

### 3. Awards and talks
- **Award list:** 7,830 award-winning papers (best, best student, outstanding and distinguished papers, honorable mentions, category awards, test-of-time awards) from official pages — the ACL Anthology's award data, the Computer Vision Foundation, and the conferences' and societies' own award pages (NeurIPS, ICML, ICLR, CVPR, ICCV, ECCV, ACL, EMNLP, NAACL, AAAI, IJCAI, SIGCOMM, S&P, CCS, USENIX Security, SIGMOD, VLDB, OSDI, SOSP, CHI and many more). A paper matches only by an identical title and the award's first author among its authors.
- **What the authors wrote:** award words (Best Paper, Outstanding Paper, Test of Time, a best-paper finalist) and the talk levels Oral, Spotlight and Highlight, read from the title or venue text by rules that leave ordinary words alone (*Oral Oncology*).

### 4. The panel and the toolbar popup
- **Role × rank table** for CCF or CORE: a click on a cell, a role or a rank lists those papers.
- **Copy row:** one button for each format switched on in the settings ([Copy and export](#copy-and-export)).
- **Awards and talks counts:** a click lists those papers.
- **Yours to arrange:** every part and every thing in it has its own switch, the parts (and the copy buttons and quick filters) can be put in any order, and titles, columns and buttons can be given your own names ([the settings page](#5-the-settings-page)).
- **Search box and filters:** words and [operators](#search-operators), quick buttons (CCF A, >100 citations, First author, Award), *Only highlighted*, and a year range from two drop-downs.
- **Citation totals:** papers, citations, h-index and i10-index of the highlighted papers, each out of the total for all papers. The **h-index button** lists the highlighted papers with at least *h* citations (*h* counted over the highlighted papers the other filters let through); the **i10-index button** lists those with at least 10.
- **Papers by year:** a bar per year for the highlighted papers, stacked by role, over the last 50 years at most; a click on a bar filters to that year.
- **Top venues** (off by default): the ranked venues of your highlighted papers, most papers first; a click lists that venue's papers.
- **Status:** the papers loaded and *Load all*; the roles hidden by cut lists and *Read full lists*; entries that repeat another paper; the papers at venues without a rank, with *Copy list*, *Report* and a *Check* link on each venue that opens the settings page's *Check a venue* with that text filled in.
- **Name spellings:** *Name not matching? Add a spelling*, and the suggestions.
- A bar at the top says how many papers the filters show and clears them; `Escape` on the page clears them too. Each part of the panel has its own switch on the settings page.
- **The whole paper list:** Scholar shows the first papers of a profile and loads more when its own *Show more* button is pressed. By default the extension presses it for you until the list is complete — one press at a time, about once a second, only in the tab you are looking at — and stops at the first press that brings no papers. With *Load all papers automatically* off, the panel offers *Load all*.
- **Toolbar popup:** for the profile in the open tab, the same table, the awards and talks counts, and the copy buttons, under the same switches.

### 5. The settings page
Each change is saved as it is made (a colour when the picker is closed) and open Scholar tabs redraw. The preview on the right is the real panel over sample rows, and it is **an editor, not only a picture**: the cards on the left follow it from top to bottom, hovering a setting outlines what it draws, and hovering a part of the preview offers ✕ to hide it, ⠿ to move it, ✎ (or a double-click on a name) to rename it and ⚙ to jump to its setting on the left (a double-click on anything else does the same); a tray above the preview shows what was hidden again. Both sides change the same settings.

- **A switch for every thing.** Each part of the panel (the table, the copy row, awards and talks, the filters, the citation totals, the year chart, the venue list, the status lines, the name help) and each thing in it (a title, a column or row of the table, a button, a quick filter, a number) has its own switch. A switch decides what is *drawn*; what you see is what you search and copy.
- **Order.** The parts of the panel, the copy buttons and the quick filters can be put in any order: drag them on the preview, or use the buttons on the left.
- **Your own names.** 48 titles, columns, buttons and chip words can be given your own name. A name replaces the translation in every language; the exports, the search operators and the page calls keep the standard words.
- **Chip looks.** Outline, soft, solid or text only; rounded or square; with the list's name or the tier alone; a colour for each of CCF, CORE, awards and talks; six ready-made looks.

The cards, in the order of the preview:

| Card | What it holds |
|---|---|
| Language | Extension language (or follow the browser); *Open Scholar in* |
| Highlight my papers | A switch per role; *Mark my name in the author line* |
| Colours | Five colour themes (Default, Cool, Warm, High contrast, Soft); a colour per role, with a contrast badge; row highlight: tint and bar, bar only, tint only, none |
| Chips on each paper | CCF, CORE, award and talk chips; the names of the award chips; the chips' look (six ready-made looks, style, shape, words, colours) |
| Summary panel | The panel; the order of its parts; the title bar's parts; the bar that says the list is filtered; *Compact* |
| Role × rank table, Copy & export, Awards and talks, Filters, Citation totals, Papers by year, Top venues, Loaded papers and unranked venues, Name spelling help | One card for each part of the panel: its switch, a switch (and a name) for each thing in it, and where it has one an order |
| Scholar's own blocks | Hide *Cited by* (or only its table or its chart), *Co-authors*, *Public access* |
| Duplicate entries | *Merge duplicates* |
| Paper list | *Load all papers automatically* |
| Semantic Scholar | *Read author lists from Semantic Scholar first* (off by default); an optional API key |
| Check a venue | A text box: paste a venue as Scholar prints it and see the CCF and CORE rank it gets, the name it matched and the rule (by name, by acronym, by the visible part of a cut name) — or why it gets none (a workshop or another secondary track; the lists do not place it) |
| AI agents | *Copy guide for agents* |
| Configuration & presets | Presets *All features*, *Last author focus*, *First author focus*, *Minimalist*; *Copy config (JSON)*, *Export file*, *Import file*, and a JSON editor |
| Saved data | *View saved details*, *Clear saved paper details*, *Reset to defaults*, *Copy details for a bug report* |

- **Configuration is JSON only.** The editor and *Import file* take a patch in the shape of the exported record, such as `{ "panel": { "years": { "show": false }, "copy": { "order": ["bibtex", "summary"] } }, "rows": { "style": "bar" }, "labels": { "metricsTitle": "My papers" } }`; the page says what it applied and what it ignored, and why. A preset changes only the settings it names, and no preset switches Semantic Scholar on.
- **Settings of older versions are not migrated.** The stored record is read setting by setting: a value whose name and type still match a setting is kept, anything else falls back to its default.
- **Contrast badge:** each role colour shows its contrast with Scholar's white page and warns below 3:1, the WCAG minimum for graphics, which keeps the row's bar visible.
- A search box above the cards filters the settings; `/` focuses it.
- Chrome accepts 120 writes a minute to synced settings; the page writes at most about 100 and says when Chrome refuses one.

### 6. Languages
The extension speaks 30 languages: English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français, Deutsch, Italiano, Português (Brasil), Português (Portugal), Русский, Українська, Polski, Čeština, Nederlands, Svenska, Dansk, Suomi, Norsk, Türkçe, العربية, עברית, हिन्दी, Bahasa Indonesia, Tiếng Việt, ไทย, Ελληνικά, Magyar and Română. It follows the browser unless you pick one. *Open Scholar in* opens Scholar's search and author pages (`/scholar`, `/citations`) in a language you choose, by setting Scholar's `hl=`.

---

## Search operators

Press `/` on a profile to focus the search box (when the panel and its filters are shown). A paper must match every word and every operator. A word is looked for in the title, the authors, the venue, the venue's name in the lists, the year, the role and the marks; case does not matter.

| Operator | Examples | Matches |
|---|---|---|
| `cites:` | `cites:>100`, `cites:>=50`, `cites:<10`, `cites:25` | the citation count compared with a number: `>` `>=` `<` `<=` `=` (a bare number means `=`) |
| `year:` | `year:>=2020`, `year:<2015`, `year:2023` | the publication year, compared the same way |
| `ccf:` | `ccf:a`, `ccf:b`, `ccf:c` | the venue's CCF rank |
| `core:` | `core:a*`, `core:a`, `core:b`, `core:c` | the venue's CORE rank |
| `role:` | `role:first`, `role:cofirst`, `role:second`, `role:last`, `role:middle` | your position in the author list (`middle`: none of the other four) |
| `type:` | `type:conference`, `type:journal` | the kind of venue the rank lists say it is (a venue without a rank has none) |
| `has:` | `has:award`, `has:talk` | a best-paper award or finalist mark; an Oral, Spotlight or Highlight mark |
| words | `ccf:a role:first cites:>100 detection` | everything together: all terms must match |

- An operator with a value it does not take (`ccf:x`) matches nothing, and the box is marked and says why on hover. A word whose colon follows no operator (`http://…`) is an ordinary word. The bare comparisons of earlier versions (`>100`, `>2020`) and the aliases `c:`, `y:`, `tier:` and `rank:` are gone.
- Typing an operator's colon (`role:`) lists its values; `↓`, or a click on the `/` hint, lists common ones. `↑` / `↓` choose, and `Enter` or `Tab` takes the chosen one. Otherwise `Enter` jumps to the next matching row and `Shift`+`Enter` to the previous one.
- `Escape` closes the list, then clears the box; on the page, `Escape` clears every filter.
- The quick buttons under the box toggle `ccf:a`, `cites:>100`, `role:first` and `has:award`; the settings offer more (`core:a*`, `role:cofirst`, `role:second`, `role:last`, `has:talk`), and a button for a kind of paper that nothing on the page draws is left out.
- The box takes up to 500 characters.

---

## Copy and export

Each format is a button in the panel's copy row and in the toolbar popup, and has its own switch under *Settings → Copy & export* (all on by default; with none on, there is no copy row). The paper formats take the papers the page shows now, after the filters, with the full author lists that *Read full lists* saved; the summary and the table count every loaded paper.

| Button | Output |
|---|---|
| *Copy summary* | The role × rank table as plain text, with the awards and talks line and the lists' edition |
| *Copy as table* | The role × rank table, tab-separated, for a spreadsheet (and as a real table for a word processor) |
| *Copy papers* | The papers, tab-separated: year, title, authors, role, venue, CCF, CORE, awards, citations (headers in the interface language); also as a real table for a word processor |
| *Copy APA* | APA 7th edition references: `Authors (Year). Title. *Venue*. URL`; also with real italics for a word processor |
| *Copy BibTeX* | BibTeX entries |
| *Copy Markdown* | A numbered Markdown list: linked title, authors, venue and year, ranks, awards, citations |
| *Copy JSON* | `{ owner, source, total, papers }`, one record per paper with its role, ranks and marks |
| *Export CSV* | The papers' table as a file, `<profile name>-papers.csv` |

- **BibTeX:** the key is the first author's surname, the year and the first word of the title with three or more letters that is not a common word such as `the`, `for`, `with` or `towards`, in lower-case ASCII: `vaswani2017attention`, `he2016deep`. Without a year it says `nodate`; a key that repeats gets `b`, `c`, … (`he2016deepb`). The entry is `@inproceedings` (booktitle) or `@article` (journal) as the rank lists or the venue's words say, else `@misc`. Fields: title, author (joined with `and`, ending `and others` where Scholar cut the list), booktitle or journal, year, url (the paper's Scholar page), and a note with the CCF / CORE ranks and the awards. Every character TeX reads (`\ { } $ & # ^ _ ~ %`) is escaped, so a title cannot carry a command.
- **APA 7th edition:** `I Stoica` → `Stoica, I.`, `MF Kaashoek` → `Kaashoek, M. F.`, `L van der Maaten` → `van der Maaten, L.`; two authors are joined with `&`; above 20 authors: the first 19, `…`, the last; a cut list ends with `…`; no year gives `(n.d.)`. The asterisks mark the italics.
- **Markdown:** every character Markdown reads is escaped, so a title cannot become a link or markup.
- **CSV:** RFC 4180, with a UTF-8 byte-order mark (so that Excel reads non-Latin text) and CRLF line ends; a field with a comma, quote, semicolon or line break is quoted.
- **Word, Docs, Pages:** the table, papers and APA buttons put HTML on the clipboard next to the text, so a word processor pastes a real table (with borders) or a reference list with real italics, a link and a hanging indent, while a spreadsheet or a text box takes the text as before. Every text in the HTML is escaped, and a cell that looks like a formula is made text as in the tab-separated form. The other formats are text only. The toolbar popup and the `export` call (`html: true`) give the same.
- **Spreadsheet formulas:** in the CSV and the tab-separated formats, a cell that begins with `=`, `+`, `-` or `@` (and is not a plain number) gets a leading apostrophe, so that a spreadsheet shows it as text.
- When the filters leave no paper, nothing is copied and the button says *Nothing to copy*.

---

## For AI agents

### Set it up through an AI assistant
*Settings → AI agents → Copy guide for agents* puts a Markdown guide on the clipboard: every setting (path, values, default, what it does), your current settings, the presets, the page calls and the search syntax. It is generated from the tables the code runs on (`SETTINGS` and `PRESETS` in `lib/prefs.js`, `METHODS` in `lib/agent.js`, `OPERATORS` in `lib/query.js`), so it cannot drift from them. Give it to your assistant with what you want, paste its answer — one JSON object — into *Configuration & presets → Paste or edit a configuration (JSON)*, and press *Apply configuration*.

### Page events
On a profile page the extension sets the attribute `data-rr-ready` (value `"true"`) on `<html>` once it runs, and answers `better-scholar:request` events dispatched on `document` with `better-scholar:response` events:

```javascript
const id = crypto.randomUUID();
const answer = new Promise((resolve) => {
  const on = (e) => { if (e.detail.id === id) { document.removeEventListener("better-scholar:response", on); resolve(e.detail); } };
  document.addEventListener("better-scholar:response", on);
});
document.dispatchEvent(new CustomEvent("better-scholar:request", { detail: { id, method: "export", params: { format: "bibtex" } } }));
const { ok, result, error } = await answer;   // result.text is the BibTeX
```

The request's `detail` is `{ id, method, params }`; an `id` that is a string or a number comes back unchanged (anything else comes back as `null`). The answer is `{ id, ok: true, result }` or `{ id, ok: false, error }`.

| Call | Parameters | Result |
|---|---|---|
| `ping` | none | `{ version, owner, loaded, complete }` |
| `summary` | none | The role × rank tables (CCF, CORE, by role only), the awards and talks counts, the citation totals |
| `papers` | `filtered` (default `true`: the papers the page shows; `false`: every loaded paper) | `{ owner, total, papers: [{ id, title, authors, venue, year, citations, role, status, highlighted, type, rank, marks, url }] }` |
| `export` | `format` (required: `summary`, `table`, `papers`, `apa`, `bibtex`, `markdown`, `json`, `csv`); `source` (`ccf`, `core`, `none`; for the summary and the table); `html` (`true`: also return `html` for `table`, `papers` and `apa`) | `{ format, text, html? }` |
| `filter` | `query`, `onlyHighlighted`, `yearStart`, `yearEnd`, `minCitations`, `impact` (`h` or `i10`); `null` clears a number | `{ shown, total, filters, errors }` |
| `clearFilters` | none | `{ shown, total, filters, errors }` |

- The parameters are checked before anything runs; a wrong one is answered with `ok: false` and the reason. `filter` is refused while the panel is switched off, since nothing on the page could undo it.
- The calls read what the panel shows and set the page's filters. They cannot read or change the settings and make no network request. Any script on the page can make them; see [`SECURITY.md`](SECURITY.md).
- The toolbar popup makes the same calls through the extension's own messages (`{ type: "rr:call", method, params }`), which web pages and other extensions cannot reach.

---

## Install

### Chrome and other Chromium browsers (Edge, Brave, Arc, Opera)

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the [`src/`](src/) folder.
5. Open a Google Scholar profile (`scholar.google.com/citations?user=…`).

> [!TIP]
> After `git pull`, click the reload icon on the Better Scholar card at `chrome://extensions` and reload open Scholar tabs.

### Packaged build

```bash
scripts/package-chrome.sh      # checks the bundled data, then writes dist/better-scholar-chrome-<version>.zip
```

---

## Repository layout

```
better-scholar/
├── src/                    The extension (load unpacked from here)
│   ├── manifest.json       Manifest V3; one permission (storage); scripts on Scholar pages
│   ├── background.js       Opens the settings page for the panel; serves the chosen language's strings
│   ├── content/            On Scholar: page reader, panel, chips, storage, page events, paper pages, language redirect, styles
│   ├── lib/                Pure logic: names, venues, marks, awards, metrics, query, formats, prefs, agent, analysis, duplicates, i18n
│   ├── data/               Bundled CCF / CORE lists, the award list, curated venue aliases
│   ├── options/            Settings page with a live preview
│   ├── popup/              Toolbar popup: the summary table and the copy buttons
│   └── _locales/           Strings of the 30 interface languages
├── data/                   Source datasets (CCF PDF extract, ICORE export, awards) and their provenance
├── scripts/                Data builders, CCF extractor, award readers, checks, packaging, accessibility audit
├── test/                   unit tests; e2e/ runs the end-to-end checks in Chromium against a Scholar stand-in
├── docs/                   Architecture and roadmap
├── store/                  Chrome Web Store submission kit: listing text, the evidence behind each claim, package record, images
└── contrib/safari/         Best-effort Safari wrapper generator
```

---

## Development and testing

The unit tests run on Node.js (20 or later) with no dependencies; the end-to-end checks and the audits need Playwright and a Chromium build.

```bash
npm test                              # the unit tests
npm run test:e2e                      # the end-to-end checks: the real extension in Chromium against a local Scholar stand-in
npm run test:update                   # rewrite the venue snapshot, after reviewing its diff
npm run data                          # rebuild src/data/{ccf,core,awards}.js from data/*.json
npm run check:profile -- page.html    # the extension on a real saved Scholar profile page
node scripts/axe-audit.mjs            # accessibility audit with axe-core
```

### Accessibility checks
What is checked, and how — not a claim of conformance to any WCAG level:

- `node scripts/axe-audit.mjs` runs axe-core 4.10's default rules over the panel on the local Scholar stand-in (light; with the system in dark mode; filtered with the unranked-venue list open; every part on; the narrow-window layout; in Arabic, Japanese, Thai and German), the settings page (light and dark, and in the states a person puts it in: a part hovered, a name being renamed, the tray open, a venue checked) and the toolbar popup (with no profile open, and over a profile in light and dark and in four languages; also with every name at its longest). It exits 1 on any violation. It is run by hand, not in CI.
- A unit test keeps the faint text colours of the panel, the settings page and the popup, the last-author name on its tint, and Scholar's grey lines on the row tints at a contrast of 4.5:1 or more.
- On the settings page, each role colour has its contrast badge (see [the settings page](#5-the-settings-page)).

---

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): the modules, the matching rules, storage, the panel, the tests.
- [`ROADMAP.md`](ROADMAP.md) and [`docs/ROADMAP.md`](docs/ROADMAP.md): what is next, the known gaps, and what was set aside and why.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): commands, fixing the matcher with real strings, adding a setting, adding an award source.
- [`SECURITY.md`](SECURITY.md): what web pages can reach, what to report and how.
- [`PRIVACY.md`](PRIVACY.md): what is stored, where, and what is sent.
- [`AGENTS.md`](AGENTS.md): notes for AI agents and automation.
- [`CHANGELOG.md`](CHANGELOG.md): what changed in each version.

---

## Data sources

| Dataset | Edition | Scope | Source |
|---|---|---|---|
| **CCF recommended list** | 2026 (7th edition) | 386 conferences + 295 journals (A 95, B 245, C 341) | [ccf.org.cn](https://www.ccf.org.cn/Academic_Evaluation/By_category/), extracted reproducibly from the official PDF |
| **CORE conference ranks** | ICORE 2026 | 800 ranked conferences (A* 62, A 108, B 249, C 381) | [portal.core.edu.au](https://portal.core.edu.au/conf-ranks/), the official export |
| **Paper awards** | 2026-10, curated | 7830 paper awards | Official award pages: the [ACL Anthology](https://aclanthology.org), the Computer Vision Foundation, the conferences and their societies (ACM SIGs, IEEE technical committees …); each entry keeps its page and a quoted snippet |

The ranks are today's lists, not the rank a venue had when a paper was published. A GitHub workflow checks every Monday that the bundled CCF and ICORE files are still what the official sources publish (`.github/workflows/data-fresh.yml`). The ranking lists belong to their creators and are included for reference — see [`NOTICE`](NOTICE).

---

## Platform policy

Chrome is the primary supported platform: features, APIs and UI are designed for Chrome Manifest V3, and no shim or reduced behaviour is accepted for another browser. Other Chromium browsers (Edge, Brave …) run the same package. Safari support is best-effort, in [`contrib/safari/`](contrib/safari/README.md), as a wrapper generated from `src/`.

---

## License

Licensed under the [Apache License 2.0](LICENSE).
The ranking datasets remain the property of their respective organisations (see [`NOTICE`](NOTICE)).
