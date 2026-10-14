# Chrome Web Store listing kit

Everything a Web Store listing asks for, ready to paste. (No listing has been made.) **Privacy policy URL:** https://boyugou.github.io/better-scholar/privacy/ (the site's copy of `PRIVACY.md`; `npm run sync-privacy` on the `site` branch refreshes it).

- **Name:** Better Scholar
- **Summary (≤132):** the `extDescription` of `src/_locales/en/messages.json`.
- **Category:** Productivity. **Language:** English (30 interface languages are packaged).
- **Screenshots (1280×800):** `shot-1.png` (a profile with the panel), `shot-2.png` (the settings page).
- **Promo tiles:** `promo-small-440x280.png`, `promo-marquee-1400x560.png`.
- **Icon:** `src/icons/icon-128.png`.

## Description

See your place in every paper at a glance. On a Google Scholar profile this extension colours each paper by your authorship role (first, co-first, second, last author), marks your name in the author line, shows the CCF and CORE rank of the venue beside it, and adds up the result in one table: "4 first-author CCF-A papers".

• Role × rank table: click a cell to list those papers; copy the summary or the list for a CV or a grant form.
• Awards and talks: best-paper and test-of-time awards (from the conferences' own pages), Oral, Spotlight, Highlight.
• Read the full author lists Scholar cuts off, with one click (optionally via Semantic Scholar, which receives only the title).
• Optional: merge duplicate entries, hide parts of Scholar's page, your own role colours, papers by year, top venues.
• 30 languages. Free and open source (Apache 2.0).

Ranks are the current CCF 2026 / ICORE 2026 lists, not the rank at the time of publication.

## Privacy practices form

- Single purpose: show authorship roles and venue ranks on Google Scholar profile pages.
- `storage`: saves your settings (synced through your Chrome profile) and a cache of paper details you asked it to read.
- Host access: only the Google Scholar profile pages (content-script matches); no remote code.
- Data use: no personal data is collected, sold or transferred. The optional Semantic Scholar lookup sends only a paper's title to api.semanticscholar.org, when you switch it on and press Read full lists.
