# Package check: better-scholar-chrome-2.39.0.zip

Built and checked on 2026-10-15 in a clean worktree at commit `3a52a6e` (version 2.39.0).

## How it was built

```bash
bash scripts/package-chrome.sh
```

- It needed neither a clean tree nor the network. The script runs `node scripts/build-data.mjs --check` (compares the
  bundled rank data with `data/*.json`, locally), then zips the contents of `src/` with `manifest.json` at the root and
  every dotfile excluded (`zip -r -q "$OUT" . -x '.*' '*/.*'`). Output goes to `dist/`, which is git-ignored; `git status`
  stayed clean.
- Output: `dist/better-scholar-chrome-2.39.0.zip`, 656,033 bytes.
- SHA-256 of that file: `8f951dd4411fc0bcf3b44cfb74387ad34a5530238fd79945a47210285d3874c6`. A rebuild of the same
  commit gives a different hash (zip stores file times), but the same 69 files and 2,419,957 bytes uncompressed.
- `npm test` on the same commit: 429 tests, 429 pass.

## Contents (`unzip -l`)

106 entries: 69 files and 37 folders. 2,419,957 bytes uncompressed, 638,891 bytes compressed (73.6% saved).

```text
Archive:  dist/better-scholar-chrome-2.39.0.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  10-15-2026 10:27   options/
    48619  10-15-2026 10:27   options/options.js
     1876  10-15-2026 10:27   options/options.html
    31582  10-15-2026 10:27   options/options.css
        0  10-15-2026 10:27   popup/
     8113  10-15-2026 10:27   popup/popup.js
      653  10-15-2026 10:27   popup/popup.html
     9592  10-15-2026 10:27   popup/popup.css
      943  10-15-2026 10:27   background.js
        0  10-15-2026 10:27   content/
     7722  10-15-2026 10:27   content/scholar.js
    37537  10-15-2026 10:27   content/styles.css
     1940  10-15-2026 10:27   content/bridge.js
     2695  10-15-2026 10:27   content/chips.js
     4078  10-15-2026 10:27   content/store.js
     2959  10-15-2026 10:27   content/semantic.js
    48221  10-15-2026 10:27   content/panel.js
    38170  10-15-2026 10:27   content/main.js
     5970  10-15-2026 10:27   content/dom.js
     2322  10-15-2026 10:27   content/lang-redirect.js
     4739  10-15-2026 10:27   content/detail.js
        0  10-15-2026 10:27   icons/
      496  10-15-2026 10:27   icons/icon-16.png
     2145  10-15-2026 10:27   icons/icon-48.png
     5696  10-15-2026 10:27   icons/icon-128.png
      755  10-15-2026 10:27   icons/icon-32.png
    18592  10-15-2026 10:27   manifest.json
        0  10-15-2026 10:27   lib/
    62051  10-15-2026 10:27   lib/venues.js
     2612  10-15-2026 10:27   lib/duplicates.js
     8456  10-15-2026 10:27   lib/metrics.js
     5041  10-15-2026 10:27   lib/query.js
     4399  10-15-2026 10:27   lib/analysis.js
    12299  10-15-2026 10:27   lib/marks.js
    14324  10-15-2026 10:27   lib/prefs.js
    18485  10-15-2026 10:27   lib/names.js
     4035  10-15-2026 10:27   lib/i18n.js
     3476  10-15-2026 10:27   lib/awards.js
    14065  10-15-2026 10:27   lib/formats.js
    13354  10-15-2026 10:27   lib/agent.js
        0  10-15-2026 10:27   _locales/
        0  10-15-2026 10:27   _locales/pl/
    23385  10-15-2026 10:27   _locales/pl/messages.json
        0  10-15-2026 10:27   _locales/vi/
    24732  10-15-2026 10:27   _locales/vi/messages.json
        0  10-15-2026 10:27   _locales/sv/
    23932  10-15-2026 10:27   _locales/sv/messages.json
        0  10-15-2026 10:27   _locales/he/
    26533  10-15-2026 10:27   _locales/he/messages.json
        0  10-15-2026 10:27   _locales/da/
    23607  10-15-2026 10:27   _locales/da/messages.json
        0  10-15-2026 10:27   _locales/no/
    23653  10-15-2026 10:27   _locales/no/messages.json
        0  10-15-2026 10:27   _locales/pt_BR/
    24115  10-15-2026 10:27   _locales/pt_BR/messages.json
        0  10-15-2026 10:27   _locales/ja/
    25794  10-15-2026 10:27   _locales/ja/messages.json
        0  10-15-2026 10:27   _locales/el/
    31709  10-15-2026 10:27   _locales/el/messages.json
        0  10-15-2026 10:27   _locales/it/
    24424  10-15-2026 10:27   _locales/it/messages.json
        0  10-15-2026 10:27   _locales/zh_TW/
    23066  10-15-2026 10:27   _locales/zh_TW/messages.json
        0  10-15-2026 10:27   _locales/cs/
    23399  10-15-2026 10:27   _locales/cs/messages.json
        0  10-15-2026 10:27   _locales/pt_PT/
    24204  10-15-2026 10:27   _locales/pt_PT/messages.json
        0  10-15-2026 10:27   _locales/ru/
    29059  10-15-2026 10:27   _locales/ru/messages.json
        0  10-15-2026 10:27   _locales/ro/
    23748  10-15-2026 10:27   _locales/ro/messages.json
        0  10-15-2026 10:27   _locales/zh_CN/
    22237  10-15-2026 10:27   _locales/zh_CN/messages.json
        0  10-15-2026 10:27   _locales/uk/
    28944  10-15-2026 10:27   _locales/uk/messages.json
        0  10-15-2026 10:27   _locales/ar/
    26897  10-15-2026 10:27   _locales/ar/messages.json
        0  10-15-2026 10:27   _locales/hu/
    23804  10-15-2026 10:27   _locales/hu/messages.json
        0  10-15-2026 10:27   _locales/nl/
    23848  10-15-2026 10:27   _locales/nl/messages.json
        0  10-15-2026 10:27   _locales/hi/
    33915  10-15-2026 10:27   _locales/hi/messages.json
        0  10-15-2026 10:27   _locales/de/
    24352  10-15-2026 10:27   _locales/de/messages.json
        0  10-15-2026 10:27   _locales/ko/
    24611  10-15-2026 10:27   _locales/ko/messages.json
        0  10-15-2026 10:27   _locales/fi/
    24473  10-15-2026 10:27   _locales/fi/messages.json
        0  10-15-2026 10:27   _locales/id/
    23084  10-15-2026 10:27   _locales/id/messages.json
        0  10-15-2026 10:27   _locales/fr/
    24974  10-15-2026 10:27   _locales/fr/messages.json
        0  10-15-2026 10:27   _locales/es/
    24447  10-15-2026 10:27   _locales/es/messages.json
        0  10-15-2026 10:27   _locales/en/
    22813  10-15-2026 10:27   _locales/en/messages.json
        0  10-15-2026 10:27   _locales/th/
    33190  10-15-2026 10:27   _locales/th/messages.json
        0  10-15-2026 10:27   _locales/tr/
    24217  10-15-2026 10:27   _locales/tr/messages.json
        0  10-15-2026 10:27   data/
    82726  10-15-2026 10:27   data/core.js
   128493  10-15-2026 10:27   data/ccf.js
    30805  10-15-2026 10:27   data/aliases.js
   968755  10-15-2026 10:27   data/awards.js
---------                     -------
  2419957                     106 files
```

By folder:

| Folder | Files | Uncompressed bytes |
|---|---|---|
| `data/` | 4 | 1,210,779 (of which `awards.js` 968,755) |
| `_locales/` | 30 | 761,166 |
| `lib/` | 12 | 162,597 |
| `content/` | 11 | 156,353 |
| `options/` | 3 | 82,077 |
| `manifest.json` | 1 | 18,592 |
| `popup/` | 3 | 18,358 |
| `icons/` | 4 | 9,092 |
| `background.js` | 1 | 943 |
| Total | 69 | 2,419,957 |

## Anything that should not ship?

Nothing found.

- No tests, scripts, docs, fixtures, Markdown, shell or `.mjs` files, no dotfiles (`.DS_Store` included), no source
  maps. `src/` holds no dotfiles or `.map` files either.
- No unused file: every file is loaded by something. The 25 scripts and the stylesheet of the main content script and the
  2 scripts of the second one are listed in `manifest.json`; `popup/popup.html` and `options/options.html` load the rest
  of `lib/` and `content/` they use; all four icons are named in the manifest; `background.js` is the service worker.
- The large file is `data/awards.js` (968,755 bytes, 40% of the package): the bundled award list behind the award chips.
  It is used. `data/ccf.js` contains 679 dblp and publisher URLs from the CCF list; they are data, never requested.
- Code is not minified or obfuscated (the policy allows minification but not obfuscation; readable code helps the review).

Not a store issue, for the record: the whole main content script, data included, is injected on every `/citations*`
page, including author search and paper pages, where `main.js:7` returns at once.

## Manifest against the store's requirements

| Item | Value in the package | Requirement | Result |
|---|---|---|---|
| Zip layout | `manifest.json` at the root | "place the manifest file in the root directory, not in a folder" | OK |
| Size | 656,033 bytes | "Packages can be up to 2GB" | OK |
| `manifest_version` | 3 | MV3 | OK |
| `name` | `__MSG_extName__` → en "Better Scholar" (14 characters; the same in all 30 locales) | at most 75 characters | OK |
| `short_name` | `__MSG_extShortName__` → "Better Scholar" (14) | "maximum of 12 characters recommended" | Over the recommendation; not enforced |
| `description` | `__MSG_extDescription__` → en 124 characters | "no more than 132 characters" | OK |
| Longest description of the 30 locales | `es`: 132 characters | 132 | OK, exactly at the limit |
| `version` | 2.39.0 | higher than any version uploaded before | OK for a first upload |
| `default_locale` | `en`, and `_locales/en/messages.json` exists | needed when `_locales` exists | OK |
| `minimum_chrome_version` | 111 | none (111 is for CSS `color-mix`: `CHANGELOG.md` 2.11.0, "Chrome 111 or newer, for `color-mix`") | OK |
| `icons` | 16, 32, 48, 128; measured 16×16, 32×32, 48×48, 128×128 PNG with alpha | 128×128 required; 48×48 for the extensions page; 16×16 favicon | OK |
| `action.default_icon` | 16, 32 | none | OK |
| `permissions` | `["storage"]` | only what is used | OK (used by `content/store.js`, `content/dom.js:34`, `content/lang-redirect.js:9`, the settings page) |
| `host_permissions`, `optional_permissions`, `web_accessible_resources`, `externally_connectable`, `content_security_policy` | absent | | OK (default MV3 CSP) |
| `background` | `{ "service_worker": "background.js" }` | | OK |
| Content script 1 | 187 patterns `https://scholar.google.<domain>/citations*`, 25 JS + 1 CSS, `document_idle` | | OK |
| Content script 2 | 187 patterns `https://scholar.google.<domain>/*`, `lib/i18n.js` + `content/lang-redirect.js`, `document_start` | | OK; needs the justification in `listing.md` |
| Match patterns overall | 374, all `https://scholar.google.…`, no `http:`, no `<all_urls>`, no wildcard host | | OK |

Description lengths of all 30 locales (characters, longest first): es 132, ro 130, el 128, pt_PT 127, it 127, tr 126,
fr 126, uk 125, pt_BR 125, id 125, pl 124, en 124, cs 124, vi 122, ru 120, hu 120, no 119, da 119, hi 118, de 117,
sv 114, fi 113, nl 112, th 109, ar 102, he 96, ko 78, ja 70, zh_TW 45, zh_CN 45. All within 132; `test/i18n.test.js:40`
checks this on every run.
