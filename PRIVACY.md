# Privacy

Scholar Author Roles & Venue Ranks works entirely in your browser.

- **What it reads:** the paper list of a Google Scholar *profile* page you have open (titles, author lines,
  venue lines, years, citation counts). It runs only on `scholar.google.*/citations*` pages.
- **What it stores:** your settings and the extra name spellings you add per profile, in
  `chrome.storage.sync` (so they follow your Chrome account), and a cache of the paper pages you asked it to
  read, in `chrome.storage.local` (kept at most 90 days). Nothing else.
- **What it sends:** nothing. There is no analytics, no tracking, no account, no remote code and no
  third-party request. The one network activity is **Resolve**, which — only when you click it — opens each
  paper's own page on `scholar.google.*` (same origin, about once a second) to read the full author list.
  It stops at the first CAPTCHA or HTTP 429/503.
- **Links:** the *Report* links in the panel are ordinary links to this project's GitHub issue tracker; they
  open only when you click them and carry only the venue text you can see in the panel.
- **Permissions:** `storage` only. No host permissions beyond the content-script matches, no background
  worker, no `tabs`/`activeTab`.
- **Rank data** (CCF, CORE) and the award list are bundled in the extension and never fetched.

Questions or concerns: open an issue at https://github.com/boyugou/scholar-author-roles-and-venue-ranks/issues.
