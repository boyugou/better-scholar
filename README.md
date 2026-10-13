# Scholar Roles & Ranks: the website

Source of the project site (30 languages). It lives on its own branch, `site`; the built pages live on `gh-pages`.
The extension itself is on `main`.

```
src/languages.json    the languages (code, own name, direction)
src/i18n/<code>.json  all the words of the page, one file per language (en.json is the source)
src/assets/           styles, script, icons, screenshots
build.mjs             builds _site/ (no dependencies); every link is relative, so any base path works
scripts/verify.mjs    every language has every string, every link resolves, lang/dir are right
scripts/deploy.sh     build + verify + publish to the gh-pages branch (no CI needed)
scripts/render-assets.mjs   dev tool: apple-touch-icon.png and og.png
scripts/axe-audit.mjs       dev tool: axe-core accessibility audit of the built pages
```

## Use

```bash
npm run verify     # build and check
npm run dev        # build and serve at http://localhost:8080
npm run deploy     # build, check, push gh-pages
```

Turn GitHub Pages on once: repository **Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `/ (root)`**.
The address is then `https://<user>.github.io/scholar-roles-and-ranks/`; set `SITE_URL` (and `REPO_URL`) when building for another address.

## Changing words

Edit `src/i18n/en.json`, then every other file needs the same key (`npm run verify` says which are missing).
To add a language: a line in `src/languages.json` (and in `ORDER` in `build.mjs` if it should sit higher in the menu) and a `src/i18n/<code>.json`.
