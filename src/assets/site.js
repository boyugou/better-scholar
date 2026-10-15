// The language menu: closes on an outside click or Escape, and remembers the choice for the root page.
(function () {
  var menu = document.querySelector("details.lang");
  if (!menu) return;
  document.addEventListener("click", function (e) { if (!menu.contains(e.target)) menu.open = false; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.open) { menu.open = false; menu.querySelector("summary").focus(); } });
  menu.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[hreflang]");
    if (a) { try { localStorage.setItem("rr-lang", a.getAttribute("hreflang")); } catch (x) { /* no storage */ } }
  });
  var current = menu.querySelector('a[aria-current]');
  menu.addEventListener("toggle", function () { if (menu.open && current && current.scrollIntoView) current.scrollIntoView({ block: "nearest" }); });
})();

// The export samples: the tabs choose which format's text is shown (arrow keys, Home and End move between them, as in any tab list); the button copies it.
(function () {
  var card = document.querySelector(".export-card");
  if (!card) return;
  var tabs = [].slice.call(card.querySelectorAll('[role="tab"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      t.classList.toggle("active", on);
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { select(tab); });
    tab.addEventListener("keydown", function (e) {
      var forward = getComputedStyle(card).direction === "rtl" ? "ArrowLeft" : "ArrowRight", back = forward === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
      var to = e.key === forward ? i + 1 : e.key === back ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
      if (to < 0) return;
      e.preventDefault();
      var next = tabs[(to + tabs.length) % tabs.length];
      select(next);
      next.focus();
    });
  });
  var copy = card.querySelector(".copy-code-btn");
  copy.addEventListener("click", function () {
    var shown = card.querySelector('[role="tabpanel"]:not([hidden])');
    if (!shown || !navigator.clipboard) return;
    navigator.clipboard.writeText(shown.textContent).then(function () {
      copy.textContent = copy.getAttribute("data-copied");
      setTimeout(function () { copy.textContent = copy.getAttribute("data-label"); }, 2000);
    }, function () { /* the browser refused: nothing to say */ });
  });
})();
