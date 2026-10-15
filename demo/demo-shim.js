// The web demo's stand-in for the extension's own world, and the sequence that starts the settings page in an ordinary web page.
//
// scripts/build-demo.mjs copies this file next to the page's index.html and puts the one tag that loads it where the page's own scripts
// were: its data-scripts name those scripts in the page's order, data-version is the extension's version. This file
//   1. defines `window.chrome` with what the settings page and the libraries it loads touch: chrome.storage (sync, local, onChanged),
//      chrome.i18n (getMessage, getUILanguage) and chrome.runtime (id, getManifest, getURL, sendMessage, openOptionsPage, onMessage);
//   2. loads the strings of English and of the interface language, because chrome.i18n.getMessage answers at once (no promise), and
//   3. only then adds the page's scripts, one after the other.
// Nothing else is emulated (no chrome.tabs, no storage quota, no other storage area): a page that asks for more fails with a plain
// TypeError here, which is how you will find out. No network beyond this folder's own files.
//
// The interface language is the `?lang=` of the address (a site code such as zh-CN or pt-BR, or a _locales folder such as zh_CN); without
// it, the browser's own. It is what chrome.i18n.getUILanguage() returns, so the page picks its words exactly as it does in the extension.
(function () {
  "use strict";
  const tag = document.currentScript;
  const SCRIPTS = String(tag.dataset.scripts || "").split(/\s+/).filter(Boolean);
  const VERSION = tag.dataset.version || "0";

  // The settings live in localStorage under this prefix: the origin also holds other pages' keys (the website keeps "rr-lang" there).
  const PREFIX = "rr-demo:";
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // ---- chrome.storage ----------------------------------------------------------------------------------------------------------------------
  // What the page reads is this table (copies, never the page's own objects: options.js changes its settings in place); every write goes through to
  // localStorage. Without localStorage (a private window, blocked site data) the settings live in this page only.
  const areas = { sync: Object.create(null), local: Object.create(null) };
  const listeners = new Set();
  const slot = (area, key) => PREFIX + area + ":" + key;
  // Kept in this page only, never in the origin's localStorage (which other pages of the same host can read): a key typed into a demo is a key typed into a toy
  const MEMORY_ONLY = new Set(["local:s2key"]);
  const parseSlot = (name) => { const m = name && name.startsWith(PREFIX) ? /^([a-z]+):(.*)$/.exec(name.slice(PREFIX.length)) : null; return m && areas[m[1]] ? { area: m[1], key: m[2] } : null; };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i), at = parseSlot(name);
      if (!at || MEMORY_ONLY.has(at.area + ":" + at.key)) continue;
      try { areas[at.area][at.key] = JSON.parse(localStorage.getItem(name)); } catch (e) { /* not JSON: not ours */ }
    }
  } catch (e) { /* no localStorage */ }

  function persist(area, key, value) {
    if (MEMORY_ONLY.has(area + ":" + key)) return;
    try {
      if (value === undefined) localStorage.removeItem(slot(area, key));
      else localStorage.setItem(slot(area, key), JSON.stringify(value));
    } catch (e) { /* memory only */ }
  }

  // Chrome tells every listener, the page that wrote included, shortly after the write and not during it; a change holds only the sides that exist.
  function announce(area, changes) {
    if (!Object.keys(changes).length) return;
    Promise.resolve().then(() => listeners.forEach((fn) => { try { fn(clone(changes), area); } catch (e) { console.error(e); } }));
  }
  const change = (oldValue, newValue) => Object.assign({}, oldValue === undefined ? null : { oldValue }, newValue === undefined ? null : { newValue });

  const keysOf = (keys) => (typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys || {}));
  const storageArea = (name) => ({
    // a key, a list of keys, an object of defaults, or nothing (everything), as in Chrome
    async get(keys) {
      const have = areas[name], out = {};
      const defaults = keys && typeof keys === "object" && !Array.isArray(keys) ? keys : Object.create(null);
      for (const k of keys == null ? Object.keys(have) : keysOf(keys)) {
        if (k in have) out[k] = clone(have[k]);
        else if (k in defaults) out[k] = clone(defaults[k]);
      }
      return out;
    },
    async set(items) {
      const changes = {};
      for (const [k, v] of Object.entries(items || {})) {
        if (v === undefined) continue;
        const old = areas[name][k];
        areas[name][k] = clone(v);
        persist(name, k, v);
        if (!same(old, v)) changes[k] = change(old, v);
      }
      announce(name, changes);
    },
    async remove(keys) {
      const changes = {};
      for (const k of keysOf(keys)) {
        if (!(k in areas[name])) continue;
        changes[k] = change(areas[name][k], undefined);
        delete areas[name][k];
        persist(name, k, undefined);
      }
      announce(name, changes);
    }
  });

  // Another tab of the demo (the page opened on its own, next to the one in the website) is another document of this origin: localStorage tells
  // this one, and the page's open settings follow, as the open Scholar tabs follow the settings page in the extension.
  addEventListener("storage", (e) => {
    const at = parseSlot(e.key);
    if (!at) return;
    let value;
    try { value = e.newValue == null ? undefined : JSON.parse(e.newValue); } catch (err) { return; }
    const old = areas[at.area][at.key];
    if (same(old, value)) return;
    if (value === undefined) delete areas[at.area][at.key]; else areas[at.area][at.key] = value;
    announce(at.area, { [at.key]: change(old, value) });
  });

  // ---- chrome.i18n -------------------------------------------------------------------------------------------------------------------------
  const query = new URLSearchParams(location.search).get("lang");
  const uiLanguage = String(query || navigator.language || "en").replace("_", "-");
  const catalogs = {};               // folder → the folder's messages.json: English and the interface language's, there before the page starts
  let uiFolder = "en";

  const asked = {};
  function catalog(folder) {
    return asked[folder] || (asked[folder] = fetch(new URL("_locales/" + folder + "/messages.json", document.baseURI))
      .then((r) => { if (!r.ok) throw new Error(r.status + " " + r.url); return r.json(); })
      .catch((e) => { delete asked[folder]; throw e; }));
  }

  const i18n = {
    getUILanguage: () => uiLanguage,
    // the interface language's string, else English's (Chrome's own fallback to default_locale), formatted by the extension's own lib/i18n.js
    getMessage(name, subs) {
      const entry = (catalogs[uiFolder] && catalogs[uiFolder][name]) || (catalogs.en && catalogs.en[name]);
      return entry ? globalThis.RolesRanks.i18n.format(entry, subs) : "";
    }
  };

  // ---- chrome.runtime ----------------------------------------------------------------------------------------------------------------------
  const runtime = {
    id: "better-scholar-demo",       // (content/store.js takes a page without an extension id for one whose extension is gone, and keeps nothing)
    getManifest: () => ({ manifest_version: 3, name: "Better Scholar", version: VERSION }),
    getURL: (path) => new URL(path, document.baseURI).href,
    openOptionsPage: async () => {},   // (this page is the settings page)
    onMessage: { addListener() {}, removeListener() {}, hasListener: () => false },
    // the one message the page sends that background.js answers with data: the strings of another language than the browser's (same check, same answer)
    async sendMessage(msg) {
      if (msg && msg.type === "rr:messages" && /^[a-z]{2,3}(_[A-Z]{2})?$/.test(msg.lang)) {
        try { return { ok: true, messages: await catalog(msg.lang) }; } catch (e) { return { ok: false }; }
      }
    }
  };

  const changed = {
    addListener: (fn) => { listeners.add(fn); },
    removeListener: (fn) => { listeners.delete(fn); },
    hasListener: (fn) => listeners.has(fn)
  };
  // (an ordinary page of Chrome has its own, nearly empty `chrome` -- loadTimes, csi, app -- which is writable but not configurable: it is replaced by
  // assignment, not defined anew)
  window.chrome = { storage: { sync: storageArea("sync"), local: storageArea("local"), onChanged: changed }, i18n, runtime };

  // ---- the page's scripts ------------------------------------------------------------------------------------------------------------------
  const add = (src) => new Promise((done, fail) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = done;
    s.onerror = () => fail(new Error("cannot load " + src));
    document.body.append(s);
  });

  // The folder that holds the interface language's strings is chosen by the extension's own lib/i18n.js resolve() (which also sets the page's lang
  // and direction), so that the words and the page agree. That file is one of the page's scripts: the strings are fetched as soon as it has run,
  // before the next script does.
  async function start() {
    const english = catalog("en");                    // (asked now, while the scripts load: the page preloads them)
    let ready = false;
    for (const src of SCRIPTS) {
      await add(src);
      if (!ready && globalThis.RolesRanks && globalThis.RolesRanks.i18n) {
        uiFolder = globalThis.RolesRanks.i18n.resolve(uiLanguage);
        catalogs.en = await english;
        if (uiFolder !== "en") catalogs[uiFolder] = await catalog(uiFolder);
        ready = true;
      }
    }
    if (!ready) throw new Error("none of the page's scripts defines RolesRanks.i18n: the strings were not loaded");
  }
  start().catch((e) => console.error("demo: " + e.message));
})();
