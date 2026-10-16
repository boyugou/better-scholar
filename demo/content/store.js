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
    if (!live()) return;
    try { await chrome.storage[area].remove(key); } catch (e) { /* context loss */ }
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

  // A venue of the unranked list the person wants explained: the settings page takes it (and opens its "Check a venue" with it filled in). A short text, nothing personal.
  const askVenue = (text) => set("local", "askVenue", String(text == null ? "" : text).replace(/\s+/g, " ").trim().slice(0, 300));
  async function takeVenue() {
    const v = await get("local", "askVenue");
    if (v !== undefined) await remove("local", "askVenue");
    return typeof v === "string" ? v : "";
  }
  function onVenueAsked(fn) {
    if (!live()) return () => {};
    const listener = (changes, area) => { if (area === "local" && changes.askVenue && typeof changes.askVenue.newValue === "string") fn(); };
    try { chrome.storage.onChanged.addListener(listener); } catch (e) { return () => {}; }
    return () => { try { chrome.storage.onChanged.removeListener(listener); } catch (e) { /* gone */ } };
  }

  B.store = { askVenue, takeVenue, onVenueAsked, loadS2Key, saveS2Key, loadPrefs, savePrefs, loadUi, saveUi, onPrefsChanged, loadVariants, saveVariants, loadResolved, saveResolved, clearResolved };
})();
