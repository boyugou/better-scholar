// What an AI agent needs: the settings reference (to set the extension up for a user), the page-event API (to read the profile's numbers and drive the
// filters) and the search-box syntax, as one Markdown guide. The guide is written from the tables the code runs on — SETTINGS and PRESETS (lib/prefs.js),
// METHODS below (the one list of calls the page events and the toolbar popup both make), OPERATORS (lib/query.js) — so it cannot drift from them. Pure, no DOM.
(function (root, factory) {
  const dep = (name) => (typeof require === "function" && typeof module === "object" ? require("./" + name + ".js") : root.RolesRanks[name]);
  const api = factory(dep("prefs"), dep("i18n"), dep("query"));
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).agent = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (prefs, i18n, query) {
  "use strict";

  // ---- the calls ------------------------------------------------------------------------------------------------------------------------
  // Each call has a name, parameters (all optional unless `required`) and a result. The content script implements them once (content/main.js) and offers them
  // on two transports: page events (below) and the extension's own messages (the toolbar popup). A parameter is { type, doc, … }:
  //   "boolean" | "string" | "integer" (min, max, nullable: null clears it) | "choice" (values)
  const FORMATS = prefs.COPY_BUTTONS;
  const METHODS = {
    ping: {
      doc: "Is the extension here, and what is it looking at?",
      params: {},
      result: "{ version, owner, loaded, complete } — the extension's version, the profile's name, how many papers are loaded, and whether that is the whole list."
    },
    summary: {
      doc: "The numbers the panel shows: the role × rank tables, the awards and talks counts, the citation metrics.",
      params: {},
      result: "{ owner, loaded, shown, loadingAll, layoutBroken, edition, noRanks, summaries: { ccf, core, none }, marks, metrics: { highlighted, all } } — `summaries.<list>` is { columns, rows: [{ role, A, B, …, total }], totals, hidden, absent, papers }; `marks` counts the papers by award or talk group (the groups the panel counts); `metrics.<which>` is { papers, citations, h, i10 }."
    },
    papers: {
      doc: "The papers, one record each: who you are in the author list, the venue's ranks, award and talk marks.",
      params: { filtered: { type: "boolean", doc: "true (the default): only the papers the page shows now, after the filters; false: every loaded paper." } },
      result: "{ owner, total, papers: [{ id, title, authors, venue, year, citations, role, status, highlighted, rank: { ccf: { tier, name } | null, core: { rank, name } | null }, marks: [string], url }] } — `role` is first | cofirst | second | last | middle | null."
    },
    export: {
      doc: "The papers or the summary as text, in the format of a copy button.",
      params: {
        format: { type: "choice", values: FORMATS, required: true, doc: "summary: the summary as text · table: the summary table, tab-separated · papers: the papers, tab-separated · apa · bibtex · markdown · json (the `papers` records) · csv (RFC 4180)." },
        source: { type: "choice", values: ["ccf", "core", "none"], doc: "Which ranking summary and table use (default: the one the panel shows; none: by role only). The other formats ignore it." },
        html: { type: "boolean", doc: "true: for table, papers and apa also return `html`, the same content for a word processor (a real table, real italics): what the copy buttons put on the clipboard next to the text." }
      },
      result: "{ format, text, html? } — `html` only when asked for, and only for table, papers and apa."
    },
    filter: {
      doc: "Narrow the list the page shows (the filters of the panel). Only the filters named are changed; null clears a number.",
      params: {
        query: { type: "string", doc: "The search box's text (syntax below); \"\" clears it." },
        onlyHighlighted: { type: "boolean", doc: "Only the papers where you hold a highlighted position." },
        yearStart: { type: "integer", min: 1000, max: 3000, nullable: true, doc: "Papers from this year on." },
        yearEnd: { type: "integer", min: 1000, max: 3000, nullable: true, doc: "Papers up to this year." },
        minCitations: { type: "integer", min: 0, max: 100000000, nullable: true, doc: "Papers cited at least this often." },
        impact: { type: "choice", values: ["h", "i10"], nullable: true, doc: "The highlighted papers behind the h-index (at least h citations, h counted over the highlighted papers the other filters let through) or the i10-index (at least 10 citations)." }
      },
      result: "{ shown, total, filters: { query, onlyHighlighted, yearStart, yearEnd, minCitations, impact }, errors } — `errors` names the terms of the query that could not be read (an operator with a value it does not take matches nothing)."
    },
    clearFilters: {
      doc: "Remove every filter: the search, a table cell, an awards row, a venue, the year range.",
      params: {},
      result: "{ shown, total, filters, errors } — as `filter` returns it, after the filters are cleared."
    }
  };

  const plain = (o) => o !== null && typeof o === "object" && !Array.isArray(o);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  // The parameters of a call, checked: { ok: true, params } with the values as given, or { ok: false, error } naming the first thing wrong.
  function validate(method, params) {
    if (!own(METHODS, method)) return { ok: false, error: `unknown method "${String(method).slice(0, 40)}": one of ${Object.keys(METHODS).join(", ")}` };
    const spec = METHODS[method].params;
    if (params === undefined || params === null) params = {};
    if (!plain(params)) return { ok: false, error: "params must be an object" };
    const out = {};
    for (const key of Object.keys(params)) if (!own(spec, key)) return { ok: false, error: `unknown parameter "${key.slice(0, 40)}" of ${method}: ${Object.keys(spec).join(", ") || "it takes none"}` };
    for (const [key, p] of Object.entries(spec)) {
      if (!own(params, key) || params[key] === undefined) { if (p.required) return { ok: false, error: `${method} needs "${key}"` }; continue; }
      const v = params[key];
      if (v === null && p.nullable) { out[key] = null; continue; }
      if (p.type === "boolean" && typeof v !== "boolean") return { ok: false, error: `"${key}" must be true or false` };
      if (p.type === "string" && (typeof v !== "string" || v.length > 500)) return { ok: false, error: `"${key}" must be a string of at most 500 characters` };
      if (p.type === "choice" && !p.values.includes(v)) return { ok: false, error: `"${key}" must be one of: ${p.values.join(", ")}` };
      if (p.type === "integer" && !(Number.isInteger(v) && v >= p.min && v <= p.max)) return { ok: false, error: `"${key}" must be an integer from ${p.min} to ${p.max}${p.nullable ? ", or null" : ""}` };
      out[key] = v;
    }
    return { ok: true, params: out };
  }

  // The page-event transport: one event for a request, one for the answer. The extension's own pages use the same calls through runtime messages.
  const EVENTS = { request: "better-scholar:request", response: "better-scholar:response", marker: "data-rr-ready" };

  // ---- the guide ------------------------------------------------------------------------------------------------------------------------
  const code = (s) => "`" + s + "`";
  const cell = (s) => String(s).replace(/\|/g, "\\|");
  const valueOf = (s) => (s.kind === "bool" ? "true / false" : s.kind === "color" ? "\"#rrggbb\" or \"\"" : s.kind === "choice" ? s.values.map((v) => `"${v}"`).join(" / ") : s.kind === "order" ? "list of ids" : s.kind === "text" ? `text, at most ${s.max} characters` : `"${s.none}" or a language code`);
  const json = (v) => JSON.stringify(v);

  // `current`: the user's settings as the record (the settings page's copy passes them); omitted, the guide is the reference alone (AGENTS.md). `version`: the extension's version.
  function guide({ current, version } = {}) {
    const now = prefs.normalize(current);
    const settings = prefs.SETTINGS.map((s) => `| ${code(s.path)} | ${valueOf(s)} | ${code(json(s.def))} | ${cell(s.doc)} |`);
    const presets = Object.entries(prefs.PRESETS).map(([name, patch]) => `- ${code(name)}: ${code(json(patch))}`);
    const looks = prefs.CHIP_THEMES.map((th) => `- ${code(th.id)}: ${code(json(th.patch))}`);
    const calls = Object.entries(METHODS).map(([name, m]) => {
      const params = Object.entries(m.params).map(([k, p]) => `  - ${code(k)}${p.required ? " (required)" : ""}: ${p.doc}${p.type === "choice" ? "" : ""}`);
      return [`### ${code(name)}`, m.doc, params.length ? "Parameters:" : "Parameters: none.", ...params, `Result: ${m.result}`].join("\n");
    });
    return [
      `# Better Scholar${version ? " " + version : ""} — guide for AI agents`,
      "",
      "Better Scholar is a Chrome extension for Google Scholar profile pages (scholar.google.*/citations). It colours the rows where the profile's owner is first, co-first, second or last author, adds venue rank chips (CCF 2026 and CORE/ICORE 2026 lists), award and talk chips (Oral, Spotlight, Highlight, best paper), and a panel with a role × rank table, filters, citation totals and copy / export buttons. Everything runs in the browser. What it asks of the network: Scholar's own pages (the \"Show more\" button when `autoLoad` is on, and a paper's page when the user presses the button that reads full author lists), and paper titles to Semantic Scholar when `semanticScholar` is on. Nothing else is sent.",
      "",
      "Two things you can do:",
      "1. **Set it up for the user** — decide the settings from what they ask for (\"Settings\" below) and give them one JSON object to paste.",
      "2. **Read or drive it on an open profile page** — page events (\"Page events\" below); no setup needed.",
      "",
      "## Set it up for the user",
      "",
      "1. Read what the user wants. Use only the settings listed below; do not invent any.",
      "2. Reply with **one JSON object** that holds only the settings to change, in the shape of the record under \"Current settings\" (nested objects, as in the examples; no dotted paths). Leave out what stays as it is.",
      "3. The user pastes it into *Settings → Configuration → Config editor* and presses **Apply** (or saves it as a `.json` file and uses *Import file*). The page then says what it applied and what it ignored. If something was ignored, ask the user to send you that message and correct the object.",
      "",
      "Example — years chart off, BibTeX and summary buttons first, last-author rows only, bar-style rows:",
      "```json",
      json({ panel: { years: { show: false }, copy: { order: ["bibtex", "summary"] } }, roles: { first: false, cofirst: false, second: false, last: true }, rows: { style: "bar" } }),
      "```",
      "",
      "Rules:",
      "- `semanticScholar` sends paper titles to a third party: turn it on only if the user asks for it. No preset touches it.",
      "- The table of settings is in the order of the screen, top to bottom. `panel.show: false` hides the whole panel; every other `panel.*` setting then has no effect. A part's `show` switch hides the part, the switches inside it hide single things; the `order` lists only move things and never hide (a part left out of a list follows the others in the default order).",
      "- The copy buttons, the table and the awards counts are also in the toolbar popup, under the same switches.",
      "- What you see is what you search and copy: a rank list (CCF, CORE) or a kind of mark (award, oral, spotlight, highlight) that nothing draws — no chip (`rows.*`), no table tab (`panel.table.ccf`, `panel.table.core`), no count row (`panel.marks.*`) — is also left out of the search and of the exports.",
      "- Colours are `\"#rrggbb\"` only; `\"\"` restores the built-in colour of a role.",
      "- A name (`labels.<message key>`) is a text of the screen in the user's own words — a title, a column, a button. It replaces the translated text in every language; `\"\"` brings the built-in text back. Names are for the eye: the search operators (`role:first`), the exports and the page calls keep the standard words.",
      "- A language is a code from the list below. Changing `language` reloads the settings page.",
      "- Not settings, so not in the JSON: the Semantic Scholar API key, the spellings of the user's name (kept per profile) and the cache of paper details; the user sets those on the settings page itself.",
      "",
      "## Settings",
      "",
      "| Path | Value | Default | What it does |",
      "|---|---|---|---|",
      ...settings,
      "",
      `Language codes: ${i18n.LANGUAGES.map((l) => `${l[0]} (${l[1]})`).join(", ")}.`,
      "",
      "### Presets",
      "Ready-made patches (the settings page has a button for each); a preset changes only the settings it names:",
      ...presets,
      "",
      "### Chip looks",
      "Ready-made looks for the chips (the settings page has a button for each); each names every chip setting, so it replaces the look that was there:",
      ...looks,
      "",
      ...(current === undefined ? [] : ["### Current settings of this user", "```json", JSON.stringify(now, null, 2), "```", ""]),
      "## Page events",
      "",
      `On a profile page the extension marks the document with ${code(`${EVENTS.marker}="true"`)} (on ${code("<html>")}) once it is running; a script on the page can then make calls. It reads what the page shows and sets the page's filters; it cannot read or change the settings.`,
      "",
      `Dispatch ${code(EVENTS.request)} on ${code("document")} with ${code("detail: { id, method, params }")}; the answer is a ${code(EVENTS.response)} event with ${code("detail: { id, ok: true, result }")} or ${code("{ id, ok: false, error }")}. ${code("id")} is a string or a number you choose; it comes back unchanged, so match answers to requests by it.`,
      "```js",
      "const id = crypto.randomUUID();",
      "const answer = new Promise((resolve) => {",
      "  const on = (e) => { if (e.detail.id === id) { document.removeEventListener(\"" + EVENTS.response + "\", on); resolve(e.detail); } };",
      "  document.addEventListener(\"" + EVENTS.response + "\", on);",
      "});",
      "document.dispatchEvent(new CustomEvent(\"" + EVENTS.request + "\", { detail: { id, method: \"export\", params: { format: \"bibtex\" } } }));",
      "const { result } = await answer;   // result.text is the BibTeX",
      "```",
      "",
      "Calls:",
      "",
      ...calls.flatMap((c) => [c, ""]),
      "## Search syntax",
      "",
      "The search box and `filter { query }` take words and operators separated by spaces; a paper must match all of them. A word matches the title, authors, venue, the venue's name in the lists, the year, the role and the marks (case does not matter).",
      "",
      ...query.OPERATORS.map((o) => `- ${code(o.example)} — ${o.doc}`)
    ].join("\n");
  }

  return { METHODS, EVENTS, FORMATS, validate, guide };
});
