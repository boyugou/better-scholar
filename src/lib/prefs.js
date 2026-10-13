// What the extension draws, and per-device view state. Pure, no chrome.*: the stored shapes, their
// defaults, and the rules that turn a preference into behaviour, so they can be tested in Node.
//
// Two records, two writers (so a stale Scholar tab can never overwrite what the settings page saved):
//   prefs — what to show, and whether to load the whole paper list. Written by the settings page only; read by the pages and the popup.
//   ui    — { collapsed, source }: whether the panel is folded and which ranking its table uses.
//           Written by the Scholar page only.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.RolesRanks = root.RolesRanks || {}).prefs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ROLES = ["first", "cofirst", "second", "last"];
  const RANKS = ["ccf", "core"];
  const MARK_GROUPS = ["award", "oral", "spotlight", "highlight"];
  const PANEL_PARTS = ["show", "summary", "marks", "filters", "metrics", "status", "names"];
  const HIDE_PARTS = ["cited", "coauthors", "access"];     // Scholar's own side blocks that can be hidden: "Cited by", "Co-authors", "Public access"

  const flag = (v, fallback) => (typeof v === "boolean" ? v : fallback);
  const pickOff = (src, keys) => Object.fromEntries(keys.map((k) => [k, flag(src && typeof src === "object" ? src[k] : undefined, false)]));
  const pick = (src, keys) => Object.fromEntries(keys.map((k) => [k, flag(src && typeof src === "object" ? src[k] : undefined, true)]));

  // Everything on: nobody has asked for less yet.
  const defaults = () => normalize(null);

  // Any stored value → a complete, well-typed record. Unknown keys are dropped, wrong types fall back to the default.
  function normalize(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    return {
      v: 3,
      roles: pick(r.roles, ROLES),                 // highlight the rows where you are first / co-first / second / last
      markName: flag(r.markName, true),            // bold + tint your name in the author line
      ranks: pick(r.ranks, RANKS),                 // CCF / CORE chips, and their tab in the panel
      marks: pick(r.marks, MARK_GROUPS),           // award / oral / spotlight / highlight chips and counts
      panel: pick(r.panel, PANEL_PARTS),           // the panel itself and each of its parts: the role × rank table (with its copy buttons and data note), the award / talk counts, the filters, the citation totals, the loaded-papers / unranked-venues status, the name-spelling help
      hide: pickOff(r.hide, HIDE_PARTS),           // Scholar's own blocks to hide (nothing is hidden until asked): they repeat what the panel shows or are not wanted
      autoLoad: flag(r.autoLoad, true)             // press Scholar's own "Show more" until the whole paper list is loaded
    };
  }

  function normalizeUi(raw) {
    const r = raw && typeof raw === "object" ? raw : {};
    return { collapsed: r.collapsed === true, source: r.source === "core" ? "core" : "ccf" };
  }

  // Versions 1 and 2 kept everything in one `settings` object:
  //   v2 { roles, badges: { ccf, core, marks }, markName?, matrixSource, collapsed }
  //   v1 { roles, badges: { conference, journal, ccf }, … } with CCF off by default
  function fromLegacy(stored) {
    const s = stored && typeof stored === "object" ? stored : {};
    const badges = { ccf: true, core: true, marks: true };
    if (s.v === 2 && s.badges && typeof s.badges === "object") Object.assign(badges, s.badges);
    else if (s.badges && s.badges.conference === false) badges.core = false;
    const marks = flag(badges.marks, true);
    return {
      prefs: normalize({
        roles: s.roles, markName: s.markName,
        ranks: { ccf: badges.ccf, core: badges.core },
        marks: { award: marks, oral: marks, spotlight: marks, highlight: marks }
      }),
      ui: normalizeUi({ collapsed: s.collapsed, source: s.matrixSource })
    };
  }

  // Rank systems that are switched on, and the one the panel's table uses: the remembered one if it is on,
  // otherwise the first that is, otherwise none (the table then shows roles only).
  const sources = (prefs) => RANKS.filter((k) => prefs.ranks[k]);
  function source(prefs, ui) {
    const on = sources(prefs);
    return on.includes(ui.source) ? ui.source : on[0] || null;
  }

  // A best-paper finalist belongs to the awards switch (it is the same kind of news); talk levels have their own.
  const groupOn = (prefs, group) => (group === "finalist" ? prefs.marks.award : !!prefs.marks[group]);
  const visibleMarks = (prefs, marks) => (marks || []).filter((m) => groupOn(prefs, m.group));

  return { ROLES, RANKS, MARK_GROUPS, PANEL_PARTS, HIDE_PARTS, defaults, normalize, normalizeUi, fromLegacy, sources, source, groupOn, visibleMarks };
});
