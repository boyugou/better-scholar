# Package check

Part A is the procedure: anyone can repeat it, and it should be repeated for every upload. Part B is the record of the check made
on 2026-10-28 for `better-scholar-chrome-2.41.0.zip` built from `src/` as of commit `8a21ae41` (version 2.41.0; the first record,
of 2026-10-15 at `f1cd4f1`, is in the history of this file). When `src/` changes, build again,
repeat A and replace B; the numbers in B belong to one build and nothing else.

## A. Procedure

1. Work on the commit you will submit. `git status` is clean and `npm test` passes.
2. Build: `bash scripts/package-chrome.sh`.
   - It reads the version from `src/manifest.json`, runs `node scripts/build-data.mjs --check` (is the bundled rank and award
     data what `data/*.json` generates; local, no network), then zips the contents of `src/` with `manifest.json` at the root
     and every dotfile left out (`zip -r -q "$OUT" . -x '.*' '*/.*'`).
   - Output: `dist/better-scholar-chrome-<version>.zip`. `dist/` is git-ignored. It needs neither a clean tree nor the network.
3. Check the file. Commands for macOS; on Linux use `stat -c%s` for `stat -f%z` and `sha256sum` for `shasum -a 256`.
   Replace `Z` by the zip's name.

   | Check | Command | Expect |
   |---|---|---|
   | The name carries the version | `grep '"version"' src/manifest.json` | the number in the zip's name |
   | Size | `stat -f%z Z` | a few hundred KB; the store takes up to 2GB (limits table below) |
   | Not damaged | `unzip -t Z` | "No errors detected in compressed data" |
   | `manifest.json` at the top | `unzip -l Z \| grep ' manifest.json$'` | one line, no folder before the name |
   | The zip is `src/` and nothing else | `d=$(mktemp -d) && unzip -q Z -d "$d" && diff -rq "$d" src` | no output |
   | Files and folder entries | `unzip -Z1 Z \| grep -vc '/$'` and `unzip -Z1 Z \| grep -c '/$'` | the counts of part B (files; folders) |
   | No development files | `unzip -Z1 Z \| grep -E '(^\|/)\.\|\.(md\|mjs\|sh\|map)$\|test\|fixture'` | no output |
   | SHA-256 of the file | `shasum -a 256 Z` | write it down; the same checkout gives the same hash again |
   | Digest of the contents | `(cd "$d" && find . -type f \| LC_ALL=C sort \| xargs shasum -a 256 \| shasum -a 256)` | the digest of part B when `src/` is the same: it does not depend on file times |
   | The manifest against the store's limits | the table in part B | every row OK |

   The two rows that use `$d` (the unzipped folder) belong together: run them in one shell. `diff -rq` prints nothing when the
   zip holds exactly the files of `src/`.

4. Smoke test: unzip into a folder, load it with chrome://extensions → Developer mode → Load unpacked, open the test profile of
   `listing.md` §5, and check the panel, the popup and the settings page.

The SHA-256 of the zip file identifies the file you upload. The zip stores each file's time, so a checkout made at another time
gives another file hash from the same commit; the digest of the contents is what two builds of the same `src/` have in common.

## B. Record: better-scholar-chrome-2.41.0.zip

Built on 2026-10-28 from `src/` as of commit `8a21ae41`, version 2.41.0. `src/` has changed since (your own quick filters, *Copy
ACM*, the search box's keys and messages, matcher rules — see CHANGELOG.md): before an upload, build again and replace this record
(part A), as the procedure says.

| | |
|---|---|
| File | `dist/better-scholar-chrome-2.41.0.zip` |
| Size | 833,755 bytes (816,135 bytes of compressed data) |
| SHA-256 of the file | `c4f2c4d526fbcafba9934786c868b5ff8482784d4845fc0e3355063094aa4567` |
| Digest of the contents | `5fdb590ad15e97082f06da62c69a84274bd95c70c9ef411e77738fc160764730` |
| Entries | 109: 72 files and 37 folders |
| Uncompressed | 3,094,686 bytes (the compressed data is 26.4% of it: 73.6% saved) |
| `unzip -t` | no errors |
| `diff -rq` against `src/` | no output: the zip is exactly `src/` |

By folder:

| Folder | Files | Uncompressed bytes |
|---|---|---|
| `data/` | 4 | 1,240,962 (`awards.js` 972,888, 31% of the package; `ccf.js` 128,493; `core.js` 82,726; `aliases.js` 56,855) |
| `_locales/` | 30 | 1,115,615 |
| `lib/` | 13 | 318,310 |
| `content/` | 12 | 222,395 |
| `options/` | 4 | 144,797 |
| `popup/` | 3 | 23,926 |
| `manifest.json` and `background.js` | 2 | 19,589 |
| `icons/` | 4 | 9,092 |
| Total | 72 | 3,094,686 |

The files, with their sizes in bytes (the 30 files `_locales/<code>/messages.json` are 31,979 (`en`) to 52,401 (`hi`) bytes each):

```text
    943  background.js
   2197  content/bridge.js
   3852  content/chips.js
   5487  content/detail.js
  10103  content/dom.js
   5117  content/image.js
   2322  content/lang-redirect.js
  58718  content/main.js
  68370  content/panel.js
   7987  content/scholar.js
   3047  content/semantic.js
   8050  content/store.js
  47145  content/styles.css
  56855  data/aliases.js
 972888  data/awards.js
 128493  data/ccf.js
  82726  data/core.js
   5696  icons/icon-128.png
    496  icons/icon-16.png
    755  icons/icon-32.png
   2145  icons/icon-48.png
  18787  lib/agent.js
   6813  lib/analysis.js
   4417  lib/awards.js
   2710  lib/duplicates.js
  45422  lib/formats.js
   4035  lib/i18n.js
  17321  lib/marks.js
  10610  lib/metrics.js
  23830  lib/names.js
   4946  lib/palette.js
  44407  lib/prefs.js
   9668  lib/query.js
 125344  lib/venues.js
  18646  manifest.json
  13840  options/editor.js
  45868  options/options.css
   2279  options/options.html
  82810  options/options.js
  11656  popup/popup.css
    771  popup/popup.html
  11499  popup/popup.js
  (and the 30 _locales/<code>/messages.json)
```

### Anything that should not ship?

Nothing found.

- No tests, scripts, docs, fixtures, Markdown, shell or `.mjs` files, no dotfiles (`.DS_Store` included), no source maps. `src/`
  holds none either.
- No unused file: every file is loaded by something. The 27 scripts and the stylesheet of the main content script and the 2
  scripts of the second one are listed in `manifest.json`; `popup/popup.html` and `options/options.html` load the rest of
  `lib/`, `content/` and `data/` that they use (and `options/editor.js`); the four icons are named in the manifest;
  `background.js` is the service worker; `test/extension.test.js` checks that every script on disk is loaded somewhere.
- The large file is `data/awards.js` (972,888 bytes, 31% of the package): the bundled award list behind the award chips. It is
  used. `data/ccf.js` contains 679 dblp and publisher URLs from the CCF list; they are data, never requested.
- Code is not minified or obfuscated (the policy allows minification but not obfuscation; readable code helps the review).

Not a store issue, for the record: the whole main content script, data included, and its stylesheet are injected on every
`/citations*` page, including author search and paper pages, where `content/main.js` returns at once (`isProfile()`).

### Manifest against the store's requirements

The limits were read on 2026-10-15 in developer.chrome.com's manifest reference ("name", "short_name", "description") and
in "Prepare your extension" and "Publish in the Chrome Web Store".

| Item | Value in the package | Requirement | Result |
|---|---|---|---|
| Zip layout | `manifest.json` at the root | "Make sure you place the manifest file in the root directory, not in a folder." | OK |
| Size | 833,755 bytes | "The maximum supported file size for an extension package is 2GB." | OK |
| `manifest_version` | 3 | MV3 | OK |
| `name` | `__MSG_extName__` → en "Better Scholar" (14 characters; the same in all 30 locales) | "maximum of 75 characters" | OK |
| `short_name` | `__MSG_extShortName__` → "Better Scholar" (14) | "maximum of 12 characters recommended" | Over the recommendation; not enforced |
| `description` | `__MSG_extDescription__` → en 130 characters | "no more than 132 characters" | OK |
| Longest description of the 30 locales | `da`, `el`, `es`, `nl`, `pt_BR`: 132 characters | 132 | OK, exactly at the limit |
| `version` | 2.41.0 | higher than any version uploaded before | OK for a first upload |
| `default_locale` | `en`, and `_locales/en/messages.json` exists | needed when `_locales` exists | OK |
| `minimum_chrome_version` | 111 | none (111 is for CSS `color-mix`: `CHANGELOG.md` 2.11.0, "Chrome 111 or newer, for `color-mix`") | OK |
| `icons` | 16, 32, 48, 128; measured 16×16, 32×32, 48×48, 128×128 PNG with alpha | 128×128 required; 48×48 for the extensions page; 16×16 favicon | OK |
| `action` | `popup/popup.html`; `default_icon` 16, 32 | none | OK |
| `options_ui` | `options/options.html`, `open_in_tab: true` | none | OK |
| `permissions` | `["storage"]` | only what is used | OK (used by `content/store.js`, `content/dom.js`, `content/lang-redirect.js`, the settings page) |
| `host_permissions`, `optional_permissions`, `web_accessible_resources`, `externally_connectable`, `content_security_policy` | absent | | OK (default MV3 CSP) |
| `background` | `{ "service_worker": "background.js" }` | | OK |
| Content script 1 | 187 patterns `https://scholar.google.<domain>/citations*`; 27 JS files and `content/styles.css`; `document_idle` | | OK |
| Content script 2 | 187 patterns `https://scholar.google.<domain>/*`; `lib/i18n.js` and `content/lang-redirect.js`; `document_start` | | OK; needs the justification in `listing.md` |
| Match patterns overall | 374, all `https://scholar.google.…`; no `http:`, no `<all_urls>`, no wildcard host (counted in `src/manifest.json`) | | OK |

The 187 domains are the 187 entries of https://www.google.com/supported_domains (fetched 2026-10-15; the same set).

Description lengths of all 30 locales (characters, longest first, counted 2026-10-28): da 132, el 132, es 132, nl 132,
pt_BR 132, tr 131, en 130, fi 130, fr 130, it 130, no 130, sv 130, de 129, pt_PT 129, ro 129, id 128, uk 128, hi 126, pl 126,
cs 125, ru 125, hu 123, vi 123, th 121, he 100, ar 99, ja 76, ko 72, zh_CN 68, zh_TW 65. All within 132; `test/i18n.test.js` checks this (and the
75 of the name) on every run.
