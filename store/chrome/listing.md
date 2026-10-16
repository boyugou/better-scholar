# Chrome Web Store listing: Better Scholar 2.41.0

Every field of the Developer Dashboard, in the order the dashboard shows it (Package, Store listing, Privacy,
Distribution, Test instructions). Copy the text inside each `text` block as it is. Each factual statement has its
evidence in `claims.md` (`node store/chrome/check-claims.mjs` searches every quote there); if the code changes, check there
first.

Prepared 2026-10-15 for the package built from commit `f1cd4f1` (see `package-check.md`).

## 1. Package

Upload `dist/better-scholar-chrome-2.41.0.zip` (built by `bash scripts/package-chrome.sh`). Nothing to type.

The dashboard takes the **title**, the **summary** and the **version** from the package (the store icon is uploaded
separately, below). Google's "Prepare your extension" page: "After uploading your item, you won't be able to edit the
metadata of your manifest in the developer dashboard." To change any of them, change the package and upload it again.

## 2. Store listing

### Title (from the package, read-only)

```text
Better Scholar
```

### Summary (from the package, read-only)

What the dashboard will show now: the `extDescription` of `src/_locales/en/messages.json` (124 characters; the limit is
132). Each of the 30 locales supplies its own translation, and the store shows the one that matches the visitor.

```text
Enhance Google Scholar: authorship roles, CCF & CORE ranks, conference awards, year distribution charts, and instant search.
```

It is accurate. If you want the summary to state the single purpose more directly, here are two alternatives (both within
132 characters, no superlatives). To use one, replace `extDescription` in `en` **and the 29 other locales** (a test
checks every locale against the limit; the Spanish one is already exactly 132), then package again.

Alternative A (128 characters):

```text
On Google Scholar profiles: the owner's authorship role in each paper, the venue's CCF and CORE rank, and a role × rank summary.
```

Alternative B (127 characters):

```text
Authorship roles and today's CCF and CORE venue ranks on Google Scholar profiles, with a role × rank table, filters and export.
```

### Description

Plain text, 2,490 characters, 10 lines starting with "• ". No Markdown. Paste it as it is.

```text
Better Scholar adds two things to Google Scholar profile pages: the profile owner's authorship role in each paper, and the rank of the venue it appeared in. A panel counts them in one table.

• Roles: rows where the owner is first, co-first, second or last author are tinted in that role's colour, and the owner's name is marked.
• Ranks: venues on the China Computer Federation list (7th edition, 2026) or the ICORE 2026 conference ranking get a rank chip whose tooltip says how it was matched. Venues it cannot match get no chip and are listed in the panel.
• Summary: a role × rank table (click a cell to list those papers), citation totals and h-index of the highlighted papers, and a chart by year.
• Awards and talks: chips for awards on a bundled list (7,830 paper awards at major conferences) and for the Oral, Spotlight and Highlight labels authors write in the title or venue.
• Search: press / and type, for example role:first ccf:a cites:>100.
• Copy and export: the summary or the papers shown, as plain text, a table, APA, BibTeX, Markdown, JSON or CSV; the table, the papers and APA also paste into Word or Docs as a real table or with real italics. The toolbar button and page events for scripts or AI agents give the same data.
• Settings: a switch for each role and for every part of the panel and every thing in it, in any order, with your own names for titles and buttons; the look and colours of the chips; a live preview that you edit by hovering it (hide, move, rename); a box that checks a venue against the lists; merging duplicate entries, hiding parts of the profile page, 30 languages, and reopening search and profile pages in a chosen language.

The ranks come from today's CCF and CORE lists, not the rank a venue had when the paper was published. CCF states that its list is not a basis for academic evaluation.

• By default it presses the page's own "Show more" button about once a second, only while the tab is in front, until the whole list is loaded. It stops if no more rows arrive; a setting turns it off.
• When a long author list is cut off, "Read full lists" opens each paper's own page on the same site, only when you click it, about once a second, and stops at the first CAPTCHA.
• An option, off by default, asks Semantic Scholar's public API for those lists first. Each request's only content is the paper's title (and your API key, if you add one); no cookies are sent.

Everything else runs in your browser: no account, no analytics, no ads. Settings and the name spellings you add are kept in Chrome's storage; author lists it has read stay on this device for 90 days. Its one permission is storage, and it runs only on Scholar's pages.

Free and open source (Apache 2.0). Better Scholar is an independent project and is not affiliated with or endorsed by Google.
```

Checks done on this text (re-counted 2026-10-16, after two bullets were extended for 2.40.0 and 2.41.0; still true of 2.41.0): 2,812
characters; "Scholar" appears 5 times (counting "Better Scholar", "Google Scholar" and "Semantic Scholar"), "CCF" 3 (once as
`ccf:a`), "CORE" 2, "rank" 4 (7 with "ranks" and "ranking"), all in sentences (policy: no "unnatural repetition of the same
keyword more than 5 times"); no competitor is named; no superlatives. The text says what 2.40.0 and 2.41.0 added in two bullets (the
HTML on the clipboard; the own names, chip looks, editable preview and venue box), each with its row in `claims.md` (L36 to L39);
`type:conference` and `type:journal` are not mentioned.

### Category

```text
Education
```

Under Productivity › Education. The pages `chromewebstore.google.com/category/extensions/productivity/education`,
`…/tools` and `…/workflow` exist (checked 2026-10-15), so **Education**, **Tools** and **Workflow & Planning** are all
offered. Education fits researchers reading publication records; Tools is the neutral alternative. Owner's choice: pick
from the live drop-down.

### Language

```text
English
```

The package carries 30 interface languages; the store shows each locale's own title and summary. A translated detailed
description per locale is optional (Store listing → localize).

### Graphic assets

Files are in `store/chrome/images/` (described in its `README.md`; both are written by `npm run store:images`, see
`screenshots-plan.md`). They were regenerated at commit `8c5fe05` (version 2.41.0) from the real extension on a stand-in
Scholar page with the fictional profile "Alex Example"; `src/` has changed since only in the German strings and the preview
editor's drag handling, which no picture shows. Requirements from "Supplying images" and "Complete your listing
information" (developer.chrome.com, read 2026-10-15). Sizes and formats below were measured with `sips` on 2026-10-15.

| Dashboard field | File | Required | File as made | Status |
|---|---|---|---|---|
| Store icon | `icon-128.png` | 128×128 PNG; guidance: 96×96 artwork with 16 px transparent padding | 128×128 PNG with alpha; same bytes as `src/icons/icon-128.png` | OK. The artwork fills the square (guidance, not a rule). |
| Global promo video | none | optional | none | Leave empty. |
| Screenshot 1 | `screenshot-1.jpg` | 1280×800 or 640×400; at least 1, at most 5; square corners, no padding | 1280×800 JPEG, no alpha (208 KB) | OK. Caption wording: see below. |
| Screenshot 2 | `screenshot-2.jpg` | same | 1280×800 JPEG (137 KB) | OK. |
| Screenshot 3 | `screenshot-3.jpg` | same | 1280×800 JPEG (173 KB) | OK. |
| Screenshot 4 | `screenshot-4.jpg` | same | 1280×800 JPEG (161 KB) | OK. Caption wording: see below. |
| Screenshot 5 | `screenshot-5.jpg` | same | 1280×800 JPEG (222 KB) | OK. Shows the popup with the eight copy buttons of 2.41.0. |
| Small promo tile | `promo-small.jpg` | 440×280, PNG or JPEG; required ("You must provide one small, 440x280-pixel promotional image"); guidance "Avoid text" | 440×280 JPEG (25 KB) | OK. Has the name and a line of text (guidance only). |
| Marquee promo tile | `promo-marquee.jpg` | 1400×560, PNG or JPEG; optional | 1400×560 JPEG (102 KB) | OK. |

What each screenshot shows (the headline and caption are drawn into the images; the store has no caption field). Upload them
in this order:

1. "See your role in every paper." The profile of the fictional "Alex Example": rows tinted by role (blue, amber, green), the
   owner's name marked, CCF and CORE chips, award (Best paper) and talk (Oral, Spotlight) chips, and at the right the panel:
   the role × rank table with its CCF / CORE switch and the note that the ranks are today's lists, the eight copy and export
   buttons, the Awards & talks counts and the search box with its quick filters.
2. "Papers by role and rank." The panel up close in its two-column layout: the table, the note, the copy and export buttons,
   the awards and talks counts, the search box, the quick filters, "Only highlighted", the year range, the citation totals of
   the highlighted papers, the year chart and the name help.
3. "Filter by role, rank and citations." The search `role:first ccf:a cites:>100` typed in: five papers left, the bar
   "Showing 5 of 12 papers" with Clear, and the quick filters CCF A, >100 and First lit (the totals below follow; they are
   under the fold in this picture).
4. "Choose what you see." The settings page: the row of section links, the card "Highlight my papers" (a switch for each
   role and for marking your name) and the start of "Colours", and at the right the live preview (four sample rows, its note,
   the hint "Hover a part to hide it (✕) or move it (⠿). Double-click a name to rename it." and the tray "Hidden: 6").
5. "Your summary in the toolbar." The toolbar popup over the profile: owner and paper count, the table (here by CORE rank),
   the Awards & talks line, the eight copy and export buttons and the note on the ranks.

The captions were made exact (screenshot 1 and the marquee say "every venue the CCF and CORE lists place"; screenshot 4 says every
colour has its own picker); the words live in `scripts/store-images.mjs`, see `screenshots-plan.md`.

### Additional fields

| Field | Value |
|---|---|
| Official URL | Leave empty. It lists only sites verified as yours (Search Console); not needed. |
| Homepage URL | `https://boyugou.github.io/better-scholar/` (its badge now says "Runs in your browser"; its search-operator cards still show syntax removed in 2.39.0, `claims.md` 4.3: a should-fix on the `site` branch, it does not stop you entering the URL) |
| Support URL | `https://github.com/boyugou/better-scholar/issues` |
| Mature content | Off |

## 3. Privacy

The dashboard docs say: "Your disclosures are displayed to Chrome users, and should be consistent with the existing
privacy policy URL that you provided." The policy on the site must be brought level with PRIVACY.md first (`claims.md` 4.2:
the live page lacks the paragraph on the HTML clipboard); the answers here describe the code as it is, and PRIVACY.md says the
same.

### Single purpose description

```text
Better Scholar shows, on Google Scholar profile pages, the profile owner's authorship role in each paper (first, co-first, second or last author) and the CCF and CORE rank of the paper's venue, and counts the papers by role and rank in one table. Everything else serves that view: loading the whole paper list so that the count is complete, reading author lists that Scholar cuts off so that a hidden role can be found, filters, citation totals and copy or export of the same data, and settings for what is shown and in which language.
```

### Permission justification: storage

```text
storage keeps the user's settings and the extension's own working data. chrome.storage.sync: the settings (what to show and in which order, colours, chip looks, the user's own names for titles and buttons, languages) and the extra spellings of a profile owner's name that the user adds on that profile, so that they follow the user's Chrome profile. chrome.storage.local, on this device only: whether the panel is folded and which ranking its table shows; the author lists and venue text read with "Read full lists" (at most 3,000 papers, kept for 90 days, viewable and clearable on the settings page); an optional Semantic Scholar API key the user may enter; and, for a moment, a venue text (at most 300 characters) that the user asked the settings page to check by pressing Check beside a venue of the panel's unranked list. Nothing in storage is sent to the developer.
```

### Host permission justification

The manifest has no `host_permissions`; its site access comes from the content scripts' match patterns. If the tab shows a
box for them, paste:

```text
Site access comes only from two content scripts, both limited to Google Scholar. (1) The main script matches https://scholar.google.<domain>/citations*, the path of Scholar's author pages, and draws only on a profile page (it checks for the profile's name and paper table and leaves other pages alone). (2) A small script, content/lang-redirect.js, matches https://scholar.google.<domain>/* at document start. It acts only on /scholar and /citations, and only if the user chose a language under "Open Scholar in" (off by default): it reopens the page with that hl= value. It reads no page content. Both list the same 187 domains because Scholar is served under Google's country domains (scholar.google.co.uk, scholar.google.com.sg and so on) and a match pattern cannot wildcard a top-level domain. The list is generated from Google's own list (https://www.google.com/supported_domains). No other site is matched.
```

### Are you using remote code?

Select:

```text
No, I am not using remote code.
```

If a justification box appears anyway:

```text
All code is in the package. The content scripts, toolbar popup, settings page and service worker load only files from the zip; there is no eval, new Function, dynamic import or remotely hosted script. The extension fetches data, never code: Scholar's own paper pages (parsed with DOMParser; only text is read), JSON from api.semanticscholar.org when the user switches that on, and its own _locales files. The rank and award lists are bundled; the settings page also loads the CCF and CORE lists from the zip, for its "Check a venue" box, and makes no request. The page-event listener for scripts on the page answers six fixed calls (ping, summary, papers, export, filter, clearFilters), checks their parameters, and runs nothing it receives.
```

### Data usage

Google's User Data FAQ (FAQ 3): "Extensions are required to disclose how they handle user data, even when data is
processed or stored locally." The boxes below are decided on that basis. The type names are as the dashboard form listed
them when it was introduced; match by name in the live form.

| Data type | Tick? | Why (from the code) |
|---|---|---|
| Personally identifiable information | **Tick** (owner decision, see below) | It reads the author names Scholar prints on the open profile, and it stores spellings of the owner's name that the user types (`chrome.storage.sync`, per profile). Names are the FAQ's first example of personal information. They are never sent to the developer or to Semantic Scholar. |
| Health information | Leave empty | Nothing health-related is read or stored. |
| Financial and payment information | Leave empty | Free; no payments, no purchases. |
| Authentication information | **Tick** | The optional Semantic Scholar API key: stored on this device only, sent only to `api.semanticscholar.org` (as `x-api-key`). Scholar's own cookies go with the same-site requests of "Read full lists", as when the user opens those pages; the extension never reads or stores them. |
| Personal communications | Leave empty | No email, chat or messages. |
| Location | Leave empty | No location is read. Like any web request, Scholar and (when switched on) Semantic Scholar see the IP address; the extension does not read or keep it. |
| Web history | Leave empty | It keeps no list of pages visited. It reads the address of the Scholar page it runs on (profile id, `hl=`); on the device, the cache is keyed by Scholar's paper id and the spellings by profile id. |
| User activity | Leave empty | It handles "/" and Escape and clicks on its own controls, closes its menus on an outside click or scroll, and notices a click on Scholar's "Show more" button (to know a load has started); nothing is logged, kept or sent. |
| Website content | **Tick** | It reads titles, author lines, venues, years and citation counts of the open profile (in the browser), keeps author lists read from paper pages (90 days, on the device), and, only if the user switches on Semantic Scholar, sends paper titles to `api.semanticscholar.org`. |

Owner decision on personally identifiable information: ticking it is the conservative reading of FAQ 3 (names are
handled and stored). Leaving it empty is defensible only if the names are treated as part of the website content (they are
printed on a public page, and the spellings are spellings of that printed name). Ticking shows "Personally identifiable
information" on the listing; the privacy policy then explains that it never leaves the browser.

The clipboard and files are not a data type on the form. For the record: the extension writes to the clipboard only when the
user clicks a copy button (the table, papers and APA buttons write the text and an HTML version of the same data, so that a
word processor pastes a real table or real italics), saves a CSV or the settings as a file only on a click, and never reads
the clipboard (`claims.md` L36, P19). PRIVACY.md says so under "Clipboard" and "Files".

### Certifications

Tick all three. The wording below is the form's as reported since its introduction in 2020; confirm it in the live tab.

| Statement | Why it is true |
|---|---|
| I do not sell or transfer user data to third parties, outside of the approved use cases | Nothing is sold. The one transfer is paper titles (and the user's own key) to Semantic Scholar, made only after the user switches the option on, to provide the feature the user asked for. Limited Use allows a transfer "if necessary to providing or improving your single purpose". |
| I do not use or transfer user data for purposes that are unrelated to my item's single purpose | Every use is the profile view, its loading and its exports. |
| I do not use or transfer user data to determine creditworthiness or for lending purposes | None. |

The opt-in itself: the setting is off by default (`semanticScholar: false`) and its own text says "(it receives the
paper's title and nothing else)"; once it is on, the panel's hint under "Read full lists" says the same before the click
("Asks Semantic Scholar for each paper's author list first (it receives only the title)"); no preset turns it on. That is
the in-interface disclosure and affirmative action the User Data FAQ (FAQ 10) asks for.

### Privacy policy URL

```text
https://boyugou.github.io/better-scholar/privacy/
```

Enter it only after the site's copy of PRIVACY.md is level with the repository's (`npm run sync-privacy` on the `site`
branch, then deploy; `claims.md` 4.2 lists what the live page still lacks or gets wrong). PRIVACY.md already carries the
Limited Use statement ("Chrome Web Store user data policy"), and the live page has it too.

## 4. Distribution

| Field | Value |
|---|---|
| Payments | Free (no payments, no in-app purchases) |
| Visibility | Public. (Unlisted: installable only by link. Private: only trusted testers.) |
| Regions | All regions. EU listing depends on the trader declaration on the Account page (`README.md`). |

## 5. Test instructions

The tab is optional ("This step is not required for publishing"); it helps here because Scholar may refuse automated
traffic.

```text
No account, login or payment is needed. Everything works on a public Google Scholar profile.

1. Open https://scholar.google.com/citations?user=JicYPdAAAAAJ&hl=en
2. A "Better Scholar" panel appears at the top of the right-hand column (above the paper list in a narrow window). Rows where the profile owner is first, second or last author are tinted blue, amber or green; venues on the CCF or CORE list get chips. Scholar's order may change, but for example:
   - "Imagenet classification with deep convolutional neural networks": last author (green), chips CCF A and CORE A* (NeurIPS) and a "Test of time" award chip.
   - "Dropout: a simple way to prevent neural networks from overfitting": second author (amber), CCF A (JMLR).
   - "Visualizing data using t-SNE": last author, CCF A (JMLR).
   - "Deep learning" (Nature): last author and no rank chip. Nature is on neither list; that is by design.
3. While the panel shows "Loading… N", the extension is pressing Scholar's own "Show more" button about once a second, only while the tab is in front. "Cancel" stops it; Settings > Paper list > "Load all papers automatically" turns it off.
4. Click a cell of the "Papers by role and rank" table to list those papers. Press / and type role:first ccf:a cites:>100 to filter (type:journal and type:conference also work). "Copy summary" copies the table as text. "Copy as table", "Copy papers" and "Copy APA" put the text and an HTML version of the same data on the clipboard (a word processor pastes a real table); "Export CSV" saves a file. The extension writes to the clipboard only when you click, and never reads it.
5. Click the toolbar button: the popup shows the same table and copy buttons for the open profile.
6. Click the settings button of the panel or of the popup (or Details > Extension options on chrome://extensions). The settings page opens in a tab and makes no network request. Its preview on the right is the real panel over sample rows: hover a part of it to hide it (✕), move it (⠿) or rename it (✎); the tray "Hidden: N" shows what was hidden and puts it back. Every switch on the left changes the preview at once.
7. On the settings page, the card "Check a venue" (after "Semantic Scholar"): paste a venue as Scholar prints it. "Proceedings of the IEEE conference on computer vision and pattern recognition" gives CCF A and CORE A* ("Matched by name"). "Findings of the Association for Computational Linguistics: ACL 2023" gets no rank: it is a secondary track, and the extension never guesses.
8. Network features, both started only by the user: "Read full lists" (offered when Scholar cut off author lists) opens each paper's Scholar page about once a second. The Semantic Scholar lookup is off by default (Settings > Semantic Scholar).

Note: Google Scholar sometimes answers automated or data-center traffic with a CAPTCHA, or with "The system can't perform the operation now. Try again later." Both come from Scholar. The extension adds no CAPTCHA and does not try to get around one: it stops loading the list as soon as Scholar sends no more rows, and stops reading paper pages at the first CAPTCHA. When loading stops early, the panel says "Scholar sent no more papers (N loaded). Try “Load all” again in a moment." The table and the chips still cover the papers that did load; the example rows above are among the first 20 (Scholar lists the most cited first), so they show even then. Solving the CAPTCHA in the tab, or waiting and reloading, lets the rest load.
```
