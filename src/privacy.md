# Privacy

Better Scholar runs in your browser. This page says where it runs, what it reads, what it stores and where,
what it sends over the network and what it never sends, what it puts on your clipboard or saves as a file, and
what the page events expose. The file names in parentheses point at the code that does it, in the extension's `src/` folder.

## Where it runs

- **The main script** runs on Google Scholar profile pages: addresses `https://scholar.google.<domain>/citations…`
  on the Scholar domains listed in `manifest.json`. It does nothing unless the page shows a profile's name and
  paper list (`content/main.js`, `content/scholar.js`).
- **A second, small script** runs as each page of the same Scholar domains starts to load, and acts only on the
  paths `/scholar` (search results) and `/citations` (profiles, author search, paper pages). It reads one
  setting, *Open Scholar in*; if you chose a language there, it opens the page again with that language's `hl=`
  value. It reads the page's address and nothing of its content (`content/lang-redirect.js`).
- **The toolbar popup and the settings page** are the extension's own pages (`popup/`, `options/`).

## What it reads

On a profile page: the profile's name, and for each paper in the list its title, author line, venue line, year,
citation count and the link to the paper's own Scholar page (`content/scholar.js`). Apart from the page's layout
(where the side column is, whether Scholar's *Show more* button is enabled), it reads nothing else from the page,
and nothing from other sites except the answers described under *What it sends*.

## What it stores

In `chrome.storage.sync`, which Chrome copies to your other browsers when Chrome sync is on (`content/store.js`):

- `prefs` — your settings (the table `SETTINGS` in `lib/prefs.js`). Only the settings page writes them.
- `variants` — the extra spellings of the profile owner's name that you add in the panel, per profile, keyed by
  the `user=` id in the profile's address: at most 8 spellings per profile and 40 profiles.

In `chrome.storage.local`, on this device only (`content/store.js`):

- `ui` — whether the panel is folded, and which ranking (CCF or CORE) its table shows.
- `resolved` — what *Read full lists* found: for each paper, Scholar's id for the paper on that profile, the full
  author list, the venue, the time it was read, and whether it came from Semantic Scholar. Entries older than 90
  days are not used and are dropped when the cache is next saved; at most 3,000 papers are kept.
- `s2key` — the Semantic Scholar API key, only if you enter one in the settings. It is never synced.

In the Scholar site's own browser storage:

- `localStorage`, key `rr-load-lock` — a random id and a time, written while the extension presses Scholar's
  *Show more* button for you, so that only one tab presses at a time; removed when the run ends, and ignored once
  it is five seconds old (`content/scholar.js`).
- `sessionStorage`, key `rr-hl` — a language code and a time, written when *Open Scholar in* reopens a page, so
  that a page is never reopened in a loop; removed once the page is in that language (`content/lang-redirect.js`).

On the settings page, the *Saved data* card shows the saved paper details (*View saved details*), deletes them
(*Clear saved paper details*) and puts every setting back to its default (*Reset to defaults*). A name spelling is
removed with the × next to it in the panel.

The extension stores nothing else, and creates no account and no identifier of you.

## What it sends

Requests to Google Scholar, the site of the page you have open:

- **Loading the whole paper list** (*Paper list → Load all papers automatically*, on by default). Scholar shows
  the first papers of a profile and loads more each time its own *Show more* button is pressed. The extension
  presses that button for you: one press at a time, about a second after the previous batch arrived, only while
  the tab is the one you are looking at, until the list is complete. The request is made by Scholar's own page
  script, as for a click of yours; the extension makes no request of its own for it. An automatic run stops at
  the first press that brings no papers within nine seconds. With the setting off, the panel offers *Load all*,
  which presses the button the same way after you click it and gives up after two presses that bring nothing
  (`content/scholar.js`, `content/main.js`).
- **Read full lists** (only after you click it in the panel). For each paper whose author list Scholar cut off
  before your name, and that is not already saved, the extension requests the paper's own Scholar page: the same
  Scholar site as the profile, with `hl=en`, sent with your Scholar cookies as any request to that site is. It
  waits one to 1.6 seconds after each request, and stops at the first CAPTCHA page or HTTP 429 or 503 answer.
  It reads the author list and the venue from each page (`content/detail.js`).
- **Open Scholar in** (only when you choose a language). It reopens a Scholar search or author page with the
  chosen `hl=` value: an ordinary page load at Scholar.

A request to Semantic Scholar, off by default:

- Only if you switch on *Semantic Scholar → Read author lists from Semantic Scholar first* and then click *Read
  full lists*, the extension first asks `https://api.semanticscholar.org/graph/v1/paper/search/match` about each
  of those papers. The request carries the paper's title as its search text and the list of fields wanted
  (title, authors, year); it is sent without cookies and without a referrer, with a pause of 1.1 seconds after
  each. If you entered an API key, it is sent in the request's `x-api-key` header, and to no other address. An
  answer is used only when its title, first author and year agree with the paper's. Papers it does not know go to
  Scholar's own page as above, and so do all the remaining ones once Semantic Scholar refuses a request or cannot
  be reached (`content/semantic.js`, `content/detail.js`).
- No preset switches this on.

Nothing else:

- No analytics, no telemetry, no advertising, no tracking and no account.
- No code is loaded from the network: every script runs from the extension package.
- The rank lists (CCF 2026, ICORE 2026) and the list of award-winning papers are part of the package and are never
  downloaded.
- The background service worker only opens the settings page when the panel asks, and reads the extension's own
  language files; it makes no network request and does not use storage (`background.js`).

Links, which open only when you click them:

- The *Report* links of the panel and the popup open a new issue on this project's GitHub tracker. The panel's fill
  in the text: the unranked venue strings it lists, or — when Scholar's page layout cannot be read — the page's
  address without the host, with the profile's `user=` id replaced by "…".
- The footer of the settings page links to the privacy page, the issue tracker and the GitHub repository. The
  toolbar popup links to Google Scholar when the open tab is not a profile.

## What is never sent

- The extension sends your settings, the name spellings and the saved paper details nowhere. (If you use Chrome
  sync, Chrome itself copies `chrome.storage.sync` — the settings and the name spellings — between your own
  browsers.) The Semantic Scholar key goes only to `api.semanticscholar.org`.
- Semantic Scholar never receives the profile's name or `user=` id, the author lists, years, venues or citation
  counts: only a paper's title and the list of fields wanted, plus what the browser adds to every request — your
  IP address, the browser's user-agent and the Scholar site the request comes from (the `Origin` header, such as
  `https://scholar.google.com`). It gets no cookies and no referrer, so not the address of the page.
- *Read full lists* requests go only to the Scholar site of the open profile; `content/detail.js` refuses any
  other address.
- Nothing is read from, or sent about, pages other than Google Scholar's: the extension's scripts run only there.
- The clipboard is never read.
- A *Report* link sends nothing until you click it. The GitHub page it opens carries only the text described
  under *Links*, in its address, and no issue is filed unless you submit it there.

## Clipboard

The extension writes to the clipboard only when you click a button that copies, and never reads it:

- the copy buttons of the panel and the toolbar popup: *Copy summary*, *Copy as table*, *Copy papers*, *Copy
  APA*, *Copy BibTeX*, *Copy Markdown*, *Copy JSON*; and *Copy list* under the unranked venues;
- on the settings page: *Copy guide for agents* (it contains your current settings), *Copy config (JSON)*, *Copy
  cache (JSON)* (the saved paper details) and *Copy details for a bug report* (the extension's version, your
  browser's user-agent string, the interface language and your settings).

## Files

Files are saved only when you click, and are made in the browser:

- *Export CSV* (panel or popup) saves the papers the page shows as `<profile name>-papers.csv`.
- *Export file* on the settings page saves `better-scholar-config.json`, your settings.
- *Import file* reads a JSON file you pick, in the browser, and changes only settings.

## Page events

On a profile page the extension sets the attribute `data-rr-ready` on the page's `<html>` element, and answers
`better-scholar:request` events with `better-scholar:response` events (`content/bridge.js`, `lib/agent.js`).
Any script running in that page can use them — the page's own scripts, other extensions' scripts, the DevTools
console — and can tell from the attribute that the extension is installed. There is no check of who asks.

- The calls are `ping`, `summary`, `papers`, `export`, `filter` and `clearFilters`. They return what the panel and
  its copy buttons produce for that profile: the counts, the papers' records (with the author lists that *Read full
  lists* saved for those papers), and the text of a copy format. `summary` also reports a few display settings:
  which rank lists and copy buttons are on, whether the table and the awards counts are shown, and how talks are
  counted. `filter` and `clearFilters` change the filters of that page only.
- They cannot change any setting or anything in storage, they make no network request, and they do not return the
  settings record, the Semantic Scholar key or the name spellings.

## Permissions

The extension asks for one permission, `storage`. It declares no host permissions (its scripts run only on the
Scholar pages listed in `manifest.json`), and no `tabs`, `activeTab`, `scripting`, `cookies` or `webRequest`
permission. The toolbar popup asks Chrome for the active tab's id and sends a message to the extension's own script
in that tab.

Questions or concerns: open an issue at https://github.com/boyugou/better-scholar/issues.
