// Persistence. Settings and per-profile name variants live in chrome.storage.sync
// (follows the user across devices); the cache of paper-detail lookups lives in
// chrome.storage.local. If the extension context disappears (the extension was
// updated while the tab stayed open) everything degrades to in-memory state.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});

  const DEFAULTS = {
    v: 2,
    roles: { first: true, cofirst: true, second: true, last: true },
    badges: { ccf: true, core: true, marks: true },
    markName: true,
    matrixSource: "ccf",
    collapsed: false
  };

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

  // v1 stored { authors, badges: { conference, journal, ccf }, roles } and had CCF off by default.
  function migrate(stored) {
    const s = stored && typeof stored === "object" ? stored : {};
    const out = {
      v: 2,
      roles: Object.assign({}, DEFAULTS.roles, s.roles),
      badges: Object.assign({}, DEFAULTS.badges),
      markName: s.markName !== false,
      matrixSource: s.matrixSource === "core" ? "core" : "ccf",
      collapsed: !!s.collapsed
    };
    if (s.v === 2 && s.badges) out.badges = Object.assign({}, DEFAULTS.badges, s.badges);
    else if (s.badges && s.badges.conference === false) out.badges.core = false;
    return out;
  }

  async function loadSettings() { return migrate(await get("sync", "settings")); }
  const saveSettings = (s) => set("sync", "settings", s);

  async function loadVariants(profileId) {
    const all = (await get("sync", "variants")) || {};
    return Array.isArray(all[profileId]) ? all[profileId] : [];
  }
  async function saveVariants(profileId, list) {
    const all = Object.assign({}, (await get("sync", "variants")) || {});
    if (list.length) all[profileId] = list.slice(0, 8); else delete all[profileId];
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

  B.store = { DEFAULTS, migrate, loadSettings, saveSettings, loadVariants, saveVariants, loadResolved, saveResolved };
})();
