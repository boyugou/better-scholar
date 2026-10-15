// "Open Scholar in": when the settings name a language, a Scholar page (search results, a profile) that is opened with another `hl=` is opened
// again with the chosen one. This is all this script does: it runs at document start on Scholar's pages, reads one setting, and says nothing to
// anyone. (Downloads and redirects such as /scholar.bib and /scholar_url are not touched: only /scholar and /citations are.)
(function () {
  "use strict";
  const B = globalThis.RolesRanks;
  if (!B || !B.i18n || !/^\/(scholar|citations)\/?$/.test(location.pathname)) return;
  let stored;
  try { stored = chrome.storage.sync.get("prefs"); } catch (e) { return; }                     // (extension context gone)
  const KEY = "rr-hl", WINDOW = 15000;
  const read = () => { try { return sessionStorage.getItem(KEY) || ""; } catch (e) { return ""; } };
  const mark = (v) => { try { sessionStorage.setItem(KEY, v); return true; } catch (e) { return false; } };
  const clear = () => { try { sessionStorage.removeItem(KEY); } catch (e) { /* no storage */ } };
  stored.then((r) => {
    const prefs = (r && r.prefs) || {};
    const hl = B.i18n.scholarHl(prefs.scholarLanguage);                                  // ("" for "keep" and for anything that is not a language we have)
    if (!hl) { clear(); return; }
    if ((new URLSearchParams(location.search).get("hl") || "").toLowerCase() === hl.toLowerCase()) { clear(); return; }       // arrived: a later change may redirect again
    // At most once per tab and language within a short while: should Scholar answer with yet another language, it is left as it is rather than looped over.
    // (Without a place to remember it there is no protection against that, so then there is no redirect either.)
    const [was, at] = read().split("|");
    if (was === hl && Date.now() - Number(at || 0) < WINDOW) return;
    if (!mark(hl + "|" + Date.now())) return;
    // the rest of the address stays exactly as it was: only `hl` is replaced (a query in another encoding must not be rewritten)
    const rest = location.search.slice(1).split("&").filter((p) => p && !/^hl(=|$)/i.test(p));
    rest.push("hl=" + encodeURIComponent(hl));
    location.replace(location.pathname + "?" + rest.join("&") + location.hash);
  }).catch(() => { /* no storage: leave the page alone */ });
})();
