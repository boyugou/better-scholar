# Privacy

Better Scholar runs in your browser. This page says what it reads, what it stores, what it sends and what it never sends.
The file names in parentheses point at the code that does each thing, in the extension's `src/` folder.

## In short

| Question | Answer |
|---|---|
| Account, analytics, tracking, advertising? | None. |
| Where does the work happen? | In your browser. The rank lists and the award list are inside the extension. |
| What goes over the network? | Requests to the Google Scholar site that you have open: Scholar's own *Show more* button, and the paper pages that *Read full lists* asks for after your click. A paper's title to Semantic Scholar, only if you turn that on (it is off by default). |
| What is stored? | Your settings, your name spellings and your venue mappings (Chrome's synced storage). The full author lists that *Read full lists* found, for 90 days (this device only). |
| What is never sent? | Your settings, your name spellings, your venue mappings, the saved paper details, and anything from your clipboard. |
| Which permissions? | One: `storage`. |

## Where it runs

- **The main script** runs on Google Scholar profile pages: addresses `https://scholar.google.<domain>/citations…` on the Scholar
  domains listed in `manifest.json`. It does nothing unless the page shows a profile's name and paper list (`content/main.js`,
  `content/scholar.js`).
- **A second, small script** runs when a page of the same Scholar domains starts to load. It acts only on the paths `/scholar`
  (search results) and `/citations` (profiles, author search, paper pages). It reads one setting, *Open Scholar in*. If you
  chose a language there, it opens the page again with that language's `hl=` value. It reads the page's address, and nothing of
  its content (`content/lang-redirect.js`).
- **The toolbar popup and the settings page** are the extension's own pages (`popup/`, `options/`).

## What it reads

On a profile page, it reads the profile's name. For each paper in the list it reads the title, the author line, the venue line,
the year, the citation count and the link to the paper's own Scholar page (`content/scholar.js`). It also reads the page's layout:
where the side column is, and whether Scholar's *Show more* button is enabled. It reads nothing else from the page. From other
sites it reads only the answers described under *What it sends*.

## What it stores

In `chrome.storage.sync`. When Chrome sync is on, Chrome copies this storage to your other browsers (`content/store.js`):

- `prefs`: your settings (the table `SETTINGS` in `lib/prefs.js`). Only the settings page writes them.
- `variants`: the extra spellings of the profile owner's name that you add in the panel. They are kept per profile, by the
  `user=` id in the profile's address: at most 8 spellings per profile, and at most 40 profiles.
- `mine`: your venue mappings, which you add on the settings page (*Check a venue* → *Assign it to a listed venue…*). Each is
  a venue line as Scholar printed it (at most 300 characters), the list (CCF or CORE), and the name and kind of the row you chose.
  As many as fit Chrome's 8 KB for one item (about fifty); when a new one does not fit, the oldest go, and the page says so.

In `chrome.storage.local`, on this device only (`content/store.js`):

- `ui`: whether the panel is folded, and which list (CCF or CORE) its table shows.
- `resolved`: what *Read full lists* found. For each paper: Scholar's id for the paper on that profile, the full author list,
  the venue, the page range when the page gives one, the time it was read, and whether it came from Semantic Scholar. An entry older than 90 days is not used, and is
  dropped when the cache is next saved. At most 3,000 papers and three million characters are kept (the newest first).
- `s2key`: the Semantic Scholar API key, only if you enter one in the settings. It is never synced.
- `askVenue`: a venue text that you asked the settings page to check, with *Check* beside a venue of the unranked list (at most
  300 characters, as Scholar printed it). The settings page takes it within a moment and removes it. A text that nobody takes is
  ignored after 30 seconds.

In the Scholar site's own browser storage:

- `localStorage`, key `rr-load-lock`: a random id and a time. It is written while the extension presses Scholar's *Show more*
  button for you, so that only one tab presses at a time. It is removed when the run ends, and ignored once it is twelve seconds
  old (`content/scholar.js`).
- `sessionStorage`, key `rr-hl`: a language code and a time. It is written when *Open Scholar in* reopens a page, so that a page
  is never reopened in a loop. It is removed once the page is in that language (`content/lang-redirect.js`).

To see or delete what is stored, use the *Saved data* card on the settings page: *View saved details*, *Clear saved paper
details*, and *Reset to defaults* (every setting back to its default). To remove a name spelling, click the × beside it in the
panel. To remove a venue mapping, use *Remove* in the list under *Check a venue*.

The extension stores nothing else. It creates no account and no identifier of you.

## What it sends

Requests to Google Scholar, the site of the page that you have open:

- **Loading the whole paper list** (*Paper list → Load all papers automatically*, on by default). Scholar shows the first papers
  of a profile, and loads more each time its own *Show more* button is pressed. The extension presses that button for you: one
  press at a time, about a second after the previous batch arrived, only while the tab is the one that you look at, until the
  list is complete. Scholar's own page script makes the request, as for a click of yours. The extension makes no request of its
  own for it. An automatic run stops at the first press that brings no papers within nine seconds. With the setting off, the
  panel shows *Load all*. It presses the button in the same way after you click it, and gives up after two presses that bring
  nothing (`content/scholar.js`, `content/main.js`).
- **Read full lists** (only after you click it in the panel). Scholar sometimes cuts an author list before your name. For each
  such paper that is not saved yet, the extension requests the paper's own Scholar page. The request goes to the same Scholar
  site as the profile, with `hl=en`, and carries your Scholar cookies, as any request to that site does. The extension waits one
  to 1.6 seconds after each request. It stops at the first CAPTCHA page, and at the first HTTP 429 or 503 answer. From each page
  it reads the author list, the venue and the page range (`content/detail.js`).
- **Open Scholar in** (only when you choose a language). It reopens a Scholar search or author page with the chosen `hl=` value:
  an ordinary page load at Scholar.

A request to Semantic Scholar, off by default:

- It happens only if you turn on *Semantic Scholar → Read author lists from Semantic Scholar first* and then click *Read full
  lists*. The extension then first asks `https://api.semanticscholar.org/graph/v1/paper/search/match` about each of those papers.
- The request carries the paper's title as its search text, and the list of fields wanted (title, authors, year). It is sent
  without cookies and without a referrer. The extension waits 1.1 seconds after each request.
- If you entered an API key, it goes in the request's `x-api-key` header, and to no other address.
- An answer is used only when its title, first author and year agree with the paper's. The papers that Semantic Scholar does not
  know go to Scholar's own page, as above. So do all the remaining papers once Semantic Scholar refuses a request or cannot be
  reached (`content/semantic.js`, `content/detail.js`).
- No preset turns this on.

Nothing else:

- No analytics, no telemetry, no advertising, no tracking and no account.
- No code is loaded from the network. Every script runs from the extension package.
- The rank lists (CCF 2026, ICORE 2026) and the list of award-winning papers are part of the package. They are never downloaded.
- The background service worker only opens the settings page when the panel asks, and reads the extension's own language files.
  It makes no network request and does not use storage (`background.js`).

Links, which open only when you click them:

- The *Report* links of the panel and the popup open a new issue on this project's GitHub tracker. The panel's links fill in the
  text: the unranked venue strings that it lists or, when Scholar's page layout cannot be read, the page's address without the
  host, with the profile's `user=` id replaced by "…".
- The footer of the settings page links to the privacy page, the issue tracker and the GitHub repository. The toolbar popup
  links to Google Scholar when the open tab is not a profile.
- For a CCF venue, *Check a venue* on the settings page shows a link to the venue's page on DBLP (`https://dblp.org/db/…`, the
  address that the CCF list itself gives). It is a plain link with `rel="noopener noreferrer"`. The extension sends nothing, and
  the page opens only when you click the link.

## What is never sent

- The extension sends your settings, the name spellings, the venue mappings and the saved paper details nowhere. (If you use
  Chrome sync, Chrome itself copies `chrome.storage.sync`, which holds the settings, the name spellings and the venue mappings,
  between your own browsers.) The Semantic
  Scholar key goes only to `api.semanticscholar.org`.
- Semantic Scholar never gets the profile's name or `user=` id, the author lists, years, venues or citation counts. It gets only
  a paper's title and the list of fields wanted, plus what the browser adds to every request: your IP address, the browser's
  user-agent, and the Scholar site that the request comes from (the `Origin` header, such as `https://scholar.google.com`). It
  gets no cookies and no referrer, so not the address of the page.
- *Read full lists* requests go only to the Scholar site of the open profile. `content/detail.js` refuses any other address.
- Nothing is read from, or sent about, pages other than Google Scholar's: the extension's scripts run only there.
- The clipboard is never read.
- A *Report* link sends nothing until you click it. The GitHub page that it opens carries only the text described under
  *Links*, in its address. No issue is filed unless you submit it there.

## Clipboard

The extension writes to the clipboard only when you click a button that copies. It never reads the clipboard.

- The copy buttons of the panel and the toolbar popup: *Copy summary*, *Copy as table*, *Copy papers*, *Copy APA*, *Copy BibTeX*,
  *Copy Markdown*, *Copy JSON*; and *Copy list* under the unranked venues.
- *Copy as table*, *Copy papers* and *Copy APA* put the same content on the clipboard twice, as text and as HTML (which a word
  processor reads as a real table or as italics). The HTML is made from the same data and contains nothing else.
- *Copy summary* and *Copy as table* end with a line that gives the profile's link (`…/citations?user=<id>`, nothing else of the
  address) and the date, unless you turn that off in the settings. They also say when the paper list is not fully loaded.
- On the settings page: *Copy guide for agents* (it contains your current settings), *Copy config (JSON)*, *Copy cache (JSON)*
  (the saved paper details) and *Copy details for a bug report* (the extension's version, your browser's user-agent string, the
  interface language and your settings).

## Files

Files are saved only when you click, and they are made in the browser:

- *Export CSV* (panel or popup) saves the papers that the page shows, as `<profile name>-papers.csv`.
- *Export file* on the settings page saves your settings, as `better-scholar-config.json`.
- *Import file* reads a JSON file that you choose, in the browser, and changes only settings.

## Page events

On a profile page the extension sets the attribute `data-rr-ready` on the page's `<html>` element. It answers
`better-scholar:request` events with `better-scholar:response` events (`content/bridge.js`, `lib/agent.js`). Any script that runs
in that page can use them: the page's own scripts, other extensions' scripts, the DevTools console. Such a script can also tell
from the attribute that the extension is installed. There is no check of who asks.

- The calls are `ping`, `summary`, `papers`, `export`, `filter` and `clearFilters`. They return what the panel and its copy
  buttons produce for that profile: the counts, the papers' records (with the author lists that *Read full lists* saved for
  those papers), and the text of a copy format. `summary` returns numbers only. `filter` and `clearFilters` change the filters
  of that page only.
- The calls cannot change any setting or anything in storage. They make no network request. They do not return the settings
  record, the Semantic Scholar key, the name spellings or the venue mappings (a rank from a mapping is marked `mine: true`).
- The panel's own buttons answer only to a person. A click or a key that a script makes (`click()`, `dispatchEvent`) does
  nothing. So a script cannot use them to press *Read full lists*, add a spelling or open the settings page.
- What the extension draws on the page is part of the page, and a script there can read it, as with any extension that changes a
  page: the panel and its texts (with the names you gave things), the chips, and the classes and style properties on `<html>`.
  The settings record itself, the Semantic Scholar key and the saved details are not on the page.

## The website's demo

The project's website has a page that runs the extension's settings page in an ordinary browser tab, so that you can try it
(`/demo/`, also shown inside the home page). It is not the extension: it reads no Scholar page, sends nothing and has no account.
It keeps your choices in this website's `localStorage` (keys that begin with `rr-demo:`), in your own browser, until you clear
the site's data. It does not keep the Semantic Scholar key field of that page at all. GitHub Pages serves the website, and sees
the requests for its files as any web host does.

## Permissions

The extension asks for one permission: `storage`. It declares no host permissions (its scripts run only on the Scholar pages
listed in `manifest.json`). It asks for no `tabs`, `activeTab`, `scripting`, `cookies` or `webRequest` permission. The toolbar
popup asks Chrome for the active tab's id, and sends a message to the extension's own script in that tab.

## Chrome Web Store user data policy

Better Scholar's use of the information it reads complies with the Chrome Web Store User Data Policy, including the Limited Use
requirements:

- It uses the paper details that it reads only to provide what you see in the page and the popup: the highlighted rows, the rank
  and award chips, the summaries, the filters, and the text of the copy and export buttons.
- It does not sell the information. It does not transfer it to anyone, except as described under *What it sends* (a paper's
  title to Semantic Scholar, only if you turn that on, and requests to Google Scholar itself). It does not use the information
  for advertising, or for credit or lending decisions.
- No person at the project can read the information: the project receives none of it.

Questions or concerns: open an issue at https://github.com/boyugou/better-scholar/issues.
