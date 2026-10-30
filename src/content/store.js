// Persistence. Display preferences and per-profile name variants live in chrome.storage.sync (they follow
// the user across devices); the panel's view state and the cache of paper-detail lookups live in
// chrome.storage.local. If the extension context disappears (the extension was updated while the tab
// stayed open) everything degrades to in-memory state.
//
// Keys (see lib/prefs.js for the shapes and who writes what):
//   sync  prefs      what to show — written by the settings page
//   local ui         { collapsed, source } — written by the Scholar page
//   sync  variants   { profileId: [name spellings] }
//   local resolved   { paperId: { ts, authors } } — author lists read with "Read full lists"
//   local askVenue   a venue text the panel asks the settings page to check (left until the page takes it)
//   local reloadHint true from an install or update until the toolbar popup first reaches a profile (background.js; the popup reads it)
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});

  const mem = { sync: {}, local: {} };
  const live = () => {
    try { return !!(chrome.runtime && chrome.runtime.id && chrome.storage); } catch (e) { return false; }
  };

  async function get(area, key) {
    if (live()) {
      try { return (await chrome.storage[area].get(key))[key]; } catch (e) { /* fall through */ }
    }
    return mem[area][key];
  }
  // true when the value was written; false when Chrome refused it (a quota) or the extension context is gone (the value is then kept in memory only)
  async function set(area, key, value) {
    mem[area][key] = value;
    if (!live()) return false;
    try { await chrome.storage[area].set({ [key]: value }); return true; } catch (e) { return false; }
  }
  async function remove(area, key) {
    delete mem[area][key];
    if (!live()) return false;
    try { await chrome.storage[area].remove(key); return true; } catch (e) { return false; }
  }

  const loadPrefs = async () => B.prefs.normalize(await get("sync", "prefs"));
  const savePrefs = (prefs) => set("sync", "prefs", B.prefs.normalize(prefs));       // → true when written

  const loadUi = async () => B.prefs.normalizeUi(await get("local", "ui"));
  const saveUi = (ui) => set("local", "ui", B.prefs.normalizeUi(ui));

  // Run `fn(newPrefs)` whenever the settings page saves (from any tab); returns a function that stops listening.
  function onPrefsChanged(fn) {
    if (!live()) return () => {};
    const listener = (changes, area) => { if (area === "sync" && changes.prefs) fn(B.prefs.normalize(changes.prefs.newValue)); };
    try { chrome.storage.onChanged.addListener(listener); } catch (e) { return () => {}; }
    return () => { try { chrome.storage.onChanged.removeListener(listener); } catch (e) { /* gone */ } };
  }

  async function loadVariants(profileId) {
    const all = (await get("sync", "variants")) || {};
    return Array.isArray(all[profileId]) ? all[profileId] : [];
  }
  async function saveVariants(profileId, list) {
    const all = Object.assign({}, (await get("sync", "variants")) || {});
    delete all[profileId];                                            // (put last: the profile written most recently is the last to go)
    if (list.length) all[profileId] = list.slice(-8);
    // (chrome.storage.sync takes 8 KB for an item: at most forty profiles, and fewer when their spellings are long)
    while (Object.keys(all).length > 40 || (Object.keys(all).length > 1 && B.prefs.sizeOf(all) > B.prefs.SYNC_LIMIT - 20)) delete all[Object.keys(all)[0]];
    await set("sync", "variants", all);
  }

  // The person's own venue mappings (lib/venues.js `data.mine`): [{ text, list, name }], synced like the spellings. A line no rule ranks, tied by the person to a list's row.
  const MINE_MAX = 100;
  const cleanMine = (list) => (Array.isArray(list) ? list : []).filter((m) => m && typeof m.text === "string" && (m.list === "ccf" || m.list === "core") && typeof m.name === "string")
    .map((m) => ({ text: m.text.replace(/\s+/g, " ").trim().slice(0, 300), list: m.list, name: m.name.slice(0, 300), ...(m.kind === "C" || m.kind === "J" ? { kind: m.kind } : {}) })).filter((m) => m.text);
  const loadMine = async () => cleanMine(await get("sync", "mine"));
  // → { ok, kept, dropped }: what was written, and how many of the oldest did not fit (8 KB for an item, about fifty mappings: the page says so)
  async function saveMine(list) {
    const all = cleanMine(list), n = all.length;
    while (all.length > MINE_MAX || (all.length > 1 && B.prefs.sizeOf(all) > B.prefs.SYNC_LIMIT - 20)) all.shift();
    return { ok: await set("sync", "mine", all), kept: all, dropped: n - all.length };
  }
  function onMineChanged(fn) {
    if (!live()) return () => {};
    const listener = (changes, area) => { if (area === "sync" && changes.mine) fn(cleanMine(changes.mine.newValue)); };
    try { chrome.storage.onChanged.addListener(listener); } catch (e) { return () => {}; }
    return () => { try { chrome.storage.onChanged.removeListener(listener); } catch (e) { /* gone */ } };
  }

  const TTL = 90 * 24 * 3600 * 1000;
  async function loadResolved() {
    const all = (await get("local", "resolved")) || {};
    const now = Date.now();
    const out = {};
    for (const [id, v] of Object.entries(all)) if (v && now - v.ts < TTL) out[id] = v;
    if (Object.keys(out).length < Object.keys(all).length) await set("local", "resolved", out);          // (what is older than 90 days goes now, not at the next save: "kept for 90 days" means that — also when the settings page reads them)
    return out;
  }
  // The details read from Scholar's paper pages (and from Semantic Scholar): the newest first, up to three thousand papers and three million characters — an author list of a large
  // collaboration is tens of thousands. What does not fit is read again when it is asked for. One write that Chrome refuses must not be the end of all of them.
  const RESOLVED_BUDGET = 3000000;
  // (`fresh`: what this page read; it is added to what is stored now, so that another tab's papers stay and a cleared store is not written back)
  async function saveResolved(fresh) {
    const map = Object.assign(await loadResolved(), fresh);
    let size = 0;
    const keep = [];
    for (const [id, v] of Object.entries(map).sort((a, b) => b[1].ts - a[1].ts)) {
      const n = id.length + String(v.authors || "").length + String(v.venue || "").length + 40;
      if (keep.length >= 3000 || size + n > RESOLVED_BUDGET) continue;
      size += n; keep.push([id, v]);
    }
    return set("local", "resolved", Object.fromEntries(keep));
  }
  const clearResolved = () => remove("local", "resolved");
  // Run `fn()` when the stored details are cleared (the settings page's button, in any tab)
  function onResolvedCleared(fn) {
    if (!live()) return () => {};
    const listener = (changes, area) => { if (area === "local" && changes.resolved && changes.resolved.newValue === undefined) fn(); };
    try { chrome.storage.onChanged.addListener(listener); } catch (e) { return () => {}; }
    return () => { try { chrome.storage.onChanged.removeListener(listener); } catch (e) { /* gone */ } };
  }

  // The optional Semantic Scholar API key: on this device only (never synced), sent only to Semantic Scholar
  const loadS2Key = async () => { const k = await get("local", "s2key"); return typeof k === "string" ? k.replace(/[^\x21-\x7e]/g, "") : ""; };      // (visible ASCII only: a header cannot carry anything else)
  const saveS2Key = (key) => (key ? set("local", "s2key", key.trim().slice(0, 200)) : remove("local", "s2key"));

  // A venue of the unranked list the person wants explained: the settings page takes it (and opens its "Check a venue" with it filled in). A short text, nothing personal.
  // (an ask that nobody took within half a minute is stale: a later visit to the settings page must not jump to a venue that was asked about long ago)
  const askVenue = (text) => set("local", "askVenue", { text: String(text == null ? "" : text).replace(/\s+/g, " ").trim().slice(0, 300), at: Date.now() });
  async function takeVenue() {
    const v = await get("local", "askVenue");
    if (v !== undefined) await remove("local", "askVenue");
    return v && typeof v.text === "string" && Date.now() - v.at < 30000 ? v.text : null;          // (null: nothing asked; "" asks for the card itself — the panel's venue mappings line)
  }
  function onVenueAsked(fn) {
    if (!live()) return () => {};
    const listener = (changes, area) => { if (area === "local" && changes.askVenue && changes.askVenue.newValue && typeof changes.askVenue.newValue.text === "string") fn(); };
    try { chrome.storage.onChanged.addListener(listener); } catch (e) { return () => {}; }
    return () => { try { chrome.storage.onChanged.removeListener(listener); } catch (e) { /* gone */ } };
  }

  B.store = { loadMine, saveMine, onMineChanged, cleanMine, askVenue, takeVenue, onVenueAsked, loadS2Key, saveS2Key, loadPrefs, savePrefs, loadUi, saveUi, onPrefsChanged, loadVariants, saveVariants, loadResolved, saveResolved, clearResolved, onResolvedCleared };
})();
