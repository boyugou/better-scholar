// Scholar Lens — popup (informational).
//
// The live controls (role highlighting, venue badges, filters, metrics) live in
// the Author Highlighter panel injected into the Scholar page's right sidebar.
// This popup only reports whether the extension is active on the current tab and
// shows the role-color legend.

function setStatus(state, title, sub) {
  document.getElementById("statusDot").className = "status-dot " + state;
  document.getElementById("statusTitle").textContent = title;
  document.getElementById("statusSub").textContent = sub || "";
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = (tabs[0] && tabs[0].url) || "";
  if (/^https:\/\/scholar\.google\.[^/]+\/citations\?/.test(url)) {
    setStatus("on", "Active on this profile",
      "Adjust highlighting in the sidebar panel.");
  } else if (/^https:\/\/scholar\.google\./.test(url)) {
    setStatus("idle", "On Google Scholar",
      "Open an author profile to use the controls.");
  } else {
    setStatus("off", "Not on Google Scholar",
      "Visit a Scholar author profile to begin.");
  }
});

document.getElementById("clearCacheBtn").addEventListener("click", () => {
  const btn = document.getElementById("clearCacheBtn");
  chrome.runtime.sendMessage({ type: "CLEAR_VENUE_CACHE" }, () => {
    void chrome.runtime.lastError;
    btn.textContent = "Cache cleared";
    setTimeout(() => (btn.textContent = "Clear venue cache"), 1400);
  });
});
