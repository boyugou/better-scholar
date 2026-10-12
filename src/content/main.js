// Content-script entry: wires the Scholar page, the analysis libraries and the panel.
// Runs on Google Scholar profile pages only (the manifest matches /citations*, and
// isProfile() double-checks — author-search and citation pages are left alone).
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  if (!B || !B.scholar || !B.data || !B.data.ccf || !B.data.core || !B.scholar.isProfile()) return;

  const { venues, analysis, metrics, marks, chips: chip } = B;
  const { h, t, copyText, frame } = B.dom;

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
    markGroup: null,                            // 'award' | 'oral' | 'spotlight' | 'highlight' filter
    filters: { onlyHighlighted: false, yearStart: null, yearEnd: null },
    loadingAll: false,
    resolving: null,                            // { done, total }
    resolveMessage: ""
  };
  let loadAbort = null, resolveAbort = null;

  const owner = () => ({ name: headerName, alternates: variants });
  const analyzeRaw = (raw) => analysis.analyzeRow(raw, { owner: owner(), resolver, resolved: resolvedCache[raw.id], venueWord, awards });
  // the ranking the panel's table uses (null when both lists are switched off)
  const currentSource = () => B.prefs.source(prefs, ui);

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
    return added;
  }

  const reanalyze = () => state.rows.forEach((r) => { r.a = analyzeRaw(r.raw); });

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

  function decorate(row) {
    const { tr, venueEl } = row.raw;
    const a = row.a;
    row.highlighted = analysis.isHighlighted(a, prefs.roles);
    for (const r of analysis.ROLE_KEYS) tr.classList.toggle("rr-r-" + r, row.highlighted && a.role === r);
    if (venueEl) {
      venueEl.querySelectorAll(":scope > .rr-chips").forEach((n) => n.remove());
      const chips = [];
      if (prefs.ranks.ccf && a.venue.ccf) chips.push(chip.tierChip("ccf", a.venue.ccf, edition.ccf));
      if (prefs.ranks.core && a.venue.core) chips.push(chip.tierChip("core", a.venue.core, edition.core));
      for (const m of B.prefs.visibleMarks(prefs, a.marks)) chips.push(chip.markChip(m));
      if (chips.length) venueEl.append(h("span", { class: "rr-chips" }, chips));
    }
    markName(row);
  }

  function applyFilters() {
    const f = state.filters;
    const source = currentSource();
    for (const row of state.rows) {
      const a = row.a;
      let hide = f.onlyHighlighted && !row.highlighted;
      if (a.year != null) {
        if (f.yearStart != null && a.year < f.yearStart) hide = true;
        if (f.yearEnd != null && a.year > f.yearEnd) hide = true;
      }
      if (state.markGroup && !marks.inGroup(a, state.markGroup)) hide = true;
      if (state.selection && !metrics.inSelection({ status: a.status, role: a.role, venue: a.venue }, state.selection, source)) hide = true;
      row.raw.tr.classList.toggle("rr-hide", hide);
    }
  }

  // ---- panel model --------------------------------------------------------

  function papers() {
    return state.rows.map((r) => ({
      status: r.a.status, role: r.a.role, venue: r.a.venue, venueText: r.a.venueText,
      citations: r.a.citations, year: r.a.year, highlighted: r.highlighted
    }));
  }

  // Papers per award / talk group among the papers that are the profile owner's (a paper the owner is not
  // on, per its full author list, is not counted) — only the groups the settings page has switched on.
  function markCounts() {
    const counts = marks.summarize(state.rows.filter((r) => r.a.status !== "absent").map((r) => ({ marks: r.a.marks })));
    for (const g of marks.GROUPS) if (!prefs.marks[g]) delete counts[g];
    return counts;
  }

  // Most rows without an author line means Scholar's markup moved under us.
  const layoutBroken = () => state.rows.length >= 5 && state.rows.filter((r) => !r.raw.authorsText.trim()).length / state.rows.length >= 0.5;

  function model() {
    const list = papers();
    const source = currentSource();
    const summary = metrics.summarize(list, source);
    return {
      ownerName: headerName, edition, prefs, ui, sources: B.prefs.sources(prefs), source, summary,
      selection: state.selection, filters: state.filters,
      marks: markCounts(), markGroup: state.markGroup,
      years: Array.from(new Set(list.map((p) => p.year).filter((y) => y != null))).sort((a, b) => b - a),
      metrics: metrics.citationMetrics(list),
      coverage: {
        loaded: list.length, canLoadMore: B.scholar.canLoadMore(), loadingAll: state.loadingAll,
        hidden: summary.hidden, absent: summary.absent, resolving: state.resolving, resolveMessage: state.resolveMessage, layoutBroken: layoutBroken(),
        unmatched: metrics.unmatchedVenues(list)
      },
      variants
    };
  }

  // ---- panel + callbacks ---------------------------------------------------

  const copyLabels = () => ({
    first: t("copyFirst"), cofirst: t("copyCofirst"), second: t("copySecond"), last: t("copyLast"), middle: t("copyMiddle")
  });

  const MARK_KEY = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight" };
  const marksLine = (counts) => {
    const parts = marks.GROUPS.filter((g) => counts[g]).map((g) => t(MARK_KEY[g]) + " " + counts[g]);
    return parts.length ? t("marksTitle") + ": " + parts.join(", ") + " (" + t("marksAsWritten") + ")" : "";
  };

  function summaryText() {
    const m = model();
    return metrics.toText(m.summary, {
      owner: headerName, label: copyLabels(), notRanked: t("tipUnranked").toLowerCase(),
      extra: [marksLine(m.marks)].filter(Boolean),
      edition: m.source ? `${edition[m.source]} — ${t("tipToday")}` : ""
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
        : summaryText();
      if (await copyText(text)) panel.flash(kind);
    },
    async onLoadAll() {
      if (state.loadingAll) return;
      state.loadingAll = true;
      loadAbort = new AbortController();
      refresh();
      try {
        await B.scholar.loadAll({ signal: loadAbort.signal, onProgress: () => { ingest(); refresh(); } });
      } finally {
        state.loadingAll = false;
        loadAbort = null;
        ingest();
        refresh();
      }
    },
    onCancelLoad() { if (loadAbort) loadAbort.abort(); },
    onCopyUnmatched() { return copyText(metrics.unmatchedVenues(papers()).map((u) => `${u.count}× ${u.venue}`).join("\n")); },
    async onResolve() {
      if (state.resolving) return;
      const items = state.rows
        .filter((r) => analysis.needsDetail(r.a) && r.raw.id && r.raw.href)
        .sort((x, y) => y.a.citations - x.a.citations)
        .map((r) => ({ id: r.raw.id, href: r.raw.href }));
      if (!items.length) return;
      resolveAbort = new AbortController();
      state.resolving = { done: 0, total: items.length };
      state.resolveMessage = "";
      refresh();
      const res = await B.detail.resolveAll(items, resolvedCache, {
        signal: resolveAbort.signal,
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
      state.resolveMessage = res.stopped === "captcha" ? t("resolveCaptcha") : res.stopped === "cancelled" ? "" : t("resolveDone");
      reanalyze();
      refresh();
    },
    onCancelResolve() { if (resolveAbort) resolveAbort.abort(); },
    onAddVariant(v) {
      if (variants.includes(v)) return;
      variants = [...variants, v].slice(0, 8);
      B.store.saveVariants(profileId, variants);
      reanalyze();
      refresh();
    },
    onRemoveVariant(v) {
      variants = variants.filter((x) => x !== v);
      B.store.saveVariants(profileId, variants);
      reanalyze();
      refresh();
    }
  });

  function refresh() {
    for (const row of state.rows) decorate(row);
    applyFilters();
    panel.el.hidden = !prefs.panel.show;
    if (prefs.panel.show) panel.update(model());
  }
  const scheduleRefresh = frame(refresh);

  // The settings page saved something (in this or any other tab): show it at once. A filter whose control is
  // gone must not keep hiding rows, so those are cleared.
  B.store.onPrefsChanged((next) => {
    const before = currentSource();
    prefs = next;
    if (currentSource() !== before) state.selection = null;                        // its tier belonged to the other ranking
    if (state.markGroup && !prefs.marks[state.markGroup]) state.markGroup = null;
    if (!prefs.panel.show) { state.selection = null; state.markGroup = null; }
    if (!prefs.panel.show || !prefs.panel.filters) Object.assign(state.filters, { onlyHighlighted: false, yearStart: null, yearEnd: null });
    refresh();
  });

  // ---- boot ---------------------------------------------------------------

  ingest();
  B.scholar.place(panel.el);
  refresh();

  const tbody = B.scholar.tbody();
  if (tbody) new MutationObserver(() => { if (ingest()) scheduleRefresh(); }).observe(tbody, { childList: true });
  window.addEventListener("resize", frame(() => B.scholar.place(panel.el)));

  // The toolbar popup asks for the current summary.
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, send) => {
      if (msg && msg.type === "rr:summary") {
        const list = papers();
        send({
          ok: true, owner: headerName, loaded: list.length, edition,
          sources: B.prefs.sources(prefs), source: currentSource(),
          summaries: { ccf: metrics.summarize(list, "ccf"), core: metrics.summarize(list, "core"), none: metrics.summarize(list, null) },
          marks: markCounts()
        });
      }
      return false;
    });
  } catch (e) { /* extension context gone */ }

})();
