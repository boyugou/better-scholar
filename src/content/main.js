// Content-script entry: wires the Scholar page, the analysis libraries and the panel.
// Runs on Google Scholar profile pages only (the manifest matches /citations*, and
// isProfile() double-checks — author-search and citation pages are left alone).
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  if (!B || !B.scholar || !B.data || !B.data.ccf || !B.data.core || !B.scholar.isProfile()) return;

  const { venues, analysis, metrics, marks, names, formats, chips: chip } = B;
  const { h, t, copyText, frame } = B.dom;
  const td = B.dom.tDefault;                       // (the exports keep the language's own words, not the names the person gave things on the screen)
  await B.dom.useLanguage();

  const profileId = B.scholar.profileId();
  const headerName = B.scholar.ownerName();
  let prefs = await B.store.loadPrefs();          // what to show: written by the settings page
  B.dom.setLabels(prefs.labels);
  const ui = await B.store.loadUi();              // { collapsed, source }: written here
  let variants = await B.store.loadVariants(profileId);
  const resolvedCache = await B.store.loadResolved();

  const resolver = venues.createResolver({ ccf: B.data.ccf.venues, core: B.data.core.venues, aliases: B.aliases });
  // venue names/acronyms the dataset knows, so "(Interspeech 2022 Oral)" in a title reads as a marker
  const venueWords = new Set([...B.data.ccf.venues.map((v) => v.abbr), ...B.data.core.venues.map((v) => v.acronym)].filter(Boolean).map((w) => w.toLowerCase()));
  const venueWord = (w) => venueWords.has(w);
  // award-winning papers (bundled list); optional — without it only the authors' own words count
  const awards = B.awards && B.data.awards ? B.awards.createIndex(B.data.awards.items) : null;
  const edition = { ccf: B.data.ccf.meta.label, core: B.data.core.meta.label };

  const state = {
    rows: [],                                   // { raw, a: analysis, highlighted }
    selection: null,                            // matrix cell / row / column filter
    venueKey: null,                             // a venue of the panel's venue list: only its papers are shown
    markGroup: null,                            // 'award' | 'oral' | 'spotlight' | 'highlight' filter
    filters: { onlyHighlighted: false, yearStart: null, yearEnd: null, query: "", minCitations: null, impact: null },     // impact: null | "h" | "i10" — the highlighted papers behind that number
    searchCursor: -1,
    venuesExpanded: false,
    loadingAll: false,
    complete: false,                            // the whole list is here (see listComplete)
    loadMessage: "",                           // why loading the rest of the list stopped, when it was not asked to
    resolving: null,                            // { done, total }
    resolveMessage: ""
  };
  let loadAbort = null, loadOrigin = "", restartAuto = false, resolveAbort = null;       // loadOrigin: "auto" (the setting started it) or "manual" (Load all)

  // What the rows say about the owner's spelling (see names.suggestVariants): the profile name in the other order is used at
  // once when it finds the owner and the name as printed hardly does; other rearrangements ("SY Philip") are only offered.
  let hints = { auto: [], suggestions: [] };
  const owner = () => ({ name: headerName, alternates: [...variants, ...hints.auto.map((v) => v.name)] });
  // true when the automatic spellings changed (the rows must then be analysed again)
  function updateHints() {
    const next = names.suggestVariants(state.rows.map((r) => (resolvedCache[r.raw.id] && resolvedCache[r.raw.id].authors) || r.raw.authorsText), { name: headerName, alternates: variants });
    const key = (x) => x.auto.map((v) => v.name).join("|");
    const changed = key(next) !== key(hints);
    hints = next;
    return changed;
  }
  const analyzeRaw = (raw) => analysis.analyzeRow(raw, { owner: owner(), resolver, resolved: resolvedCache[raw.id], venueWord, awards });
  // the ranking the panel's table uses (null when both lists are switched off)
  const currentSource = () => B.prefs.source(prefs, ui);
  // Is the whole list here? Only when the page offered nothing more at the start, our loader ran to its end ("done"), or rows came that the loader did not ask for and
  // Scholar's button stayed off (checkComplete): after a cancel or a stall the button can be disabled just because a request is still in flight, which says nothing.
  const listComplete = () => state.complete && !state.loadingAll && !B.scholar.canLoadMore();
  // Nothing on the profile is on a list that is switched on (a biologist's, say) and nothing more is coming: the tier columns and the switch between the lists
  // would be empty, so the table is by role only (the model says so in `noRanks`; the lists that are on stay in `sources`, for the note)
  function noRanks(list) {
    const on = B.prefs.sources(prefs);
    return on.length > 0 && list.length > 0 && listComplete() && !on.some((s) => list.some((p) => p.venue && p.venue[s]));
  }

  // ---- rows ---------------------------------------------------------------

  function ingest() {
    const known = new Set(state.rows.map((r) => r.raw.tr));
    let added = false;
    for (const tr of B.scholar.rowElements()) {
      if (known.has(tr)) continue;
      const raw = B.scholar.readRow(tr);
      state.rows.push({ raw, a: analyzeRaw(raw), highlighted: false });
      added = true;
    }
    state.rows = state.rows.filter((r) => r.raw.tr.isConnected);
    if (added && updateHints()) reanalyze();
    return added;
  }

  // ---- duplicates: with the setting on, an entry that repeats another is hidden and the most cited one shows the total -------------

  const dupEntry = (r) => ({ key: r.dupKey !== undefined ? r.dupKey : (r.dupKey = B.duplicates.key(r.raw.title, r.raw.authorsText)), citations: r.raw.citations });
  const live = () => state.rows.filter((r) => !r.dupHidden);
  function applyMerge() {
    const on = prefs.mergeDuplicates;
    const plan = on ? B.duplicates.plan(state.rows.map(dupEntry)) : null;
    state.rows.forEach((r, i) => {
      r.dupHidden = !!plan && !plan.keep[i];
      r.shown = plan ? plan.citations[i] : r.raw.citations;
      r.raw.tr.classList.toggle("rr-dup", r.dupHidden);
      const link = r.raw.tr.querySelector("td.gsc_a_c a");
      if (!link) return;
      const merged = plan ? plan.merged[i] : 1;
      if (merged > 1) {
        link.textContent = String(plan.citations[i]);
        link.title = t("mergedTip", [String(merged)]);
        link.classList.add("rr-merged");
      } else if (link.classList.contains("rr-merged")) {                                // no longer merged: Scholar's own number and no tooltip
        link.textContent = String(r.raw.citations || "");
        link.removeAttribute("title");
        link.classList.remove("rr-merged");
      }
    });
  }

  const reanalyze = () => state.rows.forEach((r) => { r.a = analyzeRaw(r.raw); });
  // the spelling list or the author lists changed: look again at what the rows say, then analyse every row
  const rehint = () => { updateHints(); reanalyze(); };

  // ---- decoration ---------------------------------------------------------

  const ROLE_NAME = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast" };   // "First author", …

  // "First author · position 1 of 8": the tooltip on the marked name (or on the author line when no name is marked).
  function roleTip(a) {
    const pos = a.index + 1;
    const total = a.authorCount + (a.truncated ? "+" : "");
    return `${t(ROLE_NAME[a.role])} · ${t("tipPosition", [String(pos), String(total)])}${a.fromDetail ? " · " + t("tipFromPage") : ""}`;
  }

  // Wrap the owner's name in the authors line (Range-free: rebuild the text node) and carry the role in a tooltip.
  function markName(row) {
    const el = row.raw.authorsEl;
    if (!el) return;
    if (el.dataset.rrOrig !== undefined) { el.textContent = el.dataset.rrOrig; delete el.dataset.rrOrig; }
    if (el.dataset.rrTip !== undefined) { el.removeAttribute("title"); delete el.dataset.rrTip; }
    if (!row.highlighted) return;
    const tip = roleTip(row.a);
    const tipOnLine = () => { el.title = tip; el.dataset.rrTip = ""; };
    if (!prefs.rows.name || row.a.fromDetail) return tipOnLine();
    const text = el.textContent;
    let cursor = 0, pos = -1;
    row.a.tokens.forEach((tok, i) => {
      const at = text.indexOf(tok.name, cursor);
      if (at >= 0) { if (i === row.a.index) pos = at; cursor = at + tok.name.length; }
    });
    if (pos < 0) return tipOnLine();
    const nameLen = row.a.tokens[row.a.index].name.length;
    el.dataset.rrOrig = text;
    el.replaceChildren(text.slice(0, pos), h("span", { class: "rr-name rr-name-" + row.a.role, title: tip }, text.slice(pos, pos + nameLen)), text.slice(pos + nameLen));
  }

  // What decorate() draws on a row, as a string: when it is the same as last time nothing is touched (a long list is decorated once, not once per batch)
  let namesSig = "";                                                                        // (the person's own names, as set at the last refresh: the chips' words are among them)
  function decorKey(row) {
    const a = row.a, v = a.venue || {};
    return [namesSig, analysis.isHighlighted(a, prefs.roles), a.role, a.index, a.tokens ? a.tokens.length : 0, a.fromDetail, prefs.rows.name, prefs.rows.ccf && v.ccf ? v.ccf.tier + v.ccf.name : "", prefs.rows.core && v.core ? v.core.rank + v.core.name : "",
      B.prefs.chipMarks(prefs, a.marks).map((m) => m.kind + m.source + (m.venue || "") + (m.year || "") + (m.text || "")).join(","), prefs.roles.first, prefs.roles.cofirst, prefs.roles.second, prefs.roles.last,
      row.raw.authorsEl ? row.raw.authorsEl.isConnected : 0, row.raw.venueEl ? row.raw.venueEl.querySelector(":scope > .rr-chips") !== null : 0].join("|");
  }

  function decorate(row) {
    const key = decorKey(row);
    if (row.decorKey === key) return;
    row.decorKey = key;
    const { tr, venueEl } = row.raw;
    const a = row.a;
    row.highlighted = analysis.isHighlighted(a, prefs.roles);
    for (const r of analysis.ROLE_KEYS) tr.classList.toggle("rr-r-" + r, row.highlighted && a.role === r);
    if (venueEl) {
      venueEl.querySelectorAll(":scope > .rr-chips").forEach((n) => {
        const before = n.previousSibling;
        if (before && before.rrSpace) before.remove();                                       // (the space put before the chips)
        n.remove();
      });
      const chips = [];
      if (prefs.rows.ccf && a.venue.ccf) chips.push(chip.tierChip("ccf", a.venue.ccf, edition.ccf));
      if (prefs.rows.core && a.venue.core) chips.push(chip.tierChip("core", a.venue.core, edition.core));
      for (const m of B.prefs.chipMarks(prefs, a.marks)) chips.push(chip.markChip(m));
      if (chips.length) {
        // the chips of a row stay together (they wrap to the next line as one) and start at the text's edge there: a real space before them, no margin
        const space = document.createTextNode(" ");
        space.rrSpace = true;
        venueEl.append(space, h("span", { class: "rr-chips" }, chips.flatMap((c, i) => (i ? [" ", c] : [c]))));
      }
    }
    markName(row);
  }

  // The search box's query, compiled once per query (and per set of marks that count)
  let compiled = { key: null, matcher: null };
  function matcher() {
    const lists = B.prefs.lists(prefs);
    const key = state.filters.query + "\u0000" + B.prefs.MARK_GROUPS.map((g) => (B.prefs.markShown(prefs, g) ? 1 : 0)).join("") + (lists.ccf ? "c" : "-") + (lists.core ? "c" : "-");
    if (compiled.key !== key) compiled = { key, matcher: analysis.queryMatcher(state.filters.query, (row) => B.prefs.visibleMarks(prefs, row.a.marks), lists) };
    return compiled.matcher;
  }

  // The impact filter (the h-index and i10 buttons of the panel) shows the highlighted papers behind the number: at least h citations, h being the h-index of the
  // highlighted papers the other filters let through; at least 10 for i10. 0: no such filter.
  // (an h-index of 0 means no highlighted paper has a citation: the filter then shows nothing, so the minimum is one citation, which none of them has)
const impactMin = (source) => (state.filters.impact === "h" ? Math.max(1, metrics.citationMetrics(scoped(source, { skipImpact: true })).highlighted.h) : state.filters.impact === "i10" ? 10 : 0);

  // Do the filters let this row through? `skipVenue`: leave the venue choice out (the venue list is not narrowed by its own choice).
  function passes(row, source, min, { skipVenue = false } = {}) {
    const f = state.filters, a = row.a;
    if (a.year != null) {
      if (f.yearStart != null && a.year < f.yearStart) return false;
      if (f.yearEnd != null && a.year > f.yearEnd) return false;
    }
    if (f.query && !matcher().test(row)) return false;
    if (f.minCitations != null && row.shown < f.minCitations) return false;
    if (min && !(row.highlighted && row.shown >= min)) return false;
    if (state.markGroup && !marks.inGroup({ marks: B.prefs.panelMarks(prefs, a.marks) }, state.markGroup)) return false;
    if (!skipVenue && state.venueKey && metrics.venueKey(a.venue, B.prefs.lists(prefs)) !== state.venueKey) return false;
    if (state.selection && !metrics.inSelection({ status: a.status, role: a.role, venue: a.venue }, state.selection, source)) return false;
    return true;
  }

  function applyFilters() {
    const source = currentSource(), min = impactMin(source);
    for (const row of live()) {
      const hide = (state.filters.onlyHighlighted && !row.highlighted) || (state.venueKey && !row.highlighted) || !passes(row, source, min);
      row.raw.tr.classList.toggle("rr-hide", !!hide);
    }
  }

  // ---- panel model --------------------------------------------------------

  const paperOf = (r) => ({
    status: r.a.status, role: r.a.role, venue: r.a.venue, venueText: r.a.venueText,
    citations: r.shown, year: r.a.year, highlighted: r.highlighted
  });
  function papers() {
    return live().map(paperOf);
  }

  // Papers per award / talk group among the papers that are the profile owner's (a paper the owner is not
  // on, per its full author list, is not counted) — only the groups whose count row the settings page has switched on.
  // The award kinds behind the "Awards" count (only when that row is switched on)
  function markKinds() {
    return prefs.panel.marks.award ? marks.summarizeKinds(live().filter((r) => r.a.status !== "absent").map((r) => ({ marks: B.prefs.panelMarks(prefs, r.a.marks) }))) : {};
  }

  function markCounts() {
    return marks.summarize(live().filter((r) => r.a.status !== "absent").map((r) => ({ marks: B.prefs.panelMarks(prefs, r.a.marks) })), prefs.panel.marks.grouping);
  }

  // Most rows without an author line means Scholar's markup moved under us.
  const layoutBroken = () => state.rows.length >= 5 && state.rows.filter((r) => !r.raw.authorsText.trim()).length / state.rows.length >= 0.5;

  // is any filter narrowing the list (a matrix cell, a group, a venue, "only highlighted", a year range, or a search query)?
  const filtering = () => !!(state.selection || state.markGroup || state.venueKey || state.filters.onlyHighlighted || state.filters.yearStart != null || state.filters.yearEnd != null || state.filters.query || state.filters.minCitations != null || state.filters.impact);

  // The numbers under the filters follow the filters: the year range, an awards row, a matrix cell and a venue narrow what is counted. The table
  // itself stays whole (it is where a cell is chosen), and so do the year bars (the range is chosen against them); the venue list is not narrowed by its own choice.
  function scoped(source, { skipVenue = false, skipImpact = false } = {}) {
    const min = skipImpact ? 0 : impactMin(source);
    return live().filter((r) => passes(r, source, min, { skipVenue })).map(paperOf);
  }

  // The venue list: the venues of the papers the other filters let through, most papers first, and always the chosen venue (a pressed row, so that the
  // filter can be undone) even when the other filters leave it out of the first few
  function venueList(source) {
    const max = state.venuesExpanded ? 24 : 6;
    const list = metrics.topVenues(scoped(source, { skipVenue: true }), max, B.prefs.lists(prefs));
    if (state.venueKey && !list.some((v) => v.key === state.venueKey)) {
      const mine = metrics.topVenues(scoped(source), 99, B.prefs.lists(prefs)).find((v) => v.key === state.venueKey);
      list.push({ key: state.venueKey, count: mine ? mine.count : 0, name: mine ? mine.name : state.venueKey, ccf: mine ? mine.ccf : null, core: mine ? mine.core : null });
    }
    return list;
  }

  function model() {
    const list = papers();
    const source = currentSource();
    const bare = noRanks(list);
    const yearBars = metrics.yearBars(list);
    const summary = metrics.summarize(list, bare ? null : source);
    const allVenues = metrics.topVenues(scoped(source, { skipVenue: true }), 99, B.prefs.lists(prefs));
    return {
      ownerName: headerName, edition, prefs, ui, sources: B.prefs.sources(prefs), source, summary, noRanks: bare,
      selection: state.selection, filters: state.filters,
      searchMatch: matcher().empty ? null : { count: shownRows().length, cursor: state.searchCursor, errors: matcher().errors },
      filterBar: filtering() ? { shown: shownRows().length, total: live().length, impact: state.filters.impact ? { kind: state.filters.impact, min: impactMin(source) } : null } : null,
      marks: markCounts(), markKinds: markKinds(), markGroup: state.markGroup,
      years: Array.from(new Set(list.map((p) => p.year).filter((y) => y != null))).sort((a, b) => b - a),
      metrics: { highlighted: metrics.citationMetrics(scoped(source, { skipImpact: true })).highlighted, all: metrics.citationMetrics(list).all },
      byYear: yearBars.bars, byYearOlder: yearBars.older,
      topVenues: venueList(source), venueKey: state.venueKey,
      venuesHasMore: allVenues.length > 6, venuesExpanded: state.venuesExpanded,
      coverage: {
        loaded: list.length, canLoadMore: B.scholar.canLoadMore(), complete: listComplete(), loadingAll: state.loadingAll, loadMessage: state.loadMessage,
        repeats: prefs.mergeDuplicates ? 0 : B.duplicates.plan(state.rows.map(dupEntry)).keep.filter((k) => !k).length,
        hidden: summary.hidden, absent: summary.absent, resolving: state.resolving, resolveMessage: state.resolveMessage, layoutBroken: layoutBroken(),
        unmatched: metrics.unmatchedVenues(list)
      },
      variants, nameHints: hints
    };
  }

  // ---- panel + callbacks ---------------------------------------------------

  const copyLabels = () => ({
    first: t("copyFirst"), cofirst: t("copyCofirst"), second: t("copySecond"), last: t("copyLast"), middle: t("copyMiddle")
  });

  const MARK_KEY = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight", "spotlight+highlight": "markSpotlightHighlight", "oral+spotlight+highlight": "markTalks" };
  const marksLine = (counts) => {
    const parts = marks.rows(prefs.panel.marks.grouping).filter((g) => counts[g]).map((g) => td(MARK_KEY[g]) + " " + counts[g]);
    return parts.length ? td("marksTitle") + ": " + parts.join(", ") + " (" + td("marksAsWritten") + ")" : "";
  };

  // ---- what the page shows, as records and as text --------------------------------------------------------------------------------------------
  // The papers the page shows now (the filters count) as plain records: what every copy button, the toolbar popup and the page-event calls are made from
  // (the shape is described at the top of lib/formats.js).
  const isShown = (r) => !r.raw.tr.classList.contains("rr-hide");
  const shownRows = (filtered = true) => (filtered ? live().filter(isShown) : live());
  const markLabels = (a) => B.prefs.visibleMarks(prefs, a.marks).map((m) => B.chips.markLabel(m, true) + (m.source === "list" && m.venue ? ` (${m.venue} ${m.year})` : ""));
  const KIND = { C: "conference", J: "journal" };
  function paperRecords(filtered = true) {
    const shown = B.prefs.lists(prefs);
    return shownRows(filtered).map((r) => {
      const a = r.a, v = a.venue || {}, resolved = resolvedCache[r.raw.id];
      return {
        id: r.raw.id, title: r.raw.title,
        authors: (resolved && resolved.authors) || r.raw.authorsText,                // (the whole list once "Read full lists" has read it)
        me: a.status === "found" && a.tokens && a.tokens[a.index] ? a.tokens[a.index].name : "",           // (the owner's name as the author line prints it)
        venue: (resolved && resolved.venue) || r.raw.venueText,
        year: a.year, citations: r.shown, role: a.role, status: a.status, highlighted: r.highlighted,
        type: KIND[(v.ccf && v.ccf.kind) || (v.core && v.core.kind)] || null,
        rank: { ccf: shown.ccf && v.ccf ? { tier: v.ccf.tier, name: v.ccf.name } : null, core: shown.core && v.core ? { rank: v.core.rank, name: v.core.name } : null },
        marks: markLabels(a),
        url: r.raw.href ? new URL(r.raw.href, location.origin).href : ""
      };
    });
  }

  const tableLabels = () => ({ year: t("tsvYear"), title: t("tsvTitle"), authors: t("tsvAuthors"), role: t("tsvRole"), venue: t("tsvVenue"), ccf: t("srcCcf"), core: t("srcCore"),
    awards: t("tsvAwards"), citations: t("tsvCitations"), hidden: td("roleHidden"), roles: copyLabels() });

  // The summary of the papers by role and rank, from the list the panel counts. `source`: the ranking it uses (default: the panel's own; "none": by role only).
  function summaryOf(source) {
    const list = papers(), fallback = noRanks(list) ? null : currentSource();
    const src = source === undefined ? fallback : source === "none" ? null : B.prefs.lists(prefs)[source] ? source : fallback;           // (a list that nothing draws is not used)
    return { summary: metrics.summarize(list, src), src };
  }
  const summaryWords = () => ({ label: copyLabels(), header: t("tsvRole"), total: t("tsvTotal"), notRanked: td("tipUnranked") });

  // The text of one copy button; the button's name is the format (lib/prefs.js COPY_BUTTONS). `source`: the ranking the summary and the table use
  // (default: the panel's own; "none": by role only).
  function exportText(kind, { source } = {}) {
    const ctx = { ccfOn: B.prefs.lists(prefs).ccf, coreOn: B.prefs.lists(prefs).core };
    if (kind === "summary" || kind === "table") {
      const { summary, src } = summaryOf(source);
      return kind === "table"
        ? formats.summaryTsv(summary, summaryWords())
        : formats.summaryText(summary, { owner: headerName, label: copyLabels(), notRanked: td("tipUnranked").toLowerCase(), extra: [marksLine(markCounts())].filter(Boolean),
          edition: src ? `${edition[src]} — ${t("tipToday")}` : "" });
    }
    const records = paperRecords();
    switch (kind) {
      case "papers": return formats.papersTsv(records, { labels: tableLabels(), ...ctx });
      case "csv": return formats.papersCsv(records, { labels: tableLabels(), ...ctx });
      case "bibtex": return formats.bibtex(records, ctx);
      case "markdown": return formats.markdown(records, ctx);
      case "apa": return formats.apa(records);
      default: return formats.json({ owner: headerName, source: currentSource(), papers: records });          // "json" (a call's format is checked before it gets here)
    }
  }

  // The second flavour of a copy button, for a word processor: a real table for the table and the papers, real italics for APA; "" for the others (their text is the whole of it)
  function exportHtml(kind, { source } = {}) {
    if (kind === "table") return formats.summaryHtml(summaryOf(source).summary, summaryWords());
    if (kind === "papers") return formats.papersHtml(paperRecords(), { labels: tableLabels(), ccfOn: B.prefs.lists(prefs).ccf, coreOn: B.prefs.lists(prefs).core, markMe: !!prefs.rows.name });
    if (kind === "apa") return formats.apaHtml(paperRecords());
    return "";
  }

  // A copy button pressed: the text goes to the clipboard, or (CSV) to a file; what there is to say is said on the button
  async function deliver(kind) {
    if (kind !== "summary" && kind !== "table" && !shownRows().length) { panel.flash(kind, "empty"); return; }          // (the filters leave no paper: nothing to put on the clipboard)
    const text = exportText(kind);
    if (kind === "csv") {
      const safe = (headerName || "scholar").trim().replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_");
      B.dom.downloadFile((safe || "scholar") + "-papers.csv", text);
      panel.flash(kind);
    } else if (await copyText(text, exportHtml(kind))) panel.flash(kind);
  }

  function clearFocusedRow() {
    document.querySelectorAll("tr.gsc_a_tr.rr-row-focused").forEach((tr) => tr.classList.remove("rr-row-focused"));
  }

  function stepSearchMatch(direction) {
    const visible = live().filter((r) => !r.raw.tr.classList.contains("rr-hide"));
    if (!visible.length) return;
    if (state.searchCursor < 0) {
      state.searchCursor = direction > 0 ? 0 : visible.length - 1;
    } else {
      state.searchCursor = (state.searchCursor + direction + visible.length) % visible.length;
    }
    clearFocusedRow();
    const target = visible[state.searchCursor];
    if (target && target.raw.tr) {
      target.raw.tr.classList.add("rr-row-focused");
      target.raw.tr.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    }
    panel.update(model());
  }

  function clearAllFilters() {
    state.selection = null; state.markGroup = null; state.venueKey = null;
    Object.assign(state.filters, { onlyHighlighted: false, yearStart: null, yearEnd: null, query: "", minCitations: null, impact: null });
    state.searchCursor = -1; clearFocusedRow();
    refresh();
  }

  const panel = B.panel.create({
    onCollapse() { ui.collapsed = !ui.collapsed; B.store.saveUi(ui); refresh(); },
    onSource(src) { ui.source = src; state.selection = null; B.store.saveUi(ui); refresh(); },
    // a content script cannot open the options page itself; the service worker does it on request
    onSettings() { try { chrome.runtime.sendMessage({ type: "rr:options" }); } catch (e) { /* extension context gone */ } },
    // a venue of the unranked list, explained on the settings page (its "Check a venue", with the text in it)
    async onCheckVenue(text) { await B.store.askVenue(text); this.onSettings(); },
    onSelect(sel) {
      const same = state.selection && state.selection.role === sel.role && state.selection.tier === sel.tier;
      state.selection = same || (sel.role === undefined && sel.tier === undefined) ? null : sel;
      state.searchCursor = -1; clearFocusedRow();
      refresh();
    },
    // every filter off at once (the panel's bar says how many papers are shown and offers this)
    onClearFilters() { clearAllFilters(); },
    onVenue(k) { state.venueKey = state.venueKey === k ? null : k; state.searchCursor = -1; clearFocusedRow(); refresh(); },
    onToggleVenues() { state.venuesExpanded = !state.venuesExpanded; refresh(); },
    onMarkGroup(g) { state.markGroup = state.markGroup === g ? null : g; state.searchCursor = -1; clearFocusedRow(); refresh(); },
    onOnly(on) { state.filters.onlyHighlighted = on; state.searchCursor = -1; clearFocusedRow(); refresh(); },
    onImpact(kind) { state.filters.impact = state.filters.impact === kind ? null : kind; state.searchCursor = -1; clearFocusedRow(); refresh(); },
    onQuery(q) {
      state.filters.query = (q || "").trim();
      state.searchCursor = -1; clearFocusedRow();
      refresh();
    },
    onSearchNext(dir) { stepSearchMatch(dir); },
    onYear(start, end) {
      state.filters.yearStart = start === "" ? null : parseInt(start, 10);
      state.filters.yearEnd = end === "" ? null : parseInt(end, 10);
      state.searchCursor = -1; clearFocusedRow();
      refresh();
    },
    onCopy(kind) { return deliver(kind); },
    onLoadAll() { return startLoad("manual"); },
    onCancelLoad() { if (loadAbort) loadAbort.abort(); },
    onCopyUnmatched() { return copyText(metrics.unmatchedVenues(papers()).map((u) => `${u.count}× ${u.venue}`).join("\n")); },
    async onResolve() {
      if (state.resolving) return;
      const items = state.rows
        .filter((r) => !r.dupHidden && analysis.needsDetail(r.a) && r.raw.id && r.raw.href)
        .sort((x, y) => y.a.citations - x.a.citations)
        .map((r) => ({ id: r.raw.id, href: r.raw.href, title: r.raw.title, authorsText: r.raw.authorsText, year: r.raw.year }));
      if (!items.length) return;
      resolveAbort = new AbortController();
      state.resolving = { done: 0, total: items.length };
      state.resolveMessage = "";
      refresh();
      const res = await B.detail.resolveAll(items, resolvedCache, {
        signal: resolveAbort.signal, semantic: () => prefs.semanticScholar,
        onProgress: (done, total) => { state.resolving = { done, total }; },
        onResult: (id) => {
          const row = state.rows.find((r) => r.raw.id === id);
          if (row) row.a = analyzeRaw(row.raw);
          scheduleRefresh();
        }
      });
      B.store.saveResolved(resolvedCache);
      state.resolving = null;
      resolveAbort = null;
      state.resolveMessage = res.stopped === "captcha" ? t("resolveCaptcha") : res.stopped === "cancelled" ? "" : res.semanticKey ? t("resolveDone") + " " + t("resolveSemanticKey") : res.semanticLimited ? t("resolveDone") + " " + t("resolveSemanticBusy") : t("resolveDone");
      rehint();
      refresh();
    },
    onCancelResolve() { if (resolveAbort) resolveAbort.abort(); },
    onAddVariant(v) {
      if (variants.includes(v)) return;
      variants = [...variants, v].slice(-8);        // at most eight: a ninth replaces the oldest, so adding one always does something
      B.store.saveVariants(profileId, variants);
      rehint();
      refresh();
    },
    onRemoveVariant(v) {
      variants = variants.filter((x) => x !== v);
      B.store.saveVariants(profileId, variants);
      rehint();
      refresh();
    }
  });

  // The rest of the paper list, through Scholar's own "Show more" button (scholar.loadAll): started by itself when the settings say so
  // ("auto" — after a moment, and at the first sign of trouble it gives up) or by the panel's Load all ("manual").
  async function startLoad(origin) {
    if (state.loadingAll || !B.scholar.canLoadMore()) return;
    state.loadingAll = true;
    state.loadMessage = "";
    loadOrigin = origin;
    loadAbort = new AbortController();
    refresh();
    let stopped = "done";
    try {
      stopped = await B.scholar.loadAll({
        signal: loadAbort.signal, startDelay: origin === "auto" ? 1200 : 0, maxStalls: origin === "auto" ? 1 : 2, foregroundOnly: origin === "auto",
        onProgress: () => { ingest(); scheduleRefresh(); }
      });
    } catch (e) {
      stopped = "stalled";                       // Scholar's page is not what it was: say so like any other stop
    } finally {
      state.loadingAll = false;
      loadAbort = null;
      loadOrigin = "";
      ingest();
      if (restartAuto) { restartAuto = false; if (prefs.autoLoad) setTimeout(() => startLoad("auto"), 0); }
      state.loadMessage = stopped === "stalled" ? t("loadStalled", [String(state.rows.length)]) : "";
      if (stopped === "done") state.complete = true;
      refresh();
    }
  }

  function refresh() {
    namesSig = JSON.stringify(prefs.labels);
    applyMerge();
    for (const row of state.rows) decorate(row);
    // a venue filter whose venue cannot be in the panel's list any more (the roles, the merge, the lists or the venue list changed) has no control left to undo it
    // (checked once the rows know whether they are highlighted: after decorate, before the filters are applied)
    if (state.venueKey && !(prefs.panel.venues.show && metrics.topVenues(papers(), 9999, B.prefs.lists(prefs)).some((v) => v.key === state.venueKey))) state.venueKey = null;
    // with no tier columns left (nothing on the profile is ranked) a selection on a tier has no control to undo it
    if (state.selection && state.selection.tier && noRanks(papers())) state.selection = state.selection.role ? { role: state.selection.role, tier: undefined } : null;
    applyFilters();
    panel.el.hidden = !prefs.panel.show;
    if (prefs.panel.show) panel.update(model());
  }
  // Scholar's own blocks the settings ask to hide (a class on <html>, styled in styles.css)
  const prefsHide = (p) => { for (const k of B.prefs.HIDE_PARTS) document.documentElement.classList.toggle("rr-hide-" + k, !!p.hide[k]); };
  prefsHide(prefs);
  B.dom.applyColors(prefs.colors); B.dom.applyRowStyle(prefs.rows.style); B.dom.applyChips(prefs.chips, prefs.colors);
  const scheduleRefresh = frame(refresh);

  // A filter whose control the settings took away must not keep hiding rows (nothing could undo it): when the settings change, the filters left without a
  // control are cleared. (A matrix cell, an awards row, a venue, the search words, "only highlighted", a year, the h-index or i10 papers: each has its own switch.)
  function pruneFilters() {
    const p = prefs.panel, f = state.filters, sel = state.selection;
    if (!p.show) { state.selection = null; state.markGroup = null; state.venueKey = null; Object.assign(f, { onlyHighlighted: false, yearStart: null, yearEnd: null, query: "", minCitations: null, impact: null }); return; }
    if (sel && !(p.table.show && (sel.tier !== "none" || p.table.unranked) && (sel.role !== "middle" || p.table.other) && (sel.role !== "hidden" || p.table.hidden))) state.selection = null;
    if (state.markGroup && !(p.marks.show && marks.rows(p.marks.grouping).includes(state.markGroup) && marks.members(state.markGroup).some((g) => p.marks[g]))) state.markGroup = null;
    if (!p.venues.show) state.venueKey = null;
    if (!(p.filters.show && p.filters.search)) {                                                                                  // (no search box: only the words of the quick filters stay, a button can take them off)
      const keep = p.filters.show ? B.prefs.pills(prefs).map((id) => B.prefs.PILL_OPERATORS[id]) : [];
      f.query = f.query.split(/\s+/).filter((w) => keep.includes(w.toLowerCase())).join(" ");
    }
    if (!p.filters.bar) f.minCitations = null;                                                                                    // (only the filter bar says it is on, and clears it)
    if (!(p.filters.show && p.filters.only) || !Object.values(prefs.roles).some(Boolean)) f.onlyHighlighted = false;          // (with nothing highlighted the filter would hide every row)
    const range = p.filters.show && p.filters.years;
    if (!range && !(p.years.show && f.yearStart === f.yearEnd)) { f.yearStart = null; f.yearEnd = null; }                      // (the year bars can only choose one year)
    if (f.impact && !(p.metrics.show && p.metrics[f.impact])) f.impact = null;
  }

  // The settings page saved something (in this or any other tab): show it at once.
  B.store.onPrefsChanged((next) => {
    if (next.language !== prefs.language || next.scholarLanguage !== prefs.scholarLanguage) { location.reload(); return; }      // the panel's words (or Scholar's) are changed at once by a fresh load
    prefsHide(next);
    B.dom.applyColors(next.colors); B.dom.applyRowStyle(next.rows.style); B.dom.applyChips(next.chips, next.colors);
    B.dom.setLabels(next.labels);
    const before = currentSource();
    const wasAuto = prefs.autoLoad;
    prefs = next;
    if (currentSource() !== before) state.selection = null;                        // its tier belonged to the other ranking
    pruneFilters();
    refresh();
    if (prefs.autoLoad && !wasAuto) { if (state.loadingAll) restartAuto = true; else startLoad("auto"); }                                          // switched on: load the rest of the list now
    else if (!prefs.autoLoad && loadOrigin === "auto" && loadAbort) loadAbort.abort();          // switched off: stop what it began
  });

  // ---- boot ---------------------------------------------------------------

  ingest();
  state.complete = !B.scholar.canLoadMore();                                          // (a profile of up to a hundred papers: Scholar's button is disabled from the start)
  B.scholar.place(panel.el);
  refresh();

  const tbody = B.scholar.tbody();
  // Rows came that our loader did not ask for (the person pressed Scholar's own "Show more", or a cancelled request was answered): once Scholar has had the moment it
  // needs to enable its button again and the button is still off, the whole list is here
  let completeTimer = 0;
  // (a press of the button — the person's or the loader's — starts a request: what a pending check was going to read is stale until that request is answered)
  document.addEventListener("click", (e) => { if (e.target && e.target.closest && e.target.closest("#gsc_bpf_more")) clearTimeout(completeTimer); }, true);
  const checkComplete = () => {
    clearTimeout(completeTimer);
    completeTimer = setTimeout(() => { if (!state.loadingAll && !state.complete && !B.scholar.canLoadMore()) { state.complete = true; refresh(); } }, 1800);
  };
  if (tbody) new MutationObserver(() => { if (ingest()) { scheduleRefresh(); checkComplete(); } }).observe(tbody, { childList: true });
  // (a window that becomes narrow or wide moves the panel above / beside the list; its sections are arranged for that layout, so they are drawn again)
  window.addEventListener("resize", frame(() => {
    const was = panel.el.classList.contains("rr-wide");
    B.scholar.place(panel.el);
    if (panel.el.classList.contains("rr-wide") !== was) refresh();
  }));

  // "/" focuses the search box; Escape clears the filters when nothing else has taken it: not a menu or the search box (which handle their own), nor anything of Scholar's
  // own (its menus and dialogs keep the key), so only a key pressed on the page itself or in the panel counts.
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target instanceof Element ? e.target : document.body;
    const typing = /^(?:input|textarea|select)$/i.test(el.tagName) || el.isContentEditable;
    if (e.key === "/" && !typing) {
      if (!prefs.panel.show || !prefs.panel.filters.show || !prefs.panel.filters.search) return;
      e.preventDefault();
      if (ui.collapsed) { ui.collapsed = false; B.store.saveUi(ui); refresh(); }
      panel.focusSearch();
    } else if (e.key === "Escape" && !typing && (el === document.body || el === document.documentElement || panel.el.contains(el) || el.closest("tr.gsc_a_tr")) && filtering()) {
      e.preventDefault();
      clearAllFilters();
    }
  });

  if (prefs.autoLoad) startLoad("auto");

  // ---- the calls (lib/agent.js has the list and what each takes) ----------------------------------------------------------------------------------
  // Made by the toolbar popup (the extension's own messages) and by scripts on the page (page events): content/bridge.js carries both, after checking the parameters.
  const VERSION = (() => { try { return chrome.runtime.getManifest().version; } catch (e) { return ""; } })();     // (unreadable once the extension was reloaded under an open page)
  const filterState = () => ({ shown: shownRows().length, total: live().length, filters: { ...state.filters }, errors: matcher().errors });
  const methods = {
    ping: () => ({ version: VERSION, owner: headerName, loaded: live().length, complete: listComplete() }),
    summary: () => {
      const list = papers(), source = currentSource();
      return {
        owner: headerName, loaded: list.length, shown: shownRows().length, loadingAll: state.loadingAll, layoutBroken: layoutBroken(), edition,
        noRanks: noRanks(list),
        summaries: { ccf: metrics.summarize(list, "ccf"), core: metrics.summarize(list, "core"), none: metrics.summarize(list, null) },
        marks: markCounts(),
        metrics: { highlighted: metrics.citationMetrics(scoped(source, { skipImpact: true })).highlighted, all: metrics.citationMetrics(list).all }
      };
    },
    papers: ({ filtered = true } = {}) => ({ owner: headerName, total: live().length, papers: paperRecords(filtered) }),
    export: ({ format, source, html }) => ({ format, text: exportText(format, { source }), ...(html ? { html: exportHtml(format, { source }) } : {}) }),
    filter: (p) => {
      // (a filter with no control left to undo it would hide rows for good)
      if (!prefs.panel.show) throw new Error("the panel is off in the settings, so nothing could undo a filter");
      const f = state.filters;
      if ("query" in p) f.query = p.query.trim();
      for (const k of ["onlyHighlighted", "yearStart", "yearEnd", "minCitations", "impact"]) if (k in p) f[k] = p[k];
      if (!Object.values(prefs.roles).some(Boolean)) f.onlyHighlighted = false;           // nothing is highlighted: the filter would hide every row
      state.searchCursor = -1; clearFocusedRow();
      const asked = Object.fromEntries(Object.entries(state.filters).filter(([k]) => k in p));
      pruneFilters();                                                                      // (what the settings leave without a control is not applied, and said so)
      const ignored = Object.keys(asked).filter((k) => asked[k] && state.filters[k] !== asked[k]);
      refresh();
      return { ...filterState(), ignored };
    },
    clearFilters: () => { clearAllFilters(); return filterState(); }
  };
  B.bridge.install(methods);
})();
