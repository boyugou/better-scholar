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
