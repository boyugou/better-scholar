// The only background code. Two things asked for by a message: a content script cannot open the options page, so the panel's settings
// button asks for it (rr:options); and a page asks for its language's strings (rr:messages), read from this extension's own files. And
// one note: when the extension is installed or updated, the profiles open at that moment have no script of it until they are reloaded,
// so the toolbar popup says so until it first reaches a profile (local reloadHint). No network, nothing else.
const cache = {};
chrome.runtime.onInstalled.addListener(({ reason }) => { if (reason === "install" || reason === "update") chrome.storage.local.set({ reloadHint: true }); });
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (sender.id !== chrome.runtime.id || !msg) return false;
  if (msg.type === "rr:options") chrome.runtime.openOptionsPage();
  if (msg.type === "rr:messages" && /^[a-z]{2,3}(_[A-Z]{2})?$/.test(msg.lang)) {
    (cache[msg.lang] = cache[msg.lang] || fetch(chrome.runtime.getURL("_locales/" + msg.lang + "/messages.json")).then((r) => r.json()))
      .then((m) => send({ ok: true, messages: m }), () => { delete cache[msg.lang]; send({ ok: false }); });
    return true;
  }
  return false;
});
