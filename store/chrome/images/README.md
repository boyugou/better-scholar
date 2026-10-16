# Chrome Web Store images

Made by `npm run store:images` (scripts/store-images.mjs), which rewrites every file here, this one included: edit the
words in the script, not here. The screenshots are of the real extension running in Chromium on the end-to-end test's stand-in
Scholar page, with the fictional showcase profile "Alex Example" (`test/fixtures/profiles/showcase.json`); no real person's data,
no Google or Scholar logo. Screenshots and promo tiles are JPEG (quality 95, no alpha).

## screenshot-1.jpg (1280×800)

**See your role in every paper.** Rows coloured by authorship role; every venue the CCF and CORE lists place carries today's rank.

A Scholar profile with the extension on: each paper's row is tinted by the owner's authorship role (first, second, last author), the owner's name is marked in the author line, the venue carries its CCF and CORE chips, awards and talks have their own chips (Best paper, Oral, Spotlight), and the panel at the top of the sidebar adds it up in the role × rank table.

## screenshot-2.jpg (1280×800)

**Papers by role and rank.** One table, with awards and talks, citation totals and one-click copy or export.

The panel up close, in the two-column layout it takes in a narrower window: the role × rank table with its CCF / CORE switch, the copy and export buttons (summary, table, papers, APA, BibTeX, Markdown, JSON, CSV), the note that the ranks are today's lists, the Awards & talks counts, the highlighted papers by year, the filters and the citation totals of the highlighted papers.

## screenshot-3.jpg (1280×800)

**Filter by role, rank and citations.** Type role:first ccf:a cites:>100 and the list, the table and the citation totals follow.

The panel's search box with the query `role:first ccf:a cites:>100` typed in: the paper list keeps the five first-author CCF A papers with more than 100 citations, the filter bar at the top of the panel says "Showing 5 of 12 papers" and offers Clear, the matching quick-filter pills light up, and the citation totals count only those papers.

## screenshot-4.jpg (1280×800)

**Choose what you see.** Every part of the panel has its own switch and every colour its own picker, with a live preview.

The settings page (light): the "Highlight my papers" switches for each authorship role and for marking your name, the start of the Colours section with its palettes, and on the right the live preview (sample papers and the real panel), which is always Scholar's light page.

## screenshot-5.jpg (1280×800)

**Your summary in the toolbar.** The toolbar button shows the open profile's table, with the same copy and export.

The toolbar popup open over the profile page: the profile owner and paper count, the role × rank table (here by CORE rank; CCF is one click away), the Awards & talks line, the copy and export buttons and the note on where the ranks come from.

## promo-small.jpg (440×280)

The small promo tile: the icon, "Better Scholar", the line "Roles and ranks on every paper", and the top of the real panel (its role × rank
table) on the icon's navy.

## promo-marquee.jpg (1400×560)

The marquee promo tile: the icon, "Better Scholar", the line "Your authorship role, and the CCF and CORE rank of each venue the lists place, on every Scholar profile.", and the real panel's table, copy and export
buttons, data note and Awards & talks counts, running off the bottom edge.

## icon-128.png (128×128)

A copy of `src/icons/icon-128.png`, the extension's own icon. (The store's guidance is a 96×96 artwork with 16 px of
transparent padding per side; this icon fills the whole square.)
