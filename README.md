# Better Scholar: the website

Source of the project site (30 languages). It lives on its own branch, `site`; the built pages live on `gh-pages`.
The extension itself is on `main`.

```
src/languages.json    the languages (code, own name, direction)
src/i18n/<code>.json  all the words of the page, one file per language (en.json is the source)
src/assets/           styles, script, icons, the card a shared link shows (og.png); no screenshots (the hero picture and the demo come from the extension)
build.mjs             builds _site/ (no dependencies); every link is relative, so any base path works
scripts/verify.mjs    every language has every string, every link resolves, lang/dir are right, the demo is complete, no real person's name anywhere
scripts/deploy.sh     build + verify + publish to the gh-pages branch (no CI needed)
scripts/render-assets.mjs   dev tool: apple-touch-icon.png and og.png
scripts/axe-audit.mjs       dev tool: axe-core accessibility audit of the built pages
scripts/check-page.mjs      dev tool: the "Try" section and the export samples in a browser (no sideways scroll from a phone up, the keyboard gets out of the frame, ...)
scripts/serve.mjs           a small static server for _site, for the two tools above (the demo needs http, not file://)
```

## What comes from the extension's repository

The build takes three things from the extension's repository and keeps no copy of them. `EXT_DIR` names it (default: `../google-scholar-highlighter`,
next to this one); the build stops with a message when something is missing, and that repository must be at a commit that has it.

- **The hero picture**: `store/chrome/images/screenshot-1.jpg` (made there by `npm run store:images`), shown from just above its browser window
  (`HERO_CUT` in `build.mjs`; the picture's own headline is English).
- **The demo** ("Try the real settings page"): `scripts/build-demo.mjs --out _site/demo` there builds the extension's real settings page into a folder that
  runs in an ordinary web page. Every language's page holds it in an iframe (`../demo/?lang=<code>`, the page's own language) with a link to open it on its
  own; what a visitor changes stays in their browser. How it works: `docs/ARCHITECTURE.md` there, "The web demo".
- **The text of the export samples**: `src/lib/formats.js` (and the English strings) of the extension, run on the invented papers of the settings page's
  preview, so the samples are what a copy button really writes.

No real person is named anywhere: the people in the pictures and samples are invented (A Author, B Writer, a made-up profile). `verify.mjs` checks a small
denylist (the researchers the old demo used) over everything the build writes, the demo's scripts included; pictures are looked at by eye.

## Use

```bash
npm run verify     # build and check
npm run dev        # build and serve at http://localhost:8080
npm run check      # the Try section and the export samples in a browser (after a build; needs Playwright, found through EXT_DIR)
npm run deploy     # build, check, push gh-pages
EXT_DIR=/path/to/google-scholar-highlighter npm run verify     # when the extension's repository is elsewhere
```

The demo has to be served over http (`npm run dev` does); opened from `file://` it cannot read its strings.

Turn GitHub Pages on once: repository **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `/ (root)`**.
The address is then `https://<user>.github.io/better-scholar/`; set `SITE_URL` (and `REPO_URL`) when building for another address.

## Changing words

Edit `src/i18n/en.json`, then every other file needs the same key (`npm run verify` says which are missing).
To add a language: a line in `src/languages.json` (and in `ORDER` in `build.mjs` if it should sit higher in the menu) and a `src/i18n/<code>.json`.
The demo's own words are the extension's: its `src/_locales/<language>/messages.json`, with the same folder names (`zh-CN` here is `zh_CN` there).
