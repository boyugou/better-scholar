# Privacy

Scholar Roles & Ranks works entirely in your browser.

- **What it reads:** the paper list of a Google Scholar *profile* page you have open (titles, author lines,
  venue lines, years, citation counts). It runs only on `scholar.google.*/citations*` pages.
- **What it stores:** your display settings and the extra name spellings you add per profile, in
  `chrome.storage.sync` (so they follow your Chrome account), and — in `chrome.storage.local` — whether the
  panel is folded and a cache of the paper pages you asked it to read (kept at most 90 days). The settings page
  can clear that cache. Nothing else.
- **What it sends:** nothing by default. There is no analytics, no tracking, no account, no remote code and no
  third-party request (the one optional exception is the Semantic Scholar lookup below). The extension's own network activity is **Complete**, which — only when you click it —
  opens each paper's own page on `scholar.google.*` (same origin, about once a second) to read the full author
  list. It stops at the first CAPTCHA or HTTP 429/503.
- **Semantic Scholar (off by default):** if you switch on *Semantic Scholar → Complete author lists with Semantic
  Scholar*, then when you click **Complete** the extension first asks `api.semanticscholar.org` for each paper's
  author list (about once a second): the request carries the paper's title and nothing else — no cookies, no
  referrer, no identifier of you or of the profile. Papers it does not know go to Scholar's own page as above.
- **Loading the whole paper list:** Scholar shows 100 papers and loads the rest when its own *Show more* button
  is pressed. By default the extension presses that button for you (about once a second, one press at a time, only
  while the tab is the one you are looking at), so the summary covers every paper. The request is made by Scholar's own page script, to Scholar, exactly as if
  you had clicked; the extension adds no request and no permission. It stops at once if Scholar stops sending
  papers. The setting *Paper list → Load all papers automatically* turns it off (the panel then offers *Load all*).
- **Links:** the *Report* links in the panel are ordinary links to this project's GitHub issue tracker; they
  open only when you click them and carry only the venue text you can see in the panel.
- **Permissions:** `storage` only. No host permissions beyond the content-script matches, no `tabs`/`activeTab`.
  The only background code is a small service worker that opens the settings page when the panel's
  settings button asks, and hands a page the interface strings of the language you chose (read from the
  extension's own files); it has no network or storage access.
- **Rank data** (CCF, CORE) and the award list are bundled in the extension and never fetched.

Questions or concerns: open an issue at https://github.com/boyugou/scholar-roles-and-ranks/issues.
