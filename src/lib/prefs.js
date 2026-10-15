// What the extension draws, and per-device view state. Pure, no chrome.*: the stored shapes, their
// defaults, and the rules that turn a preference into behaviour, so they can be tested in Node.
//
// Two records, two writers (so a stale Scholar tab can never overwrite what the settings page saved):
//   prefs — what to show, and whether to load the whole paper list. Written by the settings page only; read by the pages and the popup.
//   ui    — { collapsed, source }: whether the panel is folded and which ranking its table uses.
//           Written by the Scholar page only.
//
// The settings are one table (SETTINGS below): a path in the stored record, what the value is, its default, and what it does. Everything else is
// derived from it — defaults(), normalize(), apply() (a patch from an import, a preset or an agent, with a report of what it did), the reference
// that lib/agent.js writes for agents — so they cannot disagree. A setting is added by adding a row (and its words in _locales).
(function (root, factory) {
  const api = factory(typeof require === "function" && typeof module === "object" ? require("./i18n.js") : root.RolesRanks.i18n);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).prefs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (i18n) {
  "use strict";

  // ---- the settings ---------------------------------------------------------------------------------------------------------------------
  // kind: "bool" | "color" (#rrggbb, or "" for the built-in colour) | "choice" (one of `values`) | "language" (`none`, or a language folder of _locales)
  const bool = (path, def, doc) => ({ path, kind: "bool", def, doc });
  const choice = (path, values, def, doc) => ({ path, kind: "choice", values, def, doc });
  const color = (path, doc) => ({ path, kind: "color", def: "", doc });
  const language = (path, none, doc) => ({ path, kind: "language", none, def: none, doc });

  const SETTINGS = [
    language("language", "auto", "Interface language of the extension. \"auto\" follows the browser; otherwise a language code."),
    language("scholarLanguage", "keep", "Language Google Scholar pages are opened in. \"keep\" leaves the address alone; otherwise a language code (a page opened in another language is opened again in this one)."),

    bool("roles.first", true, "Highlight the rows where you are the first author."),
    bool("roles.cofirst", true, "Highlight the rows where you are one of several co-first authors (equal-contribution marks such as * or †)."),
    bool("roles.second", true, "Highlight the rows where you are the second author."),
    bool("roles.last", true, "Highlight the rows where you are the last author."),
    bool("markName", true, "Mark your own name in the author line of a highlighted row (bold, tinted)."),

    color("colors.first", "Row colour of the first-author role, \"#rrggbb\"; \"\" is the built-in blue."),
    color("colors.cofirst", "Row colour of the co-first role, \"#rrggbb\"; \"\" is the built-in purple."),
    color("colors.second", "Row colour of the second-author role, \"#rrggbb\"; \"\" is the built-in amber."),
    color("colors.last", "Row colour of the last-author role, \"#rrggbb\"; \"\" is the built-in green."),
    choice("rowStyle", ["full", "bar", "tint"], "full", "How a highlighted row looks: \"full\" is a tint and a bar at the left edge, \"bar\" the bar only, \"tint\" the tint only."),

    bool("ranks.ccf", true, "Show CCF ranks (chips on rows, a tab in the panel's table)."),
    bool("ranks.core", true, "Show CORE ranks (chips on rows, a tab in the panel's table)."),

    bool("marks.award", true, "Show award chips (best paper and the like) and their count in the panel."),
    bool("marks.oral", true, "Show \"Oral\" chips (a talk level the authors wrote in the venue) and their count."),
    bool("marks.spotlight", true, "Show \"Spotlight\" chips and their count."),
    bool("marks.highlight", true, "Show \"Highlight\" chips and their count."),
    choice("talkRows", ["separate", "pair", "talks"], "separate", "How the panel counts talks: \"separate\" one row each for oral, spotlight and highlight; \"pair\" spotlight and highlight together; \"talks\" all three together."),

    bool("mergeDuplicates", false, "Count a paper once when Scholar lists it twice (titles that differ only in capitals or punctuation)."),

    bool("hide.cited", false, "Hide Scholar's whole \"Cited by\" block in the right-hand column (table and chart)."),
    bool("hide.citedTable", false, "Hide only the table of the \"Cited by\" block (All / Since …). No effect while hide.cited is on."),
    bool("hide.citedChart", false, "Hide only the year chart of the \"Cited by\" block. No effect while hide.cited is on."),
    bool("hide.coauthors", false, "Hide Scholar's \"Co-authors\" block."),
    bool("hide.access", false, "Hide Scholar's \"Public access\" block."),

    bool("panel.show", true, "The panel in the right-hand column: off hides all of it and every panel.* and copy.* setting then has no effect."),
    bool("panel.summary", true, "Panel part: the table of your papers by position and rank, with the note on where the ranks come from."),
    bool("panel.marks", true, "Panel part: the awards and talks counts."),
    bool("panel.filters", true, "Panel part: the search box and the filters (only highlighted, a year range)."),
    bool("panel.metrics", true, "Panel part: citation totals (papers, citations, h-index, i10-index) of all papers and of the highlighted ones."),
    bool("panel.years", true, "Panel part: the papers-per-year chart (a click on a year filters the list)."),
    bool("panel.venues", false, "Panel part: the venues you publish at most, with their ranks. Off until asked."),
    bool("panel.status", true, "Panel part: how many papers are loaded, what could not be read, the button that reads full author lists."),
    bool("panel.names", true, "Panel part: help with spellings of your name that Scholar prints differently."),

    bool("copy.summary", true, "Copy button: the summary table as plain text (panel and toolbar popup)."),
    bool("copy.table", true, "Copy button: the summary table as tab-separated cells, for a spreadsheet."),
    bool("copy.papers", true, "Copy button: the list of papers shown, as plain text."),
    bool("copy.apa", true, "Copy button: the papers shown as APA 7th edition references."),
    bool("copy.bibtex", true, "Copy button: the papers shown as BibTeX entries."),
    bool("copy.markdown", true, "Copy button: the papers shown as a Markdown list."),
    bool("copy.json", true, "Copy button: the papers shown as JSON, with roles, ranks and marks."),
    bool("copy.csv", true, "Copy button: the papers shown as CSV (RFC 4180)."),

    bool("semanticScholar", false, "Ask Semantic Scholar's public API (paper titles only, no cookies) for a cut-off author list before opening the paper's Scholar page. Sends titles to a third party: leave off unless the user asks for it."),
    bool("autoLoad", true, "Press Scholar's own \"Show more\" button until the whole paper list is loaded, as the profile opens.")
  ];

  const BY_PATH = new Map(SETTINGS.map((s) => [s.path, s]));
  const GROUPS = new Set(SETTINGS.flatMap((s) => s.path.split(".").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("."))));   // "roles", "panel", …
  const keysOf = (group) => SETTINGS.filter((s) => s.path.startsWith(group + ".")).map((s) => s.path.slice(group.length + 1));

  const ROLES = keysOf("roles");
  const RANKS = keysOf("ranks");
  const MARK_GROUPS = keysOf("marks");
  const PANEL_PARTS = keysOf("panel");
  const HIDE_PARTS = keysOf("hide");
  const COPY_BUTTONS = keysOf("copy");

  // ---- values ---------------------------------------------------------------------------------------------------------------------------
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const languages = () => i18n.codes;
  // why a value is not accepted (null when it is)
  function problem(s, v) {
    if (s.kind === "bool") return typeof v === "boolean" ? null : "must be true or false";
    if (s.kind === "choice") return s.values.includes(v) ? null : "must be one of: " + s.values.join(", ");
    if (s.kind === "color") return v === "" || (typeof v === "string" && HEX.test(v)) ? null : "must be \"#rrggbb\" or \"\" (the built-in colour)";
    return v === s.none || languages().includes(v) ? null : `must be "${s.none}" or one of: ${languages().join(", ")}`;
  }
  const clean = (s, v) => (s.kind === "color" && typeof v === "string" ? v.toLowerCase() : v);

  const own = (o, k) => o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
  function read(obj, path) {
    let at = obj;
    for (const k of path.split(".")) { if (!own(at, k)) return undefined; at = at[k]; }
    return at;
  }
  function write(obj, path, value) {
    const keys = path.split(".");
    let at = obj;
    for (const k of keys.slice(0, -1)) at = at[k] = at[k] || {};
    at[keys[keys.length - 1]] = value;
  }

  // Everything on that nobody asked to be off: the defaults of the table above.
  const defaults = () => {
    const out = {};
    for (const s of SETTINGS) write(out, s.path, s.def);
    return out;
  };

  // Any stored value → a complete, well-typed record. Unknown keys are dropped, a wrong value falls back to the default.
  function normalize(raw) {
    const out = {};
    for (const s of SETTINGS) {
      const v = read(raw, s.path);
      write(out, s.path, problem(s, v) === null ? clean(s, v) : s.def);
    }
    return out;
  }

  // Every setting as { path, value }, in the table's order.
  const flatten = (prefs) => SETTINGS.map((s) => ({ path: s.path, value: read(prefs, s.path) }));

  // A patch (some settings, in the shape of the record: { panel: { years: false } }) laid over `current`. Nothing in the patch can break the record:
  // what is not a setting, or has a value the setting does not take, is left out and named in `ignored` with the reason.
  //   → { prefs, applied: [{ path, from, to }], unchanged: [path], ignored: [{ path, reason }] }
  function apply(current, patch) {
    const prefs = normalize(current), applied = [], unchanged = [], ignored = [];
    const plain = (o) => o !== null && typeof o === "object" && !Array.isArray(o);
    if (!plain(patch)) return { prefs, applied, unchanged, ignored: [{ path: "", reason: "must be a JSON object" }] };
    (function walk(node, prefix) {
      for (const key of Object.keys(node)) {
        if (key.includes(".")) { ignored.push({ path: prefix ? prefix + "." + key : key, reason: "unknown setting" }); continue; }   // (the shape is the record's: no dotted keys)
        const path = prefix ? prefix + "." + key : key, value = node[key], s = BY_PATH.get(path);
        if (s) {
          const why = problem(s, value);
          if (why) { ignored.push({ path, reason: why }); continue; }
          const to = clean(s, value), from = read(prefs, path);
          if (from === to) { unchanged.push(path); continue; }
          write(prefs, path, to);
          applied.push({ path, from, to });
        } else if (GROUPS.has(path)) {
          if (plain(value)) walk(value, path); else ignored.push({ path, reason: "must be an object" });
        } else ignored.push({ path, reason: "unknown setting" });
      }
    })(patch, "");
    return { prefs, applied, unchanged, ignored };
  }

  // Ready-made patches (the settings page offers them; each is applied like any other patch, and a test keeps them valid).
  const PRESETS = {
    // everything the extension can show; the choice of network use (semanticScholar) and the language are not touched
    all: {
      roles: { first: true, cofirst: true, second: true, last: true }, markName: true, rowStyle: "full",
      ranks: { ccf: true, core: true }, marks: { award: true, oral: true, spotlight: true, highlight: true }, talkRows: "separate", mergeDuplicates: true,
      hide: { cited: false, citedTable: false, citedChart: false, coauthors: false, access: false },
      panel: { show: true, summary: true, marks: true, filters: true, metrics: true, years: true, venues: true, status: true, names: true },
      copy: { summary: true, table: true, papers: true, apa: true, bibtex: true, markdown: true, json: true, csv: true },
      autoLoad: true
    },
    // the papers where you are the last author
    last: { roles: { first: false, cofirst: false, second: false, last: true }, ranks: { ccf: true, core: true }, rowStyle: "full" },
    // the papers where you are first or co-first author
    first: { roles: { first: true, cofirst: true, second: false, last: false }, ranks: { ccf: true, core: true }, rowStyle: "full" },
    // the page with the least added: tinted rows, the search and the citation totals only
    minimal: {
      rowStyle: "tint",
      hide: { citedTable: true, access: true },
      panel: { show: true, summary: false, marks: false, filters: true, metrics: true, years: false, venues: false, status: false, names: false },
      copy: { summary: false, table: false, papers: false, apa: false, bibtex: false, markdown: false, json: false, csv: false }
    }
  };

  function normalizeUi(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    return { collapsed: r.collapsed === true, source: r.source === "core" ? "core" : "ccf" };
  }

  // Rank systems that are switched on, and the one the panel's table uses: the remembered one if it is on,
  // otherwise the first that is, otherwise none (the table then shows roles only).
  const sources = (prefs) => RANKS.filter((k) => prefs.ranks[k]);
  function source(prefs, ui) {
    const on = sources(prefs);
    return on.includes(ui.source) ? ui.source : on[0] || null;
  }

  // The copy buttons that are switched on, in the order the panel and the popup draw them.
  const copyButtons = (prefs) => COPY_BUTTONS.filter((k) => prefs.copy[k]);

  // A best-paper finalist belongs to the awards switch (it is the same kind of news); talk levels have their own.
  const groupOn = (prefs, group) => (group === "finalist" ? prefs.marks.award : !!prefs.marks[group]);
  const visibleMarks = (prefs, marks) => (marks || []).filter((m) => groupOn(prefs, m.group));

  return { ROLES, RANKS, MARK_GROUPS, PANEL_PARTS, HIDE_PARTS, COPY_BUTTONS, SETTINGS, PRESETS, defaults, normalize, normalizeUi, flatten, apply, sources, source, copyButtons, groupOn, visibleMarks };
});
