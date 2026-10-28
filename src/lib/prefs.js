// What the extension draws, and per-device view state. Pure, no chrome.*: the stored shapes, their
// defaults, and the rules that turn a preference into behaviour, so they can be tested in Node.
//
// Two records, two writers (so a stale Scholar tab can never overwrite what the settings page saved):
//   prefs — what to show, and in what order. Written by the settings page only; read by the pages and the popup.
//   ui    — { collapsed, source }: whether the panel is folded and which ranking its table uses.
//           Written by the Scholar page only.
//
// The screen is described once, as CARDS: one card for each part of what the extension draws, in the order it is drawn (the settings page lists them in
// that order, beside the preview), each with its settings. A setting is a path in the stored record, what the value is, its default and what it does.
// SETTINGS is the cards' rows in one list, and everything else is derived from it — defaults(), normalize(), apply() (a patch from an import, a preset or
// an agent, with a report of what it did), the reference that lib/agent.js writes for agents — so they cannot disagree. A setting is added by adding
// a row (and its words in _locales).
//
// A name is a setting too (`labels.<message key>`): the text of a title or a name on the screen, in the person's own words. It replaces the translation, in every
// language; "" is the built-in (translated) text.
//
// A switch decides what is DRAWN, one thing at a time. What the search and the exports include follows what is drawn anywhere ("what you see is what you
// search and copy"): see listShown() and markShown().
(function (root, factory) {
  const node = typeof require === "function" && typeof module === "object";
  const api = factory(node ? require("./i18n.js") : root.RolesRanks.i18n, node ? require("./query.js") : root.RolesRanks.query);
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).prefs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (i18n, query) {
  "use strict";

  // ---- vocabulary -----------------------------------------------------------------------------------------------------------------------
  const ROLES = ["first", "cofirst", "second", "last"];
  const RANKS = ["ccf", "core"];
  const MARK_GROUPS = ["award", "oral", "spotlight", "highlight"];
  const COPY_BUTTONS = ["summary", "table", "image", "papers", "apa", "ieee", "gbt", "bibtex", "markdown", "json", "csv"];
  const HIDE_PARTS = ["cited", "citedTable", "citedChart", "coauthors", "access"];
  // The parts of the panel, in their default order (the panel's `order` setting is a permutation of these; each is also a card below)
  const SECTIONS = ["table", "copy", "marks", "filters", "metrics", "years", "venues", "status", "names"];
  // The quick filters under the search box: each adds one operator of lib/query.js to the search (a test keeps them valid)
  const PILL_OPERATORS = { ccfA: "ccf:a", coreA: "core:a*", cites100: "cites:>100", recent: "age:<5", first: "role:first", cofirst: "role:cofirst", second: "role:second", last: "role:last", award: "has:award", talk: "has:talk" };
  const PILLS_ON = ["ccfA", "cites100", "first", "award"];
  // Quick filters of your own: a search of your own words as a button, after the built-in ones. Its words are panel.filters.searches.<id>; its name is a name like any
  // other (labels.pillSearch1 …), and with none the button shows its words.
  const SEARCHES = ["search1", "search2", "search3"];
  const SEARCH_MAX = 60;          // ("ccf:a role:first age:<5" is 23: room for more, and the record with every name at its longest still fits chrome.storage.sync's item)
  const PILLS = [...Object.keys(PILL_OPERATORS), ...SEARCHES];
  // the words a quick filter puts in the search
  const pillWords = (prefs, id) => (SEARCHES.includes(id) ? prefs.panel.filters.searches[id] : PILL_OPERATORS[id]);

  // ---- the rows -------------------------------------------------------------------------------------------------------------------------
  // kind: "bool" | "choice" (one of `values`) | "color" (#rrggbb, or "" for the built-in colour) | "language" (`none`, or a language folder of _locales)
  //       | "order" (a permutation of `values`) | "text" (a name: at most `max` characters on one line, "" for the built-in text)
  // ui (what the settings page needs): label / hint (message keys), parent (the switch this one depends on; `invert`: it has no effect while that one is ON),
  //     swatch (a role colour beside it), group (a heading over this row and the ones after it that name the same), inline (a name drawn on the row of the switch before it)
  const row = (kind, path, def, doc, ui) => ({ kind, path, def, doc, ...ui });
  const bool = (path, def, doc, ui) => row("bool", path, def, doc, ui);
  const choice = (path, values, def, doc, ui) => row("choice", path, def, doc, { values, ...ui });
  const color = (path, doc, ui) => row("color", path, "", doc, ui);
  const language = (path, none, doc, ui) => row("language", path, none, doc, { none, ...ui });
  const order = (path, values, doc, ui) => row("order", path, values.slice(), doc, { values, ...ui });
  const text = (path, doc, ui) => row("text", path, "", doc, { max: NAME_MAX, ...ui });

  // The names a person can change: a text of the screen by its message key, with where it is drawn and its English words (a test keeps those equal to the catalogue's).
  // Only texts of one piece (nothing is put into them), so a name never has to know a number or a plural. The screen's words for a machine — the exports, the page calls,
  // the search operators — are not names: they keep the standard words.
  const NAME_MAX = 30;
  const NAMES = {
    extShortName: ["the panel's title", "Better Scholar"],
    summaryTitle: ["the title of the role × rank table", "Papers by role and rank"],
    summaryTitleRoles: ["the table's title when no venue of the profile is ranked", "Papers by role"],
    tipUnranked: ["the name of the unranked column (its tooltip, the popup's legend)", "Not ranked"],
    colTotal: ["the totals column and row of the table", "Total"],
    roleFirst: ["the first-author role wherever the panel names it (table, quick filter, filter bar, chart)", "First"],
    roleCofirst: ["the co-first role wherever the panel names it", "Co-first"],
    roleSecond: ["the second-author role wherever the panel names it", "Second"],
    roleLast: ["the last-author role wherever the panel names it", "Last"],
    roleMiddle: ["the row of the table for the other positions", "Other"],
    roleHidden: ["the row of the table for papers whose position is not visible", "Hidden"],
    copySummary: ["the Copy summary button", "Copy summary"],
    copyTable: ["the Copy as table button", "Copy as table"],
    copyImage: ["the Copy as image button", "Copy as image"],
    copyPapers: ["the Copy papers button", "Copy papers"],
    copyApa: ["the Copy APA button", "Copy APA"],
    copyIeee: ["the Copy IEEE button", "Copy IEEE"],
    copyGbt: ["the Copy GB/T 7714 button", "Copy GB/T 7714"],
    copyBibtex: ["the Copy BibTeX button", "Copy BibTeX"],
    copyMarkdown: ["the Copy Markdown button", "Copy Markdown"],
    copyJson: ["the Copy JSON button", "Copy JSON"],
    exportCsv: ["the Export CSV button", "Export CSV"],
    marksTitle: ["the title of the awards and talks counts", "Awards & talks"],
    markAward: ["the awards count row and quick filter", "Awards"],
    markOral: ["the Oral count row and chip", "Oral"],
    markSpotlight: ["the Spotlight count row and chip", "Spotlight"],
    markHighlight: ["the Highlight count row and chip", "Highlight"],
    markSpotlightHighlight: ["the count row that joins spotlight and highlight", "Spotlight & highlight"],
    markTalks: ["the count row that joins all talks, and the Talks quick filter", "Talks"],
    filterPlaceholder: ["the hint in the search box", "Search title or author…"],
    onlyHighlighted: ["the Only highlighted switch", "Only highlighted"],
    pillSearch1: ["your own quick filter 1 (with no name, its button shows its words)", "Your filter 1"],
    pillSearch2: ["your own quick filter 2", "Your filter 2"],
    pillSearch3: ["your own quick filter 3", "Your filter 3"],
    yearLabel: ["the label of the year range", "Year"],
    yearStart: ["the From of the year range", "From"],
    yearEnd: ["the To of the year range", "To"],
    metricsTitle: ["the title of the citation totals", "Highlighted papers"],
    mPapers: ["the number of papers", "Papers"],
    mCitations: ["the number of citations", "Citations"],
    mH: ["the h-index", "h-index"],
    mI10: ["the i10-index", "i10-index"],
    yearsTitle: ["the title of the year chart", "Highlighted papers by year"],
    venuesTitle: ["the title of the venue list", "Where the highlighted papers appear"],
    loadAll: ["the Load all button", "Load all"],
    resolveBtn: ["the Read full lists button", "Read full lists"],
    variantsTitle: ["the heading of the name help", "Name not matching? Add a spelling"],
    mkBest: ["the chip of a best paper award", "Best paper"],
    mkBestStudent: ["the chip of a best student paper award", "Best student paper"],
    mkOutstanding: ["the chip of an outstanding paper award", "Outstanding paper"],
    mkDistinguished: ["the chip of a distinguished paper award", "Distinguished paper"],
    mkRunnerUp: ["the chip of an honorable mention", "Honorable mention"],
    mkTot: ["the chip of a test of time award", "Test of time"],
    mkFinalist: ["the chip of a best paper finalist", "Best paper finalist"]
  };
  // a name's row: its own path, `labels.<message key>`; it is shown with the switch before it (`inline`) or on its own
  const nameRow = (key, ui) => text("labels." + key, `The text of ${NAMES[key][0]} (default: ${JSON.stringify(NAMES[key][1])}): your own words, in every language; "" brings the built-in text back.`, { label: key, ...ui });
  const named = (key) => nameRow(key, { inline: true });
  const names = (...keys) => keys.map((k) => nameRow(k));

  // a part of the panel: its own switch, then one for each thing it draws — [key, default, label, doc, ui]; ui.name (a message key of NAMES) puts that name on the thing's row;
  // a row of its own (names(…)) among the things stays among them. `popup`: the toolbar popup draws the part too, so its switches count while the panel is off.
  const part = (id, doc, things, { show = true, popup = false } = {}) => [
    bool(`panel.${id}.show`, show, doc, { label: "optShowSection", ...(popup ? {} : { parent: "panel.show" }) }),
    ...things.flatMap((entry) => {
      if (!Array.isArray(entry)) return [{ parent: `panel.${id}.show`, ...entry }];
      const [key, def, label, doc, { name, ...ui } = {}] = entry;
      return [bool(`panel.${id}.${key}`, def, doc, { label, parent: `panel.${id}.show`, ...ui }), ...(name ? [{ parent: `panel.${id}.show`, ...named(name) }] : [])];
    })
  ];
  const card = (id, title, hint, rows) => ({ id, title, hint, rows });
  const ROLE_LABEL = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };
  const ROLE_DOC = {
    first: "Highlight the rows where you are the first author.",
    cofirst: "Highlight the rows where you are one of several co-first authors (equal-contribution marks such as * or †).",
    second: "Highlight the rows where you are the second author.",
    last: "Highlight the rows where you are the last author."
  };
  const COPY_LABEL = { summary: "copySummary", table: "copyTable", image: "copyImage", papers: "copyPapers", apa: "copyApa", ieee: "copyIeee", gbt: "copyGbt", bibtex: "copyBibtex", markdown: "copyMarkdown", json: "copyJson", csv: "exportCsv" };
  // (off until asked for: the reference styles beyond APA and BibTeX, and the table as a picture, so that the copy row keeps its eight buttons until someone needs one)
  const COPY_OFF = ["image", "ieee", "gbt"];
  const COPY_DOC = {
    summary: "Copy button: the summary table as plain text (panel and toolbar popup).",
    table: "Copy button: the summary table as tab-separated cells, for a spreadsheet.",
    image: "Copy button: the summary table as a picture (PNG), for a slide, a CV or a form, with its text beside it.",
    papers: "Copy button: the list of papers shown, as plain text.",
    apa: "Copy button: the papers shown as APA 7th edition references.",
    ieee: "Copy button: the papers shown as a numbered IEEE reference list.",
    gbt: "Copy button: the papers shown as a GB/T 7714-2015 reference list (the Chinese national standard).",
    bibtex: "Copy button: the papers shown as BibTeX entries.",
    markdown: "Copy button: the papers shown as a Markdown list.",
    json: "Copy button: the papers shown as JSON, with roles, ranks and marks.",
    csv: "Copy button: the papers shown as CSV (RFC 4180)."
  };
  const PILL_LABEL = { ccfA: "optPillCcfA", coreA: "optPillCoreA", cites100: "optPillCites", recent: "optPillRecent", first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast", award: "markAward", talk: "markTalks",
    search1: "pillSearch1", search2: "pillSearch2", search3: "pillSearch3" };

  const CARDS = [
    card("language", "optLanguageTitle", "optLanguageHint", [
      language("language", "auto", "Interface language of the extension. \"auto\" follows the browser; otherwise a language code.", { label: "optLanguageUi" }),
      language("scholarLanguage", "keep", "Language Google Scholar pages are opened in. \"keep\" leaves the address alone; otherwise a language code (a page opened in another language is opened again in this one).",
        { label: "optLanguageScholar", hint: "optLanguageScholarHint" })
    ]),

    // the paper list on Scholar, top to bottom: the coloured row, the name in the author line, the chips after the venue
    card("highlight", "optRolesTitle", "optRolesHint", [
      ...ROLES.map((r) => bool(`roles.${r}`, true, ROLE_DOC[r], { label: ROLE_LABEL[r], swatch: r })),
      bool("rows.name", true, "Mark your own name in the author line of a highlighted row (bold, tinted).", { label: "optMarkName", hint: "optMarkNameHint" })
    ]),
    card("colors", "optColorsTitle", "optColorsHint", [
      color("colors.first", "Row colour of the first-author role, \"#rrggbb\"; \"\" is the built-in blue."),
      color("colors.cofirst", "Row colour of the co-first role, \"#rrggbb\"; \"\" is the built-in purple."),
      color("colors.second", "Row colour of the second-author role, \"#rrggbb\"; \"\" is the built-in amber."),
      color("colors.last", "Row colour of the last-author role, \"#rrggbb\"; \"\" is the built-in green."),
      choice("rows.style", ["full", "bar", "tint", "none"], "full", "How a highlighted row looks: \"full\" is a tint and a bar at the left edge, \"bar\" the bar only, \"tint\" the tint only, \"none\" leaves the row as Scholar draws it.", { label: "optRowStyle" })
    ]),
    card("chips", "optChipsTitle", "optChipsHint", [
      bool("rows.ccf", true, "A CCF rank chip after the venue of a paper.", { label: "optCcf", hint: "optCcfHint" }),
      bool("rows.core", true, "A CORE rank chip after the venue of a paper.", { label: "optCore", hint: "optCoreHint" }),
      choice("rows.prefer", ["ccf", "core", "both"], "ccf", "Where both lists rank a venue (CCF and CORE are often the same news twice): \"ccf\" draws the CCF chip alone and the CORE chip only where CCF has no rank for the venue, \"core\" the other way round, \"both\" draws both. The venue list of the panel and the notes of the BibTeX and Markdown copies follow; the table, the search and the other exports keep both lists. Only between lists that are drawn.",
        { label: "optPrefer", hint: "optPreferHint" }),
      bool("rows.award", true, "An award chip (best paper and the like) on a paper.", { label: "markAward", hint: "optMarkAwardHint" }),
      bool("rows.oral", true, "An \"Oral\" chip (a talk level the authors wrote in the venue) on a paper.", { label: "markOral" }),
      bool("rows.spotlight", true, "A \"Spotlight\" chip on a paper.", { label: "markSpotlight" }),
      bool("rows.highlight", true, "A \"Highlight\" chip on a paper.", { label: "markHighlight" }),
      ...names("mkBest", "mkBestStudent", "mkOutstanding", "mkDistinguished", "mkRunnerUp", "mkTot", "mkFinalist"),
      choice("chips.style", ["outline", "soft", "solid", "text"], "outline", "How the chips are drawn: \"outline\" a border on white (rank chips) or a tint with a border (awards, talks), \"soft\" a tint without a border, \"solid\" a filled chip with readable text, \"text\" coloured words with no box.",
        { label: "optChipStyle", group: "optChipLook" }),
      choice("chips.shape", ["pill", "square"], "pill", "The corners of the chips: \"pill\" fully rounded, \"square\" almost square.", { label: "optChipShape", group: "optChipLook" }),
      choice("chips.label", ["full", "tier"], "full", "The words of the rank chips: \"full\" the list and the tier (CCF A), \"tier\" the tier alone (A; the tooltip still names the list).", { label: "optChipLabel", group: "optChipLook" }),
      color("colors.ccf", "Colour of the CCF chips, \"#rrggbb\"; \"\" is the built-in indigo (the weaker tiers fade towards grey).", { label: "srcCcf", group: "optChipColors" }),
      color("colors.core", "Colour of the CORE chips, \"#rrggbb\"; \"\" is the built-in indigo.", { label: "srcCore", group: "optChipColors" }),
      color("colors.award", "Colour of the award chips, \"#rrggbb\"; \"\" is the built-in gold.", { label: "markAward", group: "optChipColors" }),
      color("colors.talk", "Colour of the talk chips (Oral, Spotlight, Highlight), \"#rrggbb\"; \"\" is the built-in slate.", { label: "markTalks", group: "optChipColors" })
    ]),

    // the panel, top to bottom
    card("panel", "optPanelTitle", null, [
      bool("panel.show", true, "The panel in the right-hand column of the profile page: off hides all of it. The settings of the table, of the awards and talks counts and of the copy buttons still decide what the toolbar popup shows; every other panel.* setting has no effect then.", { label: "optPanelShow", hint: "optPanelShowHint" }),
      order("panel.order", SECTIONS, "The parts of the panel from top to bottom: a list of part ids (" + SECTIONS.join(", ") + "). Ids left out follow in the default order; a part's own show switch hides it without changing its place.",
        { label: "optPanelOrder", hint: "optPanelOrderHint", parent: "panel.show" }),
      bool("panel.header.name", true, "The panel's title at the top.", { label: "optHeadName", parent: "panel.show" }),
      { parent: "panel.show", ...named("extShortName") },
      bool("panel.header.settings", true, "The button in the panel's title bar that opens the settings page.", { label: "optHeadSettings", parent: "panel.show" }),
      bool("panel.header.fold", true, "The button that folds the panel to its title bar. Off: the panel is always open.", { label: "optHeadFold", parent: "panel.show" }),
      bool("panel.filters.bar", true, "The line in the panel's title bar that says how many papers the filters leave, and clears them: it takes the place of the title while a filter is on.", { label: "optFiltersBar", parent: "panel.show" })
    ]),
    card("table", "optPanelSummary", "optPanelSummaryHint", part("table", "The table of your papers by position and rank (also the toolbar popup's table).", [
      ["title", true, "optPartTitle", "The title line of the table.", { name: "summaryTitle" }],
      ...names("summaryTitleRoles"),
      ["ccf", true, "optTableCcf", "A CCF tab and its columns in the table; also the CCF ranking the copy summary and the copy table use (while the table is not drawn, a list is used where the rows' chips show it)."],
      ["core", true, "optTableCore", "A CORE tab and its columns in the table; also the CORE ranking the copy summary and the copy table use (while the table is not drawn, a list is used where the rows' chips show it)."],
      ["unranked", true, "optTableUnranked", "The column of papers whose venue has no rank (drawn as “–”).", { name: "tipUnranked" }],
      ["total", true, "optTableTotal", "The totals: the All column and the All row.", { name: "colTotal" }],
      ...names("roleFirst", "roleCofirst", "roleSecond", "roleLast"),
      ["other", true, "optTableOther", "The \"Other\" row: papers where you are neither first, co-first, second nor last author.", { name: "roleMiddle" }],
      ["hidden", true, "optTableHidden", "The \"Hidden\" row: papers whose cut-off author list does not show your position.", { name: "roleHidden" }],
      ["note", true, "optTableNote", "The note under the table that says the ranks are today's lists, not the rank at publication."]
    ], { popup: true })),
    card("copy", "optCopyTitle", "optCopyHint", [
      bool("panel.copy.show", true, "The row of copy and export buttons (also the toolbar popup's).", { label: "optShowSection" }),
      order("panel.copy.order", COPY_BUTTONS, "The copy buttons, left to right: a list of ids (" + COPY_BUTTONS.join(", ") + "). Ids left out follow in the default order; a button's own switch hides it without changing its place.",
        { label: "optOrderButtons", parent: "panel.copy.show" }),
      ...COPY_BUTTONS.flatMap((k) => [bool(`panel.copy.${k}`, !COPY_OFF.includes(k), COPY_DOC[k], { label: COPY_LABEL[k], parent: "panel.copy.show" }), { parent: "panel.copy.show", ...named(COPY_LABEL[k]) }]),
      bool("panel.copy.source", true, "A line in the copied summary and the copied table with the profile's link (nothing else of the address) and the day, so that the numbers can be filed or sent on. A list that is not all loaded says so in the same place whatever this says.",
        { label: "optCopySource", hint: "optCopySourceHint", parent: "panel.copy.show" })
    ]),
    card("marks", "optMarksTitle", "optPanelMarksHint", [
      ...part("marks", "The awards and talks counts: one click lists those papers.", [
        ["title", true, "optPartTitle", "The title line of the awards and talks counts.", { name: "marksTitle" }],
        ["award", true, "markAward", "A count row for award-winning papers.", { name: "markAward" }],
        ["oral", true, "markOral", "A count row for \"Oral\" papers.", { name: "markOral" }],
        ["spotlight", true, "markSpotlight", "A count row for \"Spotlight\" papers.", { name: "markSpotlight" }],
        ["highlight", true, "markHighlight", "A count row for \"Highlight\" papers.", { name: "markHighlight" }],
        ...names("markSpotlightHighlight", "markTalks")
      ], { popup: true }),
      choice("panel.marks.grouping", ["separate", "pair", "talks"], "separate", "How the panel counts talks: \"separate\" one row each for oral, spotlight and highlight; \"pair\" spotlight and highlight together; \"talks\" all three together.",
        { label: "optTalkRows", hint: "optTalkRowsHint", parent: "panel.marks.show" })
    ]),
    card("filters", "optPanelFilters", "optPanelFiltersHint", [
      ...part("filters", "The search box and the filters.", [["search", true, "optFiltersSearch", "The search box, with its suggestions and the number of papers it finds.", { name: "filterPlaceholder" }],
        ["key", true, "optFiltersKey", "The \"/\" key jumps to the search box — on a profile, and on this settings page for its own search. Off: the key does nothing (a character key that does something is one a person can switch off).", { hint: "optFiltersKeyHint", parent: "panel.filters.search" }]]),
      order("panel.filters.pills.order", PILLS, "The quick-filter buttons under the search box, left to right: a list of ids (" + PILLS.join(", ") + "). Ids left out follow in the default order; a button's own switch hides it without changing its place.",
        { label: "optOrderPills", parent: "panel.filters.show", group: "optFiltersQuick" }),
      ...Object.keys(PILL_OPERATORS).map((id) => bool(`panel.filters.pills.${id}`, PILLS_ON.includes(id), `Quick filter: a button that adds ${PILL_OPERATORS[id]} to the search (left out while nothing of that kind is drawn, and on a profile with no paper that it would find).`,
        { label: PILL_LABEL[id], parent: "panel.filters.show", group: "optFiltersQuick" })),
      ...SEARCHES.flatMap((id, i) => [
        bool(`panel.filters.pills.${id}`, true, `Your own quick filter ${i + 1}: a button that puts the words of panel.filters.searches.${id} in the search, or takes them out (none while those words are empty or not read, and on a profile with no paper they would find). Its name is labels.${PILL_LABEL[id]}; with none, the button shows its words.`,
          { label: PILL_LABEL[id], parent: "panel.filters.show", group: "optFiltersQuick" }),
        { parent: "panel.filters.show", group: "optFiltersQuick", ...named(PILL_LABEL[id]) },
        text(`panel.filters.searches.${id}`, `The words of your own quick filter ${i + 1}, as they are typed in the search box: words and operators (ccf:a role:first age:<5, see the search below); "" for none.`,
          { max: SEARCH_MAX, search: true, label: "optPillSearchWords", ...(i ? {} : { hint: "optPillSearchHint" }), parent: `panel.filters.pills.${id}`, group: "optFiltersQuick" })          // (the hint once, on the first)
      ]),
      bool("panel.filters.only", true, "The \"Only highlighted\" switch (absent while no position is highlighted).", { label: "onlyHighlighted", parent: "panel.filters.show" }),
      { parent: "panel.filters.show", ...named("onlyHighlighted") },
      bool("panel.filters.years", true, "The year range: From and To.", { label: "optFiltersYears", parent: "panel.filters.show" }),
      { parent: "panel.filters.show", ...named("yearLabel") },
      ...names("yearStart", "yearEnd").map((r) => ({ parent: "panel.filters.show", ...r })),
      bool("panel.filters.follow", true, "The counts follow the filters: the table, the awards and talks counts and the panel's copy summary and copy table count the papers the filters leave (a year range, a search, a quick filter, a venue, Only highlighted, the papers behind the h-index); the cell or the row picked in a count narrows no count. Off: they count every paper.",
        { label: "optFiltersFollow", hint: "optFiltersFollowHint", parent: "panel.show" })
    ]),
    card("metrics", "optPanelMetrics", "optPanelMetricsHint", part("metrics", "Citation totals (papers, citations, h-index, i10-index) of all papers and of the highlighted ones.", [
      ["title", true, "optPartTitle", "The title line of the citation totals.", { name: "metricsTitle" }],
      ["scope", true, "optMetricsScope", "The line that says which roles the numbers count (\"First, Co-first, Second and Last\")."],
      ["papers", true, "mPapers", "The number of papers.", { name: "mPapers" }],
      ["citations", true, "mCitations", "The number of citations.", { name: "mCitations" }],
      ["h", true, "mH", "The h-index, a button that lists the papers behind it.", { name: "mH" }],
      ["i10", true, "mI10", "The i10-index, a button that lists the papers behind it.", { name: "mI10" }],
      ["of", true, "optMetricsOf", "The \"of N\" beside each number: the figure over all papers, not only the highlighted ones."]
    ])),
    card("years", "optPanelYears", "optPanelYearsHint", part("years", "The papers-per-year chart (a click on a year filters the list).", [
      ["title", true, "optPartTitle", "The title line of the chart.", { name: "yearsTitle" }],
      ["axis", true, "optYearsAxis", "The first and the last year under the bars."]
    ])),
    card("venues", "optPanelVenues", "optPanelVenuesHint", part("venues", "The venues you publish at most, with their ranks. Off until asked.", [
      ["title", true, "optPartTitle", "The title line of the venue list.", { name: "venuesTitle" }]
    ], { show: false })),
    card("status", "optPanelStatus", "optPanelStatusHint", part("status", "The status lines: how many papers are loaded, what could not be read, the button that reads full author lists.", [
      ["loaded", true, "optStatusLoaded", "How many papers are loaded, and the Load all button.", { name: "loadAll" }],
      ["cutoff", true, "optStatusCutoff", "The papers whose author list Scholar cut off, and the button that reads the full lists.", { name: "resolveBtn" }],
      ["repeats", true, "optStatusRepeats", "The line about duplicate entries."],
      ["absent", true, "optStatusAbsent", "The line about papers whose author list does not name you."],
      ["unranked", true, "optStatusUnranked", "The list of papers at venues without a rank, with its Copy and Report buttons."]
    ])),
    card("names", "optPanelNames", "optPanelNamesHint", part("names", "Help with spellings of your name that Scholar prints differently.", [
      ["hints", true, "optNamesHints", "The spellings of your name found in your papers, one click to add one."],
      ["add", true, "variantsTitle", "The box where you add a spelling by hand.", { name: "variantsTitle" }]
    ])),

    // Scholar's own page, and how the list is read
    card("hide", "optHideTitle", "optHideHint", [
      bool("hide.cited", false, "Hide Scholar's whole \"Cited by\" block in the right-hand column (table and chart).", { label: "optHideCited", hint: "optHideCitedHint" }),
      bool("hide.citedTable", false, "Hide only the table of the \"Cited by\" block (All / Since …). No effect while hide.cited is on.", { label: "optHideCitedTable", hint: "optHideCitedTableHint", parent: "hide.cited", invert: true }),
      bool("hide.citedChart", false, "Hide only the year chart of the \"Cited by\" block. No effect while hide.cited is on.", { label: "optHideCitedChart", hint: "optHideCitedChartHint", parent: "hide.cited", invert: true }),
      bool("hide.coauthors", false, "Hide Scholar's \"Co-authors\" block.", { label: "optHideCo", hint: "optHideCoHint" }),
      bool("hide.access", false, "Hide Scholar's \"Public access\" block.", { label: "optHideAccess", hint: "optHideAccessHint" })
    ]),
    card("merge", "optMergeTitle", "optMergeHint", [
      bool("mergeDuplicates", false, "Count a paper once when Scholar lists it twice (titles that differ only in capitals or punctuation).", { label: "optMergeLabel", hint: "optMergeLabelHint" })
    ]),
    card("load", "optLoadTitle", null, [
      bool("autoLoad", true, "Press Scholar's own \"Show more\" button until the whole paper list is loaded, as the profile opens.", { label: "optAutoLoad", hint: "optAutoLoadHint" })
    ]),
    card("semantic", "optSemanticTitle", "optSemanticHint", [
      bool("semanticScholar", false, "Ask Semantic Scholar's public API (paper titles only, no cookies) for a cut-off author list before opening the paper's Scholar page. Sends titles to a third party: leave off unless the user asks for it.",
        { label: "optSemanticLabel", hint: "optSemanticLabelHint" })
    ])
  ];

  const SETTINGS = CARDS.flatMap((c) => c.rows.map((r) => ({ ...r, card: c.id })));
  const BY_PATH = new Map(SETTINGS.map((s) => [s.path, s]));
  const GROUPS = new Set(SETTINGS.flatMap((s) => s.path.split(".").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("."))));   // "roles", "panel", "panel.table", …

  // ---- values ---------------------------------------------------------------------------------------------------------------------------
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const languages = () => i18n.codes;
  const plain = (o) => o !== null && typeof o === "object" && !Array.isArray(o);
  // why a value is not accepted (null when it is)
  function problem(s, v) {
    switch (s.kind) {
      case "bool": return typeof v === "boolean" ? null : "must be true or false";
      case "choice": return s.values.includes(v) ? null : "must be one of: " + s.values.join(", ");
      case "color": return v === "" || (typeof v === "string" && HEX.test(v)) ? null : "must be \"#rrggbb\" or \"\" (the built-in colour)";
      case "text": return typeof v === "string" && clean(s, v).length <= s.max ? null : `must be a text of at most ${s.max} characters`;
      case "order": {
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) return "must be a list of ids";
        const unknown = v.filter((x) => !s.values.includes(x));
        if (unknown.length) return "unknown id: " + unknown.map((x) => JSON.stringify(x.slice(0, 30))).join(", ") + " (ids: " + s.values.join(", ") + ")";
        return new Set(v).size === v.length ? null : "an id is listed twice";
      }
      default: return v === s.none || languages().includes(v) ? null : `must be "${s.none}" or one of: ${languages().join(", ")}`;
    }
  }
  // The characters of a name that show nothing or turn the text around: controls, soft hyphen, zero-width space, word joiner and the invisible operators, the fillers (Hangul, Khmer),
  // bidirectional embeddings, overrides and isolates, the Unicode tag characters and the variation selectors of the supplement (text that a reader does not see and a model does).
  // A configuration pasted from somewhere could use them to make a button say what it does not. The joiner and non-joiner stay (some scripts need them inside words), and so do the
  // left-to-right, right-to-left and Arabic letter marks (they fix punctuation in a name of the other direction), the Mongolian variation selectors (they shape its letters) and the
  // variation selectors of emoji and CJK (U+FE00-FE0F): a name made of nothing but marks that stay is no name (`clean` makes it "").
  const UNSEEN = /[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u115f\u1160\u17b4\u17b5\u200b\u202a-\u202e\u2060-\u2064\u2066-\u206f\u3164\ufeff\uffa0\ufff9-\ufffb\u{1bca0}-\u{1bca3}\u{1d173}-\u{1d17a}\u{e0000}-\u{e007f}\u{e0100}-\u{e01ef}]/gu;
  const MARKS_ONLY = /^[\s\u200c\u200d\u200e\u200f\u061c\u180b-\u180f\ufe00-\ufe0f]*$/;
  // the value as stored: a colour in lower case, a name on one line, an order complete (the ids the list leaves out follow in the default order)
  function clean(s, v) {
    if (s.kind === "color" && typeof v === "string") return v.toLowerCase();
    if (s.kind === "text" && typeof v === "string") { const out = v.replace(UNSEEN, (c) => (/\s/.test(c) ? " " : "")).replace(/\s+/g, " ").trim(); return MARKS_ONLY.test(out) ? "" : out; }
    if (s.kind === "order" && Array.isArray(v)) return [...new Set(v), ...s.def.filter((x) => !v.includes(x))];
    return v;
  }
  const same = (a, b) => (Array.isArray(a) ? JSON.stringify(a) === JSON.stringify(b) : a === b);
  const initial = (s) => (s.kind === "order" ? s.def.slice() : s.def);

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
    for (const s of SETTINGS) write(out, s.path, initial(s));
    return out;
  };

  // Any stored value → a complete, well-typed record. Unknown keys are dropped, a wrong value falls back to the default.
  function normalize(raw) {
    const out = {};
    for (const s of SETTINGS) {
      const v = read(raw, s.path);
      write(out, s.path, problem(s, v) === null ? clean(s, v) : initial(s));
    }
    return out;
  }

  // Every setting as { path, value }, in the table's order.
  const flatten = (prefs) => SETTINGS.map((s) => ({ path: s.path, value: read(prefs, s.path) }));

  // What chrome.storage.sync takes for one item: 8,192 bytes, counting the key ("prefs") and the JSON the way Chrome writes it: UTF-8, and a "<" as the six bytes "\u003C"
  // (so a name of thirty "<" is 180 bytes, not 30). A little is left over.
  const SYNC_LIMIT = 8192 - "prefs".length - 100;
  function sizeOf(value) {
    let n = 0;
    for (const ch of JSON.stringify(value)) { const c = ch.codePointAt(0); n += ch === "<" ? 6 : c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; }
    return n;
  }
  // A patch (some settings, in the shape of the record: { panel: { years: { show: false } } }) laid over `current`. Nothing in the patch can break the record:
  // what is not a setting, or has a value the setting does not take, is left out and named in `ignored` with the reason.
  //   → { prefs, applied: [{ path, from, to }], unchanged: [path], ignored: [{ path, reason }] }
  function apply(current, patch) {
    const before = normalize(current);
    const r = applyPatch(current, patch);
    const bytes = sizeOf(r.prefs);
    // (a patch that makes the record larger than Chrome stores is refused whole, with the reason: it would be shown and never kept)
    if (bytes > SYNC_LIMIT && bytes > sizeOf(before)) return { prefs: before, applied: [], unchanged: r.unchanged, ignored: [...r.ignored, { path: "", reason: `the settings would take ${bytes} bytes, more than Chrome's sync storage keeps for one item (${SYNC_LIMIT}): shorten the names` }] };
    return r;
  }
  function applyPatch(current, patch) {
    const prefs = normalize(current), applied = [], unchanged = [], ignored = [];
    if (!plain(patch)) return { prefs, applied, unchanged, ignored: [{ path: "", reason: "must be a JSON object" }] };
    (function walk(node, prefix) {
      for (const key of Object.keys(node)) {
        if (key.includes(".")) { ignored.push({ path: prefix ? prefix + "." + key : key, reason: "unknown setting" }); continue; }   // (the shape is the record's: no dotted keys)
        const path = prefix ? prefix + "." + key : key, value = node[key], s = BY_PATH.get(path);
        if (s) {
          const why = problem(s, value);
          if (why) { ignored.push({ path, reason: why }); continue; }
          const to = clean(s, value), from = read(prefs, path);
          if (same(from, to)) { unchanged.push(path); continue; }
          write(prefs, path, to);
          applied.push({ path, from, to });
        } else if (GROUPS.has(path)) {
          if (plain(value)) walk(value, path); else ignored.push({ path, reason: "must be an object" });
        } else ignored.push({ path, reason: "unknown setting" });
      }
    })(patch, "");
    return { prefs, applied, unchanged, ignored };
  }

  // ---- presets --------------------------------------------------------------------------------------------------------------------------
  // The patch that sets the rows `pick` gives a value for, and nothing else.
  const patchOf = (pick) => { const out = {}; for (const s of SETTINGS) { const v = pick(s); if (v !== undefined) write(out, s.path, v); } return out; };
  const aPart = (s) => s.kind === "bool" && /^(roles|rows|panel)\./.test(s.path) && !s.path.startsWith("panel.filters.pills.");

  // Ready-made patches (the settings page offers them; each is applied like any other patch, and a test keeps them valid).
  const PRESETS = {
    // everything the extension can show; the choice of network use (semanticScholar) and the language are not touched
    all: patchOf((s) => (aPart(s) ? true : s.path.startsWith("hide.") ? false : { "rows.style": "full", "rows.prefer": "both", "panel.marks.grouping": "separate", mergeDuplicates: true, autoLoad: true }[s.path])),
    // the papers where you are the last author
    last: { roles: { first: false, cofirst: false, second: false, last: true }, rows: { style: "full" } },
    // the papers where you are first or co-first author
    first: { roles: { first: true, cofirst: true, second: false, last: false }, rows: { style: "full" } },
    // the page with the least added: tinted rows, the search and the citation totals only
    minimal: {
      rows: { style: "tint" },
      hide: { citedTable: true, access: true },
      panel: { show: true, table: { show: false }, copy: { show: false }, marks: { show: false }, filters: { show: true }, metrics: { show: true }, years: { show: false }, venues: { show: false }, status: { show: false }, names: { show: false } }
    }
  };

  // Ready-made looks for the chips (the settings page has a button for each; a patch like any other, kept valid by a test). Each names every chip setting, so that it
  // replaces the look that was there.
  const NO_COLORS = { ccf: "", core: "", award: "", talk: "" };
  const CHIP_THEMES = [
    { id: "outline", name: "optChipOutline", patch: { chips: { style: "outline", shape: "pill", label: "full" }, colors: NO_COLORS } },
    { id: "soft", name: "optChipSoft", patch: { chips: { style: "soft", shape: "pill", label: "full" }, colors: NO_COLORS } },
    { id: "solid", name: "optChipSolid", patch: { chips: { style: "solid", shape: "pill", label: "full" }, colors: NO_COLORS } },
    { id: "text", name: "optChipText", patch: { chips: { style: "text", shape: "pill", label: "tier" }, colors: NO_COLORS } },
    { id: "lists", name: "optChipThemeLists", patch: { chips: { style: "soft", shape: "pill", label: "full" }, colors: { ccf: "#2563eb", core: "#0d9488", award: "#d97706", talk: "#7c3aed" } } },
    { id: "mono", name: "optChipThemeMono", patch: { chips: { style: "soft", shape: "square", label: "full" }, colors: { ccf: "#475569", core: "#475569", award: "#475569", talk: "#475569" } } }
  ];

  function normalizeUi(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    return { collapsed: r.collapsed === true, source: RANKS.includes(r.source) ? r.source : null };          // (null: no tab picked on this device yet — the one the settings prefer comes first)
  }

  // ---- what is drawn --------------------------------------------------------------------------------------------------------------------
  // A rank list is drawn where a chip or a table tab shows it; a kind of mark where a chip or a count row does. What nothing draws is also left out of the search and
  // of the exports: "what you see is what you search and copy".
  const listShown = (prefs, list) => !!(prefs.rows[list] || (prefs.panel.table.show && prefs.panel.table[list]));
  const lists = (prefs) => ({ ccf: listShown(prefs, "ccf"), core: listShown(prefs, "core") });
  // a best-paper finalist belongs to the awards (it is the same kind of news); each talk level has its own switch
  const markKey = (group) => (group === "finalist" ? "award" : group);
  const markShown = (prefs, group) => { const k = markKey(group); return !!(prefs.rows[k] || (prefs.panel.marks.show && prefs.panel.marks[k])); };
  const visibleMarks = (prefs, marks) => (marks || []).filter((m) => markShown(prefs, m.group));              // for the search and the exports
  const chipMarks = (prefs, marks) => (marks || []).filter((m) => !!prefs.rows[markKey(m.group)]);            // for the chips on the rows
  // (the part's own switch too: with the "Awards & talks" part off nothing of it is counted in the panel, the popup or a copied summary — what you see is what you copy)
  const panelMarks = (prefs, marks) => (prefs.panel.marks.show ? (marks || []).filter((m) => !!prefs.panel.marks[markKey(m.group)]) : []);    // for the counts in the panel and the popup

  // The quick filters that are drawn, in their order: those switched on that can find something (a rank list or a kind of mark that nothing draws finds nothing)
  function pills(prefs) {
    const l = lists(prefs), finds = { ccfA: l.ccf, coreA: l.core, award: markShown(prefs, "award"), talk: ["oral", "spotlight", "highlight"].some((g) => markShown(prefs, g)) };
    const readable = (id) => !SEARCHES.includes(id) || (query.searchParts(prefs.panel.filters.searches[id]).length > 0 && !query.parse(prefs.panel.filters.searches[id]).errors.length);
    return prefs.panel.filters.pills.order.filter((id) => prefs.panel.filters.pills[id] && finds[id] !== false && readable(id));
  }
  // What stays of a search when there is no search box to show it: the words of the quick filters that are drawn — a built-in one's value, and all the words of one of
  // your own while all of them are there — so that every word left is a pressed button that can take it off again
  function quickOnly(prefs, q) {
    const keep = new Set();
    for (const id of pills(prefs)) {
      const w = pillWords(prefs, id);
      if (!SEARCHES.includes(id)) keep.add(w);
      else if (query.hasAll(q, w)) for (const p of query.searchParts(w)) keep.add(p);
    }
    return query.keepOnly(q, keep);
  }

  // CCF and CORE rank much the same venues: where both rank one and a list is preferred (`rows.prefer`), that list is the winner and the other is drawn only where the winner has no
  // rank for the venue. Only between lists that are drawn (`drawn`: { ccf, core }; a list that nothing draws is not left out in favour of one that is) — and a preferred list whose
  // chip is off is no winner where the other has one: a list whose chip is off is never kept over one whose chip is on, in the chips and in what is counted and copied alike.
  const winner = (prefs, drawn = lists(prefs)) => {
    const w = prefs.rows.prefer;
    if (!drawn.ccf || !drawn.core || w === "both") return null;
    return (prefs.rows.ccf || prefs.rows.core) && !prefs.rows[w] ? null : w;
  };
  // The lists whose rank a chip is drawn for on a paper's venue line: those that rank the venue and have a chip switched on — the winner alone where it ranks the venue.
  // `venue`: { ccf, core } (the ranks, or nothing). The lists that rank it and are left out in favour of the winner are `hidden` (the chip's tooltip names them).
  function chipLists(prefs, venue) {
    const v = venue || {}, drawn = { ccf: !!prefs.rows.ccf, core: !!prefs.rows.core };
    const ranked = RANKS.filter((k) => drawn[k] && v[k]), w = winner(prefs, drawn);
    const shown = w && ranked.includes(w) ? [w] : ranked;
    return { shown, hidden: ranked.filter((k) => !shown.includes(k)) };
  }

  // The rank lists the table has a tab for, and the one it uses: the remembered one if it is on, otherwise the one the settings prefer (`rows.prefer`) if the table has a tab for it, otherwise the first that is, otherwise none (the table then shows roles only).
  // While the table is not drawn the summary and the exports are counted by the lists the rows' chips show: what you see is what you copy.
  const sources = (prefs) => RANKS.filter((k) => (prefs.panel.table.show ? prefs.panel.table[k] : prefs.rows[k]));
  function source(prefs, ui) {
    const on = sources(prefs);
    return on.includes(ui.source) ? ui.source : on.includes(prefs.rows.prefer) ? prefs.rows.prefer : on[0] || null;
  }

  // The copy buttons that are switched on, in the order the panel and the popup draw them.
  const copyButtons = (prefs) => prefs.panel.copy.order.filter((k) => prefs.panel.copy[k]);

  return { ROLES, RANKS, MARK_GROUPS, COPY_BUTTONS, HIDE_PARTS, SECTIONS, PILLS, PILL_OPERATORS, SEARCHES, SEARCH_MAX, pillWords, NAMES, NAME_MAX, CARDS, SETTINGS, PRESETS, CHIP_THEMES, defaults, normalize, normalizeUi, flatten, apply, SYNC_LIMIT, sizeOf, cleanName: (v) => clean({ kind: "text" }, v),
    lists, winner, chipLists, markShown, visibleMarks, chipMarks, panelMarks, pills, quickOnly, sources, source, copyButtons };
});
