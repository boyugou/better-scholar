// The "Try it" demo: a role button switches that role's rows on and off, the count follows.
(function () {
  var root = document.getElementById("demo");
  if (!root) return;
  var on = { first: true, cofirst: true, second: true, last: true };
  var papers = [].slice.call(root.querySelectorAll(".paper"));
  var count = document.getElementById("demo-n");
  function paint() {
    var n = 0;
    papers.forEach(function (p) {
      var lit = !!on[p.getAttribute("data-role")];
      p.classList.toggle("lit", lit);
      if (lit) n++;
    });
    count.textContent = String(n);
  }
  root.querySelectorAll(".role-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var r = b.getAttribute("data-role");
      on[r] = !on[r];
      b.setAttribute("aria-pressed", String(on[r]));
      paint();
    });
  });
  paint();
})();
