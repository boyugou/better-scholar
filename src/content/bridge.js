// The calls of lib/agent.js (METHODS), on their two transports: the extension's own messages (the toolbar popup) and page events (scripts on the Scholar page: an AI
// browsing agent, the DevTools console). Both go through the same check of the parameters and the same answer: { id, ok: true, result } or { id, ok: false, error }.
// What a call does is in content/main.js; this file only carries it. The page events reach what the panel shows and the page's filters: they cannot read or change the
// settings, and a script on the page could read the same papers off the page itself.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});

  function install(methods) {
    const answer = (id, method, params) => {
      const checked = B.agent.validate(method, params);
      if (!checked.ok) return { id, ok: false, error: checked.error };
      try { return { id, ok: true, result: methods[method](checked.params) }; } catch (e) { return { id, ok: false, error: String((e && e.message) || e).slice(0, 200) }; }
    };

    // the toolbar popup (and the settings page): chrome.tabs.sendMessage reaches this extension's own pages only
    try {
      chrome.runtime.onMessage.addListener((msg, _sender, send) => {
        if (!msg || msg.type !== "rr:call") return false;
        send(answer(null, msg.method, msg.params));
        return false;
      });
    } catch (e) { /* extension context gone */ }

    // page events
    const { request, response, marker } = B.agent.EVENTS;
    document.addEventListener(request, (e) => {
      const d = e.detail;
      if (!d || typeof d !== "object") return;
      const id = typeof d.id === "string" || typeof d.id === "number" ? d.id : null;
      document.dispatchEvent(new CustomEvent(response, { detail: answer(id, d.method, d.params) }));
    });
    document.documentElement.setAttribute(marker, "true");
  }

  B.bridge = { install };
})();
