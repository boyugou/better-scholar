// Content-script entry: wires the Scholar page, the analysis libraries and the panel.
// Runs on Google Scholar profile pages only (the manifest matches /citations*, and
// isProfile() double-checks — author-search and citation pages are left alone).
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  if (!B || !B.scholar || !B.data || !B.data.ccf || !B.data.core || !B.scholar.isProfile()) return;

  const { venues, analysis, metrics, marks, names, chips: chip } = B;
  const { h, t, copyText, frame } = B.dom;
  await B.dom.useLanguage();

  const profileId = B.scholar.profileId();
  const headerName = B.scholar.ownerName();
  await B.store.migrate();
  let prefs = await B.store.loadPrefs();          // what to show: written by the settings page
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
    filters: { onlyHighlighted: false, yearStart: null, yearEnd: null },
    loadingAll: false,
    complete: false,                            // the whole list is here: the page offered nothing more at the start, or our loader ran to its end
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
  // Is the whole list here? Only when the page offered nothing more at the start, or our loader ran to its end ("done"): after a cancel or a stall Scholar's
  // button can be disabled just because a request is still in flight, which says nothing.
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
    if (!prefs.markName || row.a.fromDetail) return tipOnLine();
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
  function decorKey(row) {
    const a = row.a, v = a.venue || {};
    return [analysis.isHighlighted(a, prefs.roles), a.role, a.index, a.tokens ? a.tokens.length : 0, a.fromDetail, prefs.markName, prefs.ranks.ccf && v.ccf ? v.ccf.tier + v.ccf.name : "", prefs.ranks.core && v.core ? v.core.rank + v.core.name : "",
      B.prefs.visibleMarks(prefs, a.marks).map((m) => m.kind + m.source + (m.venue || "") + (m.year || "") + (m.text || "")).join(","), prefs.roles.first, prefs.roles.cofirst, prefs.roles.second, prefs.roles.last,
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
      if (prefs.ranks.ccf && a.venue.ccf) chips.push(chip.tierChip("ccf", a.venue.ccf, edition.ccf));
      if (prefs.ranks.core && a.venue.core) chips.push(chip.tierChip("core", a.venue.core, edition.core));
      for (const m of B.prefs.visibleMarks(prefs, a.marks)) chips.push(chip.markChip(m));
      if (chips.length) {
        // the chips of a row stay together (they wrap to the next line as one) and start at the text's edge there: a real space before them, no margin
        const space = document.createTextNode(" ");
        space.rrSpace = true;
        venueEl.append(space, h("span", { class: "rr-chips" }, chips.flatMap((c, i) => (i ? [" ", c] : [c]))));
      }
    }
    markName(row);
  }

  function applyFilters() {
    const f = state.filters;
    const source = currentSource();
    for (const row of live()) {
      const a = row.a;
      let hide = f.onlyHighlighted && !row.highlighted;
      if (a.year != null) {
        if (f.yearStart != null && a.year < f.yearStart) hide = true;
        if (f.yearEnd != null && a.year > f.yearEnd) hide = true;
      }
      if (state.markGroup && !marks.inGroup({ marks: B.prefs.visibleMarks(prefs, a.marks) }, state.markGroup)) hide = true;
      if (state.venueKey && (!row.highlighted || metrics.venueKey(a.venue, prefs.ranks) !== state.venueKey)) hide = true;
      if (state.selection && !metrics.inSelection({ status: a.status, role: a.role, venue: a.venue }, state.selection, source)) hide = true;
      row.raw.tr.classList.toggle("rr-hide", hide);
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
  // on, per its full author list, is not counted) — only the groups the settings page has switched on.
  // The award kinds behind the "Awards" count (only when that group is switched on)
  function markKinds() {
    return prefs.marks.award ? marks.summarizeKinds(live().filter((r) => r.a.status !== "absent").map((r) => ({ marks: B.prefs.visibleMarks(prefs, r.a.marks) }))) : {};
  }

  function markCounts() {
    return marks.summarize(live().filter((r) => r.a.status !== "absent").map((r) => ({ marks: B.prefs.visibleMarks(prefs, r.a.marks) })), prefs.talkRows);
  }

  // Most rows without an author line means Scholar's markup moved under us.
  const layoutBroken = () => state.rows.length >= 5 && state.rows.filter((r) => !r.raw.authorsText.trim()).length / state.rows.length >= 0.5;

  // is any filter narrowing the list (a matrix cell, a group, a venue, "only highlighted", a year range)?
  const filtering = () => !!(state.selection || state.markGroup || state.venueKey || state.filters.onlyHighlighted || state.filters.yearStart != null || state.filters.yearEnd != null);

  // The numbers under the filters follow the filters: the year range, an awards row, a matrix cell and a venue narrow what is counted. The table
  // itself stays whole (it is where a cell is chosen), and so do the year bars (the range is chosen against them); the venue list is not narrowed by its own choice.
  function scoped(source, { skipVenue = false } = {}) {
    const f = state.filters;
    return live().filter((r) => {
      const a = r.a;
      if (a.year != null) {
        if (f.yearStart != null && a.year < f.yearStart) return false;
        if (f.yearEnd != null && a.year > f.yearEnd) return false;
      }
      if (state.markGroup && !marks.inGroup({ marks: B.prefs.visibleMarks(prefs, a.marks) }, state.markGroup)) return false;
      if (!skipVenue && state.venueKey && metrics.venueKey(a.venue, prefs.ranks) !== state.venueKey) return false;
      if (state.selection && !metrics.inSelection({ status: a.status, role: a.role, venue: a.venue }, state.selection, source)) return false;
      return true;
    }).map(paperOf);
  }

  // The venue list: the venues of the papers the other filters let through, most papers first, and always the chosen venue (a pressed row, so that the
  // filter can be undone) even when the other filters leave it out of the first few
  function venueList(source) {
    const list = metrics.topVenues(scoped(source, { skipVenue: true }), 6, prefs.ranks);
    if (state.venueKey && !list.some((v) => v.key === state.venueKey)) {
      const mine = metrics.topVenues(scoped(source), 99, prefs.ranks).find((v) => v.key === state.venueKey);
      list.push({ key: state.venueKey, count: mine ? mine.count : 0 });
    }
    return list;
  }

  function model() {
    const list = papers();
    const source = currentSource();
    const bare = noRanks(list);
    const yearBars = metrics.yearBars(list);
    const summary = metrics.summarize(list, bare ? null : source);
    return {
      ownerName: headerName, edition, prefs, ui, sources: B.prefs.sources(prefs), source, summary, noRanks: bare,
      selection: state.selection, filters: state.filters,
      filterBar: filtering() ? { shown: live().filter((r) => !r.raw.tr.classList.contains("rr-hide")).length, total: live().length } : null,
      marks: markCounts(), markKinds: markKinds(), markGroup: state.markGroup,
      years: Array.from(new Set(list.map((p) => p.year).filter((y) => y != null))).sort((a, b) => b - a),
      metrics: { highlighted: metrics.citationMetrics(scoped(source)).highlighted, all: metrics.citationMetrics(list).all },
      byYear: yearBars.bars, byYearOlder: yearBars.older, topVenues: venueList(source), venueKey: state.venueKey,
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
    const parts = marks.rows(prefs.talkRows).filter((g) => counts[g]).map((g) => t(MARK_KEY[g]) + " " + counts[g]);
    return parts.length ? t("marksTitle") + ": " + parts.join(", ") + " (" + t("marksAsWritten") + ")" : "";
  };

  // "Copy papers": the papers the page shows now (the filters count), one line each
  function papersText() {
    const ccfOn = prefs.ranks.ccf, coreOn = prefs.ranks.core;
    const header = [t("tsvYear"), t("tsvTitle"), t("tsvAuthors"), t("tsvRole"), t("tsvVenue"), ...(ccfOn ? [t("srcCcf")] : []), ...(coreOn ? [t("srcCore")] : []), t("tsvAwards"), t("tsvCitations")];
    // (a paper whose author list Scholar cut before the owner's name says so; one that does not have the owner has no role)
    const roleOf = (a) => (a.status === "found" ? copyLabels()[a.role] || a.role : a.status === "hidden" ? t("roleHidden") : "");
    const rows = live().filter((r) => !r.raw.tr.classList.contains("rr-hide")).map((r) => {
      const a = r.a;
      const awardsAndTalks = B.prefs.visibleMarks(prefs, a.marks).map((m) => B.chips.markLabel(m) + (m.source === "list" && m.venue ? ` (${m.venue} ${m.year})` : "")).join(", ");
      return [a.year, r.raw.title, r.raw.authorsText, roleOf(a), r.raw.venueText,
        ...(ccfOn ? [a.venue.ccf ? a.venue.ccf.tier : ""] : []), ...(coreOn ? [a.venue.core ? a.venue.core.rank : ""] : []), awardsAndTalks, r.shown];
    });
    return metrics.toRowsTsv(header, rows);
  }

  function summaryText() {
    const m = model();
    return metrics.toText(m.summary, {
      owner: headerName, label: copyLabels(), notRanked: t("tipUnranked").toLowerCase(),
      extra: [marksLine(m.marks)].filter(Boolean),
      edition: m.source && !m.noRanks ? `${edition[m.source]} — ${t("tipToday")}` : ""
    });
  }

  const panel = B.panel.create({
    onCollapse() { ui.collapsed = !ui.collapsed; B.store.saveUi(ui); refresh(); },
    onSource(src) { ui.source = src; state.selection = null; B.store.saveUi(ui); refresh(); },
    // a content script cannot open the options page itself; the service worker does it on request
    onSettings() { try { chrome.runtime.sendMessage({ type: "rr:options" }); } catch (e) { /* extension context gone */ } },
    onSelect(sel) {
      const same = state.selection && state.selection.role === sel.role && state.selection.tier === sel.tier;
      state.selection = same || (sel.role === undefined && sel.tier === undefined) ? null : sel;
      refresh();
    },
    // every filter off at once (the panel's bar says how many papers are shown and offers this)
    onClearFilters() {
      state.selection = null; state.markGroup = null; state.venueKey = null;
      Object.assign(state.filters, { onlyHighlighted: false, yearStart: null, yearEnd: null });
      refresh();
    },
    onVenue(k) { state.venueKey = state.venueKey === k ? null : k; refresh(); },
    onMarkGroup(g) { state.markGroup = state.markGroup === g ? null : g; refresh(); },
    onOnly(on) { state.filters.onlyHighlighted = on; refresh(); },
    onYear(start, end) {
      state.filters.yearStart = start === "" ? null : parseInt(start, 10);
      state.filters.yearEnd = end === "" ? null : parseInt(end, 10);
      refresh();
    },
    async onCopy(kind) {
      const m = model();
      const text = kind === "tsv"
        ? metrics.toTsv(m.summary, { label: copyLabels(), header: t("tsvRole"), total: t("tsvTotal"), notRanked: t("tipUnranked") })
        : kind === "papers" ? papersText() : summaryText();
      if (await copyText(text)) panel.flash(kind);
    },
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
    applyMerge();
    for (const row of state.rows) decorate(row);
    // a venue filter whose venue cannot be in the panel's list any more (the roles, the merge, the lists or the venue list changed) has no control left to undo it
    // (checked once the rows know whether they are highlighted: after decorate, before the filters are applied)
    if (state.venueKey && !(prefs.panel.venues && metrics.topVenues(papers(), 9999, prefs.ranks).some((v) => v.key === state.venueKey))) state.venueKey = null;
    // with no tier columns left (nothing on the profile is ranked) a selection on a tier has no control to undo it
    if (state.selection && state.selection.tier && noRanks(papers())) state.selection = state.selection.role ? { role: state.selection.role, tier: undefined } : null;
    applyFilters();
    panel.el.hidden = !prefs.panel.show;
    if (prefs.panel.show) panel.update(model());
  }
  // Scholar's own blocks the settings ask to hide (a class on <html>, styled in styles.css)
  const prefsHide = (p) => { for (const k of B.prefs.HIDE_PARTS) document.documentElement.classList.toggle("rr-hide-" + k, !!p.hide[k]); };
  prefsHide(prefs);
  B.dom.applyColors(prefs.colors); B.dom.applyRowStyle(prefs.rowStyle);
  const scheduleRefresh = frame(refresh);

  // The settings page saved something (in this or any other tab): show it at once. A filter whose control is
  // gone must not keep hiding rows, so those are cleared.
  B.store.onPrefsChanged((next) => {
    if (next.language !== prefs.language || next.scholarLanguage !== prefs.scholarLanguage) { location.reload(); return; }      // the panel's words (or Scholar's) are changed at once by a fresh load
    prefsHide(next);
    B.dom.applyColors(next.colors); B.dom.applyRowStyle(next.rowStyle);
    const before = currentSource();
    const wasAuto = prefs.autoLoad;
    prefs = next;
    if (currentSource() !== before) state.selection = null;                        // its tier belonged to the other ranking
    if (state.markGroup && !(marks.rows(prefs.talkRows).includes(state.markGroup) && marks.members(state.markGroup).some((g) => prefs.marks[g]))) state.markGroup = null;
    if (!prefs.panel.show || !prefs.panel.venues) state.venueKey = null;
    if (!prefs.panel.summary) state.selection = null;                                   // (a matrix cell, an awards row: their controls are gone, so they must not keep hiding rows)
    if (!prefs.panel.marks) state.markGroup = null;
    if (!prefs.panel.show) { state.selection = null; state.markGroup = null; }
    if (!prefs.panel.show || !prefs.panel.filters) Object.assign(state.filters, { onlyHighlighted: false, yearStart: null, yearEnd: null });
    if (!Object.values(prefs.roles).some(Boolean)) state.filters.onlyHighlighted = false;     // nothing is highlighted: the filter would hide every row
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
  if (prefs.autoLoad) startLoad("auto");

  // The toolbar popup asks for the current summary.
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, send) => {
      if (msg && msg.type === "rr:summary") {
        const list = papers();
        send({
          ok: true, owner: headerName, loaded: list.length, loadingAll: state.loadingAll, layoutBroken: layoutBroken(), edition,
          sources: B.prefs.sources(prefs), source: currentSource(), noRanks: noRanks(list),
          summaries: { ccf: metrics.summarize(list, "ccf"), core: metrics.summarize(list, "core"), none: metrics.summarize(list, null) },
          marks: markCounts(), talkRows: prefs.talkRows, parts: { summary: prefs.panel.summary, marks: prefs.panel.marks }       // (the settings page's switches for the table and the awards & talks counts apply to the popup as well)
        });
      }
      return false;
    });
  } catch (e) { /* extension context gone */ }

})();
