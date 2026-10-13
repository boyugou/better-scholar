// Persistence. Display preferences and per-profile name variants live in chrome.storage.sync (they follow
// the user across devices); the panel's view state and the cache of paper-detail lookups live in
// chrome.storage.local. If the extension context disappears (the extension was updated while the tab
// stayed open) everything degrades to in-memory state.
//
// Keys (see lib/prefs.js for the shapes and who writes what):
//   sync  prefs      what to show — written by the settings page
//   local ui         { collapsed, source } — written by the Scholar page
//   sync  variants   { profileId: [name spellings] }
//   local resolved   { paperId: { ts, authors } } — author lists read with "Resolve"
//   sync  settings   the pre-2.2 combined record; read once by migrate() and removed
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
  async function set(area, key, value) {
    mem[area][key] = value;
    if (!live()) return;
    try { await chrome.storage[area].set({ [key]: value }); } catch (e) { /* quota or context loss */ }
  }
  async function remove(area, key) {
    delete mem[area][key];
    if (!live()) return;
    try { await chrome.storage[area].remove(key); } catch (e) { /* context loss */ }
  }

  // Older versions kept everything in one `settings` record. Split it once, then forget it.
  async function migrate() {
    if ((await get("sync", "prefs")) !== undefined) return;
    const legacy = await get("sync", "settings");
    if (legacy === undefined) return;
    const { prefs, ui } = B.prefs.fromLegacy(legacy);
    await set("sync", "prefs", prefs);
    await set("local", "ui", ui);
    await remove("sync", "settings");
  }

  async function loadPrefs() {
    const stored = await get("sync", "prefs");
    return stored === undefined ? B.prefs.fromLegacy(await get("sync", "settings")).prefs : B.prefs.normalize(stored);
  }
  const savePrefs = (prefs) => set("sync", "prefs", B.prefs.normalize(prefs));

  async function loadUi() {
    const stored = await get("local", "ui");
    return stored === undefined ? B.prefs.fromLegacy(await get("sync", "settings")).ui : B.prefs.normalizeUi(stored);
  }
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
    if (list.length) all[profileId] = list.slice(-8); else delete all[profileId];
    const keys = Object.keys(all);
    if (keys.length > 40) delete all[keys[0]];          // chrome.storage.sync items are capped at 8 KB
    await set("sync", "variants", all);
  }

  const TTL = 90 * 24 * 3600 * 1000;
  async function loadResolved() {
    const all = (await get("local", "resolved")) || {};
    const now = Date.now();
    const out = {};
    for (const [id, v] of Object.entries(all)) if (v && now - v.ts < TTL) out[id] = v;
    return out;
  }
  async function saveResolved(map) {
    const entries = Object.entries(map).sort((a, b) => b[1].ts - a[1].ts).slice(0, 3000);
    await set("local", "resolved", Object.fromEntries(entries));
  }
  const clearResolved = () => remove("local", "resolved");

  // The optional Semantic Scholar API key: on this device only (never synced), sent only to Semantic Scholar
  const loadS2Key = async () => { const k = await get("local", "s2key"); return typeof k === "string" ? k.replace(/[^\x21-\x7e]/g, "") : ""; };      // (visible ASCII only: a header cannot carry anything else)
  const saveS2Key = (key) => (key ? set("local", "s2key", key.trim().slice(0, 200)) : remove("local", "s2key"));

  B.store = { loadS2Key, saveS2Key, migrate, loadPrefs, savePrefs, loadUi, saveUi, onPrefsChanged, loadVariants, saveVariants, loadResolved, saveResolved, clearResolved };
})();
