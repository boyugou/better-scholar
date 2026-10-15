# Security policy

Better Scholar is a Chrome extension that works on Google Scholar profile pages in your browser. What it stores
and what it sends is described in [`PRIVACY.md`](PRIVACY.md); this page says what it exposes to web pages and
what to report.

## What web pages can reach

- **The page events.** On a profile page the extension answers `better-scholar:request` events with
  `better-scholar:response` events (`src/content/bridge.js`) and marks `<html>` with `data-rr-ready`. There is
  **no origin check**: any script running in the page can use them — the page's own scripts, other extensions'
  content scripts, the DevTools console — and can tell that the extension is installed. That is by design, for
  browsing agents.
- **What a call can do.** Each request is checked against the table of calls (`src/lib/agent.js`: `METHODS`,
  `validate`) before anything runs; an unknown method or parameter, a value of the wrong type, an integer out of
  range or a string over 500 characters is refused with an error. The calls — `ping`, `summary`, `papers`,
  `export`, `filter`, `clearFilters` — return what the panel and its copy buttons produce for that profile (the
  papers' records include the author lists that *Read full lists* saved), and set the filters of that page. They
  cannot change settings or storage, they make no network request, and they do not return the stored settings
  record, the Semantic Scholar API key or the name spellings.
- **Nothing else.** The manifest declares no `web_accessible_resources` and no `externally_connectable`, so web
  pages cannot load the extension's files or message it. The extension's own message channel (`rr:call`, used by
  the toolbar popup) and the service worker listen only to the extension's own pages and scripts.

## In scope

Please report privately anything that lets a web page, another extension, a crafted Scholar profile or a crafted
answer from Scholar or Semantic Scholar:

- run script or add markup through a paper's title, author line or venue text, a paper page, a Semantic Scholar
  answer, a settings file or a page-event call (the panel, the popup and the settings page build their elements
  with `createElement` and text nodes, never `innerHTML`);
- read or change the settings, the Semantic Scholar API key, the name spellings or the saved paper details;
- make the extension send a request to any address other than the Scholar site of the open page and
  `api.semanticscholar.org`, send the API key anywhere else, or send Semantic Scholar more than a paper's title;
- make the extension request Scholar pages without a click on *Read full lists*, press *Show more* when
  *Load all papers automatically* is off and *Load all* was not clicked, or go on after a CAPTCHA page or an HTTP
  429 or 503 answer;
- make *Open Scholar in* leave Scholar, change anything in the address but `hl=`, or reload a page in a loop;
- make a page-event call do more than its description in `src/lib/agent.js` says;
- make an export run as code where it is opened: a CSV or tab-separated cell read as a spreadsheet formula, a
  BibTeX entry that runs a TeX command, a Markdown list that a title turns into a link or markup
  (`src/lib/formats.js` is meant to prevent each).

## Out of scope

- That scripts on a Scholar page can call the page events and read their answers: that is the design described
  above. The answers hold what the profile page shows, the roles and ranks the extension worked out, and author
  lists read from the papers' own Scholar pages.
- The behaviour of Google Scholar or Semantic Scholar themselves.
- A wrong rank, award or role: that is an ordinary bug — please use the issue templates.

## Reporting a vulnerability

Please report security issues privately, not in public issues or discussions.

1. Open a private security advisory on GitHub:
   **[github.com/boyugou/better-scholar/security/advisories/new](https://github.com/boyugou/better-scholar/security/advisories/new)**
   (the **Report a vulnerability** button under the repository's **Security** tab).
2. Include the extension's version (shown at the foot of the settings page), the browser and its version, the
   steps to reproduce (a minimal profile page or venue string helps) and what an attacker gains.
3. Please allow time for a fix before disclosing details publicly.

## Supported versions

Fixes go into the latest version on the `main` branch. Older versions are not maintained.
