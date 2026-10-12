// Tiny DOM helpers shared by the panel and the popup. No framework, no innerHTML.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});

  // h("div", { class: "x", onClick: fn, dataset: { a: 1 } }, "text", childNode, [more])
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.length > 2 && k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, String(v));
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return el;
  }

  // chrome.i18n lookup; falls back to the key so a missing string is visible, not blank.
  function t(key, subs) {
    try {
      const m = chrome.i18n.getMessage(key, subs);
      if (m) return m;
    } catch (e) { /* extension context gone */ }
    return key;
  }

  // Like t() but prefers "<key>One" when n === 1 (English singular); other locales simply omit it.
  function tn(key, n, subs) {
    if (n === 1) {
      try {
        const m = chrome.i18n.getMessage(key + "One", subs);
        if (m) return m;
      } catch (e) { /* fall through */ }
    }
    return t(key, subs);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = h("textarea", { style: "position:fixed;left:-9999px;opacity:0" });
      ta.value = text;
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { /* ignore */ }
      ta.remove();
      return ok;
    }
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function frame(fn) {
    let queued = false;
    return () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(); });
    };
  }

  B.dom = { h, t, tn, copyText, sleep, frame };
})();
