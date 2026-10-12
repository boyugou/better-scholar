// The only background code: a content script cannot open the options page, so the panel's settings button
// asks for it with a message and this opens it. No network, no storage, nothing else.
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id === chrome.runtime.id && msg && msg.type === "rr:options") chrome.runtime.openOptionsPage();
});
