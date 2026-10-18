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

// How it reads a paper: the steps change the picture beside them. Step 0 is Scholar's page as it is; 1 to 4 add what the extension finds. It plays by itself
// while it is in view (not with reduced motion), and stops for good once a step is chosen; the button pauses and plays it. The page is written at step 4,
// so without the script the picture shows the whole story.
(function () {
  var how = document.querySelector(".how");
  if (!how) return;
  var stage = how.querySelector(".how-stage"), buttons = [].slice.call(how.querySelectorAll(".how-steps button")), toggle = how.querySelector(".how-play");
  var parts = [].slice.call(stage.querySelectorAll("[data-from]")), focusable = [].slice.call(stage.querySelectorAll("[data-focus]"));
  var DWELL = [1600, 3400, 3800, 3800, 5600], step = 4, timer = null, playing = false, chosen = false, seen = false;
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function show(n) {
    step = n;
    parts.forEach(function (el) { var from = +el.getAttribute("data-from"), to = +(el.getAttribute("data-to") || 4); el.classList.toggle("on", n >= from && n <= to); });
    focusable.forEach(function (el) { el.classList.remove("focus"); });
    if (n) setTimeout(function () { focusable.forEach(function (el) { if (+el.getAttribute("data-focus") === n && step === n) el.classList.add("focus"); }); }, 30);
    buttons.forEach(function (b, i) { if (i + 1 === n) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
    how.style.setProperty("--dwell", DWELL[n] + "ms");
  }
  function label() { toggle.querySelector("span").textContent = toggle.getAttribute(playing ? "data-pause" : "data-play"); }
  function next() { timer = setTimeout(function () { show((step + 1) % 5); next(); }, DWELL[step]); }
  function play() {
    if (playing) return;
    playing = true; how.classList.add("playing"); label();
    if (step === 4) show(0);
    next();
  }
  function pause() { playing = false; clearTimeout(timer); how.classList.remove("playing"); label(); }
  buttons.forEach(function (b, i) { b.addEventListener("click", function () { chosen = true; pause(); show(i + 1); }); });
  toggle.hidden = false;
  label();
  toggle.addEventListener("click", function () { if (playing) { chosen = true; pause(); } else { chosen = false; play(); } });
  if (still || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(function (entries) {
    var inView = entries[0].isIntersecting;
    if (inView && !chosen) { if (!seen) { seen = true; show(0); } play(); } else if (!inView && playing) pause();
  }, { threshold: 0.45 }).observe(stage);
})();
