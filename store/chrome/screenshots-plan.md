# Screenshots and promo images

The eight files in `store/chrome/images/` (five screenshots, two promo tiles, the icon) are made by one command, from the real
extension, and are current. They were regenerated at commit `8c5fe05` (version 2.41.0) and checked on 2026-10-15; `src/` has
changed since only in the German strings and the preview editor's drag handling (`touch-action`, a cancelled drag), none of
which any picture shows. All have the sizes and formats the store asks for (`listing.md`, "Graphic assets": screenshots
1280×800 JPEG, small tile 440×280, marquee 1400×560, icon 128×128 PNG).

## How they are made

```bash
npm run store:images        # = node scripts/store-images.mjs
```

- It loads `src/` into Playwright's Chromium (found the way `test/e2e/find-browser.mjs` finds it; set `PLAYWRIGHT_PATH` and
  `CHROMIUM_PATH` if it does not; branded Chrome 137 and later ignores `--load-extension`, `CLAUDE.md`), opens the end-to-end
  test's stand-in Scholar page (`test/e2e/fixture-server.js`) with the fictional profile "Alex Example"
  (`test/fixtures/profiles/showcase.json`), and photographs the panel, the search, the settings page and the toolbar popup. No
  real person's papers, no Google or Scholar logo. The shipped award list is used, plus one fictional award for the showcase
  profile (so that a "Best paper" chip shows). The settings are the defaults.
- Each capture is taken at twice its size and laid out in a small HTML page (headline, caption, a plain browser window around
  the capture), which Chromium photographs as a JPEG of quality 95 without alpha. Nothing is written to
  `store/chrome/images/` unless every picture was made and has the right size.
- It rewrites every file there, `README.md` included (`store/chrome/images/README.md` says what each picture shows). Edit the
  words (headlines, captions, the promo lines) in `scripts/store-images.mjs`, not in the generated files. `icon-128.png` is a
  copy of `src/icons/icon-128.png`.
- It needs Playwright and a Chromium build, and no network.

## What each picture says and shows

| File | Headline and caption (drawn into the picture) | Shows |
|---|---|---|
| `screenshot-1.jpg` | "See your role in every paper." Rows coloured by authorship role; every venue the CCF and CORE lists place carries today's rank. | The profile with rows tinted by role, the owner's name marked, rank, award and talk chips, and the panel at the right. |
| `screenshot-2.jpg` | "Papers by role and rank." One table, with awards and talks, citation totals and one-click copy or export. | The panel up close in its two-column layout. |
| `screenshot-3.jpg` | "Filter by role, rank and citations." Type `role:first ccf:a cites:>100` and the list, the table and the citation totals follow. | The search typed in: "Showing 5 of 12 papers", the quick filters lit. |
| `screenshot-4.jpg` | "Choose what you see." Every part of the panel has its own switch and every colour its own picker, with a live preview. | The settings page: the card "Highlight my papers" and the preview with its hint and the tray "Hidden: 6". |
| `screenshot-5.jpg` | "Your summary in the toolbar." The toolbar button shows the open profile's table, with the same copy and export. | The toolbar popup over the profile, by CORE rank, with the eight copy and export buttons. |
| `promo-small.jpg` | "Better Scholar", "Roles and ranks on every paper" | The icon and the top of the real panel's table on the icon's navy. |
| `promo-marquee.jpg` | "Better Scholar", "Your authorship role, and the CCF and CORE rank of each venue the lists place, on every Scholar profile." | The icon and the real panel's table, copy buttons and note, running off the bottom edge. |
| `icon-128.png` | none | The extension's own icon. |

`listing.md` has the longer description of each picture, in the order to upload them. Not pictured: the "Check a venue" card,
the editor of the preview in use (hovering, dragging) and the HTML on the clipboard.

## When the interface changes

1. Run `npm run store:images`, then open every picture. Check what the words promise against what the picture shows: the eight
   copy buttons, "Showing 5 of 12 papers", "Hidden: 6" (the six things that are off by default: five quick filters and the
   venue list), the CORE tab of the popup.
2. Commit the pictures with the change that made them stale. They are used beyond the store: README.md and README.zh-CN.md show
   all five, and the project site's hero picture is `screenshot-1.jpg` (`CONTRIBUTING.md`, "The website"), so the site needs
   building and deploying again.
3. Update `listing.md` ("Graphic assets": what each screenshot shows) and `claims.md` section 4.8 when the pictures or their
   words change, and run `node store/chrome/check-claims.mjs`.

## Wording that said more than the code does (fixed)

Screenshot 1's caption, the marquee line and screenshot 4's caption used to say "each venue marked" and "every role, colour and part … has its
own switch"; they now say "every venue the CCF and CORE lists place" and "every colour its own picker" (`SHOTS` and `PROMO` in
`scripts/store-images.mjs`).

Still open, guidance only:

1. The small tile carries the name and a line of text (the image guide says "Avoid text"), and the
   icon's artwork fills the square instead of 96×96 with 16 px of transparent padding.
2. For Microsoft Edge: its large promotional tile must be a 1400×560 **PNG**, so `promo-marquee.jpg` needs converting; Edge
   takes up to 6 screenshots at 640×480 or 1280×800, so the five here fit.
