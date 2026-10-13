// "Open Scholar in": when the settings name a language, a Scholar page (search results, a profile) that is opened with another `hl=` is opened
// again with the chosen one. This is all this script does: it runs at document start on Scholar's search and profile pages, reads one setting,
// and says nothing to anyone. (Downloads and redirects such as /scholar.bib and /scholar_url are not touched.)
(function () {
  "use strict";
  const B = globalThis.RolesRanks;
  if (!B || !B.i18n || !/^\/(scholar|citations)\/?$/.test(location.pathname)) return;
  let stored;
  try { stored = chrome.storage.sync.get("prefs"); } catch (e) { return; }                     // (extension context gone)
  stored.then((r) => {
    const prefs = (r && r.prefs) || {};
    const hl = B.i18n.scholarHl(B.i18n.normalizeScholarLanguage(prefs.scholarLanguage));
    const url = new URL(location.href);
    let tried = false;
    try { tried = sessionStorage.getItem("rr-hl") === hl; } catch (e) { /* no storage */ }
    if (!hl) { try { sessionStorage.removeItem("rr-hl"); } catch (e) { /* no storage */ } return; }
    if (url.searchParams.get("hl") === hl) { try { sessionStorage.removeItem("rr-hl"); } catch (e) { /* no storage */ } return; }       // arrived: a later change may redirect again
    // at most once per tab and language: should Scholar answer with yet another language, it is left as it is rather than looping
    if (tried) return;
    try { sessionStorage.setItem("rr-hl", hl); } catch (e) { /* no storage */ }
    url.searchParams.set("hl", hl);
    location.replace(url.href);
  }).catch(() => { /* no storage: leave the page alone */ });
})();
