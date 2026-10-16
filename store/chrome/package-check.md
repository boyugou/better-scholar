# Package check

Part A is the procedure: anyone can repeat it, and it should be repeated for every upload. Part B is the record of the check made
on 2026-10-15 at commit `f1cd4f1` (version 2.41.0), for `better-scholar-chrome-2.41.0.zip`. When `src/` changes, build again,
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

Built in a worktree at commit `f1cd4f1`, version 2.41.0, on 2026-10-15. The store-kit commit that follows changes only `store/`,
so the package is the same.

| | |
|---|---|
| File | `dist/better-scholar-chrome-2.41.0.zip` |
| Size | 721,532 bytes (704,072 bytes of compressed data) |
| SHA-256 of the file | `24d887b524a86976de5b70184e8906ac94cd81308ca7b057f951da648e090658` (the same on a second build in the same worktree) |
| Digest of the contents | `ce14c8d444c78f23f5926ea57ff9d84147d229c128e415991cc8da48b3dabf8d` |
| Entries | 108: 71 files and 37 folders |
| Uncompressed | 2,682,487 bytes (the compressed data is 26.2% of it: 73.8% saved) |
| `unzip -t` | no errors |
| `diff -rq` against `src/` | no output: the zip is exactly `src/` |

By folder:

| Folder | Files | Uncompressed bytes |
|---|---|---|
| `data/` | 4 | 1,210,779 (`awards.js` 968,755, 36% of the package; `ccf.js` 128,493; `core.js` 82,726; `aliases.js` 30,805) |
| `_locales/` | 30 | 937,577 |
| `lib/` | 13 | 195,060 |
| `content/` | 11 | 172,069 |
| `options/` | 4 | 118,871 |
| `popup/` | 3 | 19,478 |
| `manifest.json` and `background.js` | 2 | 19,561 |
| `icons/` | 4 | 9,092 |
| Total | 71 | 2,682,487 |

The files, with their sizes in bytes (the 30 files `_locales/<code>/messages.json` are 26,986 (`zh_CN`) to 43,463 (`hi`) bytes each;
`en` is 27,484):

```text
    943  background.js
  18618  manifest.json
   1940  content/bridge.js
   3006  content/chips.js
   4739  content/detail.js
   8119  content/dom.js
   2322  content/lang-redirect.js
  40151  content/main.js
  55179  content/panel.js
   7722  content/scholar.js
   2959  content/semantic.js
   4264  content/store.js
  41668  content/styles.css
  30805  data/aliases.js
 968755  data/awards.js
 128493  data/ccf.js
  82726  data/core.js
   5696  icons/icon-128.png
    496  icons/icon-16.png
    755  icons/icon-32.png
   2145  icons/icon-48.png
  15377  lib/agent.js
   4769  lib/analysis.js
   3476  lib/awards.js
   2612  lib/duplicates.js
  17273  lib/formats.js
   4035  lib/i18n.js
  12299  lib/marks.js
   8456  lib/metrics.js
  18485  lib/names.js
   3877  lib/palette.js
  36834  lib/prefs.js
   5516  lib/query.js
  62051  lib/venues.js
  12349  options/editor.js
  38743  options/options.css
   2219  options/options.html
  65560  options/options.js
   9994  popup/popup.css
    741  popup/popup.html
   8743  popup/popup.js
  (and the 30 _locales/<code>/messages.json)
```

### Anything that should not ship?

Nothing found.

- No tests, scripts, docs, fixtures, Markdown, shell or `.mjs` files, no dotfiles (`.DS_Store` included), no source maps. `src/`
  holds none either.
- No unused file: every file is loaded by something. The 26 scripts and the stylesheet of the main content script and the 2
  scripts of the second one are listed in `manifest.json`; `popup/popup.html` and `options/options.html` load the rest of
  `lib/`, `content/` and `data/` that they use (and `options/editor.js`); the four icons are named in the manifest;
  `background.js` is the service worker; `test/extension.test.js` checks that every script on disk is loaded somewhere.
- The large file is `data/awards.js` (968,755 bytes, 36% of the package): the bundled award list behind the award chips. It is
  used. `data/ccf.js` contains 679 dblp and publisher URLs from the CCF list; they are data, never requested.
- Code is not minified or obfuscated (the policy allows minification but not obfuscation; readable code helps the review).

Not a store issue, for the record: the whole main content script, data included, and its stylesheet are injected on every
`/citations*` page, including author search and paper pages, where `content/main.js` returns at once (`isProfile()`).

### Manifest against the store's requirements

The limits were read again on 2026-10-15 in developer.chrome.com's manifest reference ("name", "short_name", "description") and
in "Prepare your extension" and "Publish in the Chrome Web Store".

| Item | Value in the package | Requirement | Result |
|---|---|---|---|
| Zip layout | `manifest.json` at the root | "Make sure you place the manifest file in the root directory, not in a folder." | OK |
| Size | 721,532 bytes | "The maximum supported file size for an extension package is 2GB." | OK |
| `manifest_version` | 3 | MV3 | OK |
| `name` | `__MSG_extName__` → en "Better Scholar" (14 characters; the same in all 30 locales) | "maximum of 75 characters" | OK |
| `short_name` | `__MSG_extShortName__` → "Better Scholar" (14) | "maximum of 12 characters recommended" | Over the recommendation; not enforced |
| `description` | `__MSG_extDescription__` → en 124 characters | "no more than 132 characters" | OK |
| Longest description of the 30 locales | `es`: 132 characters | 132 | OK, exactly at the limit |
| `version` | 2.41.0 | higher than any version uploaded before | OK for a first upload |
| `default_locale` | `en`, and `_locales/en/messages.json` exists | needed when `_locales` exists | OK |
| `minimum_chrome_version` | 111 | none (111 is for CSS `color-mix`: `CHANGELOG.md` 2.11.0, "Chrome 111 or newer, for `color-mix`") | OK |
| `icons` | 16, 32, 48, 128; measured 16×16, 32×32, 48×48, 128×128 PNG with alpha | 128×128 required; 48×48 for the extensions page; 16×16 favicon | OK |
| `action` | `popup/popup.html`; `default_icon` 16, 32 | none | OK |
| `options_ui` | `options/options.html`, `open_in_tab: true` | none | OK |
| `permissions` | `["storage"]` | only what is used | OK (used by `content/store.js`, `content/dom.js`, `content/lang-redirect.js`, the settings page) |
| `host_permissions`, `optional_permissions`, `web_accessible_resources`, `externally_connectable`, `content_security_policy` | absent | | OK (default MV3 CSP) |
| `background` | `{ "service_worker": "background.js" }` | | OK |
| Content script 1 | 187 patterns `https://scholar.google.<domain>/citations*`; 26 JS files and `content/styles.css`; `document_idle` | | OK |
| Content script 2 | 187 patterns `https://scholar.google.<domain>/*`; `lib/i18n.js` and `content/lang-redirect.js`; `document_start` | | OK; needs the justification in `listing.md` |
| Match patterns overall | 374, all `https://scholar.google.…`; no `http:`, no `<all_urls>`, no wildcard host (counted in `src/manifest.json`) | | OK |

The 187 domains are the 187 entries of https://www.google.com/supported_domains (fetched 2026-10-15; the same set).

Description lengths of all 30 locales (characters, longest first): es 132, ro 130, el 128, it 127, pt_PT 127, fr 126, tr 126,
id 125, pt_BR 125, uk 125, cs 124, en 124, pl 124, vi 122, hu 120, ru 120, da 119, no 119, hi 118, de 117, sv 114, fi 113,
nl 112, th 109, ar 102, he 96, ko 78, ja 70, zh_CN 45, zh_TW 45. All within 132; `test/i18n.test.js` checks this (and the
75 of the name) on every run.
