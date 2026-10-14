// Better Scholar Interactive Workspace & Demo:
// Powers live role toggling, instant multi-token search with operators, matrix cell filtering, H-core filtering, and multi-format exports.
(function () {
  var root = document.getElementById("demo");
  if (!root) return;

  var onRoles = { first: true, cofirst: true, second: true, last: true };
  var activeCellFilter = null; // e.g. "first:A" or "last:none"
  var activeMetricFilter = null; // "hcore" or "i10"
  var papers = [].slice.call(root.querySelectorAll(".paper"));
  var countEl = document.getElementById("demo-n");
  var searchInput = document.getElementById("demo-search-input");
  var operatorPills = [].slice.call(root.querySelectorAll("#demo-operator-pills .pill"));
  var matrixCells = [].slice.call(root.querySelectorAll(".mini-matrix .cell"));
  var hcoreBtn = document.getElementById("demo-hcore");
  var i10Btn = document.getElementById("demo-i10");
  var toastEl = document.getElementById("demo-toast");
  var codeDisplay = document.getElementById("export-code-display");
  var copyCodeBtn = document.getElementById("copy-export-display");
  var exportTabs = [].slice.call(document.querySelectorAll(".export-tabs .tab-btn"));
  var activeExportTab = "bibtex";

  // Data structure for the demo papers
  var demoData = [
    {
      id: "p1",
      role: "first",
      title: "Chord: A Scalable Peer-to-peer Lookup Protocol for Internet Applications",
      venue: "ACM SIGCOMM 2001",
      year: 2001,
      citations: 24510,
      ccf: "A",
      core: "A*",
      award: "★ Test of Time",
      authors: "Ion Stoica, Robert Morris, David Karger, M. Frans Kaashoek, Hari Balakrishnan"
    },
    {
      id: "p2",
      role: "last",
      title: "Spark: Cluster Computing with Working Sets",
      venue: "USENIX HotCloud 2010",
      year: 2010,
      citations: 16840,
      ccf: null,
      core: null,
      award: "★ Best Paper",
      authors: "Matei Zaharia, Mosharaf Chowdhury, Michael J. Franklin, Scott Shenker, Ion Stoica"
    },
    {
      id: "p3",
      role: "last",
      title: "Ray: A Distributed Framework for Emerging AI Applications",
      venue: "USENIX OSDI 2018",
      year: 2018,
      citations: 4120,
      ccf: "A",
      core: "A*",
      award: null,
      authors: "Philipp Moritz, Robert Nishihara, Stephanie Wang, Alexey Tumanov, Ion Stoica"
    },
    {
      id: "p4",
      role: "first",
      title: "An Architecture for Bounded-Latency Services in the Internet",
      venue: "IEEE Transactions on Networking 2001",
      year: 2001,
      citations: 2890,
      ccf: "A",
      core: null,
      award: null,
      authors: "Ion Stoica, Hui Zhang"
    },
    {
      id: "p5",
      role: "second",
      title: "Coflow: A Networking Abstraction for Cluster Applications",
      venue: "ACM HotNets 2012",
      year: 2012,
      citations: 1350,
      ccf: null,
      core: null,
      award: "★ Best Paper",
      authors: "Mosharaf Chowdhury, Ion Stoica"
    },
    {
      id: "p6",
      role: "cofirst",
      title: "L2P-FL: Latency-aware Personalized Federated Learning",
      venue: "IEEE INFOCOM 2024",
      year: 2024,
      citations: 185,
      ccf: "A",
      core: "A*",
      award: "Oral",
      authors: "Ion Stoica*, A Collaborator*, B Researcher, C Scientist"
    }
  ];

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("visible");
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(function () {
      toastEl.classList.remove("visible");
    }, 2500);
  }

  function matchesQuery(paper, q) {
    if (!q) return true;
    var tokens = q.trim().toLowerCase().split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (!tok) continue;
      // Citation operator
      if (/^[><=]+\d+$/.test(tok)) {
        var op = tok.match(/^[><=]+/)[0];
        var val = parseInt(tok.slice(op.length), 10);
        if (op === ">" && !(paper.citations > val)) return false;
        if (op === ">=" && !(paper.citations >= val)) return false;
        if (op === "<" && !(paper.citations < val)) return false;
        if (op === "<=" && !(paper.citations <= val)) return false;
        if (op === "=" && !(paper.citations === val)) return false;
        continue;
      }
      // Year operator
      if (/^(?:year:)?(>|>=|<|<=)?\d{4}$/.test(tok)) {
        var m = tok.match(/^(?:year:)?(>|>=|<|<=)?(\d{4})$/);
        var yOp = m[1] || "=";
        var yVal = parseInt(m[2], 10);
        if (yOp === ">" && !(paper.year > yVal)) return false;
        if (yOp === ">=" && !(paper.year >= yVal)) return false;
        if (yOp === "<" && !(paper.year < yVal)) return false;
        if (yOp === "<=" && !(paper.year <= yVal)) return false;
        if (yOp === "=" && !(paper.year === yVal)) return false;
        continue;
      }
      // CCF tier
      if (/^ccf:[abc]$/.test(tok)) {
        var t = tok.split(":")[1].toUpperCase();
        if (paper.ccf !== t) return false;
        continue;
      }
      // CORE tier
      if (/^core:(a\*|[abc])$/.test(tok)) {
        var c = tok.split(":")[1].toUpperCase();
        if (paper.core !== c) return false;
        continue;
      }
      // Role
      if (/^(?:role:|r:)(first|cofirst|second|last)$/.test(tok)) {
        var r = tok.replace(/^(?:role:|r:)/, "");
        if (paper.role !== r) return false;
        continue;
      }
      // Award / talk
      if (tok === "has:award" || tok === "is:award") {
        if (!paper.award || paper.award.indexOf("★") === -1) return false;
        continue;
      }
      if (tok === "has:talk") {
        if (paper.award !== "Oral" && paper.award !== "Spotlight") return false;
        continue;
      }
      // Plain text substring
      var corpus = (paper.title + " " + paper.venue + " " + paper.authors + " " + paper.year).toLowerCase();
      if (corpus.indexOf(tok) === -1) return false;
    }
    return true;
  }

  function getVisiblePapers() {
    var q = searchInput ? searchInput.value : "";
    return demoData.filter(function (d, i) {
      if (!onRoles[d.role]) return false;
      if (activeMetricFilter === "hcore" && d.citations < 142) return false;
      if (activeMetricFilter === "i10" && d.citations < 10) return false;
      if (activeCellFilter) {
        var parts = activeCellFilter.split(":");
        var r = parts[0], c = parts[1];
        if (d.role !== r) return false;
        if (c === "A" && d.ccf !== "A") return false;
        if (c === "none" && d.ccf !== null) return false;
      }
      if (!matchesQuery(d, q)) return false;
      return true;
    });
  }

  function paint() {
    var visible = getVisiblePapers();
    var visibleIds = visible.map(function (p) { return p.id; });
    var n = 0;

    papers.forEach(function (p) {
      var id = p.getAttribute("data-id");
      var isShown = visibleIds.indexOf(id) !== -1;
      p.classList.toggle("lit", isShown);
      p.style.display = isShown ? "" : "none";
      if (isShown) n++;
    });

    if (countEl) countEl.textContent = String(n);
    updateExportDisplay(visible);
  }

  function generateBibtex(items) {
    return items.map(function (p) {
      var key = p.authors.split(",")[0].trim().split(" ").pop() + p.year;
      return "@inproceedings{" + key + ",\n" +
        "  title = {" + p.title + "},\n" +
        "  author = {" + p.authors + "},\n" +
        "  booktitle = {" + p.venue + "},\n" +
        "  year = {" + p.year + "},\n" +
        (p.ccf ? "  note = {CCF " + p.ccf + (p.award ? ", " + p.award : "") + "}\n" : "") +
        "}";
    }).join("\n\n");
  }

  function generateJson(items) {
    return JSON.stringify({
      owner: "Ion Stoica",
      total: items.length,
      papers: items.map(function (p) {
        return {
          title: p.title,
          authors: p.authors,
          venue: p.venue,
          year: p.year,
          citations: p.citations,
          role: p.role,
          rank: { ccf: p.ccf, core: p.core },
          award: p.award || null
        };
      })
    }, null, 2);
  }

  function generateMarkdown(items) {
    return items.map(function (p) {
      var badges = [];
      if (p.ccf) badges.push("**CCF " + p.ccf + "**");
      if (p.core) badges.push("**CORE " + p.core + "**");
      if (p.award) badges.push("*" + p.award + "*");
      var badgeStr = badges.length ? " · " + badges.join(" · ") : "";
      return "- **" + p.title + "**\n  " + p.authors + " · *" + p.venue + "* (" + p.year + ")" + badgeStr + " · " + p.citations.toLocaleString() + " citations";
    }).join("\n\n");
  }

  function generateCsv(items) {
    var header = "Title,Authors,Venue,Year,Citations,Role,CCF,CORE,Award\n";
    var rows = items.map(function (p) {
      return '"' + p.title.replace(/"/g, '""') + '",' +
        '"' + p.authors.replace(/"/g, '""') + '",' +
        '"' + p.venue.replace(/"/g, '""') + '",' +
        p.year + ',' + p.citations + ',"' + p.role + '","' + (p.ccf || "") + '","' + (p.core || "") + '","' + (p.award || "") + '"';
    }).join("\n");
    return header + rows;
  }

  function updateExportDisplay(visibleItems) {
    if (!codeDisplay) return;
    var text = "";
    if (activeExportTab === "bibtex") text = generateBibtex(visibleItems);
    else if (activeExportTab === "json") text = generateJson(visibleItems);
    else if (activeExportTab === "markdown") text = generateMarkdown(visibleItems);
    else if (activeExportTab === "csv") text = generateCsv(visibleItems);
    codeDisplay.textContent = text || "// No matching publications found.";
  }

  // Role button click handlers
  root.querySelectorAll(".role-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var r = b.getAttribute("data-role");
      onRoles[r] = !onRoles[r];
      b.setAttribute("aria-pressed", String(onRoles[r]));
      paint();
    });
  });

  // Search input handler
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      operatorPills.forEach(function (p) {
        p.classList.toggle("active", p.getAttribute("data-query") === searchInput.value.trim());
      });
      paint();
    });
  }

  // Operator pills handlers
  operatorPills.forEach(function (pill) {
    pill.addEventListener("click", function () {
      var q = pill.getAttribute("data-query");
      if (searchInput) searchInput.value = q;
      operatorPills.forEach(function (p) { p.classList.remove("active"); });
      pill.classList.add("active");
      paint();
    });
  });

  // Matrix cells handler
  matrixCells.forEach(function (cell) {
    cell.addEventListener("click", function () {
      var filter = cell.getAttribute("data-filter");
      if (!filter || cell.classList.contains("zero")) return;
      if (activeCellFilter === filter) {
        activeCellFilter = null;
        cell.classList.remove("selected");
      } else {
        matrixCells.forEach(function (c) { c.classList.remove("selected"); });
        activeCellFilter = filter;
        cell.classList.add("selected");
      }
      paint();
    });
  });

  // H-Core and i10 buttons
  if (hcoreBtn) {
    hcoreBtn.addEventListener("click", function () {
      activeMetricFilter = (activeMetricFilter === "hcore") ? null : "hcore";
      hcoreBtn.classList.toggle("active", activeMetricFilter === "hcore");
      if (i10Btn) i10Btn.classList.remove("active");
      paint();
    });
  }
  if (i10Btn) {
    i10Btn.addEventListener("click", function () {
      activeMetricFilter = (activeMetricFilter === "i10") ? null : "i10";
      i10Btn.classList.toggle("active", activeMetricFilter === "i10");
      if (hcoreBtn) hcoreBtn.classList.remove("active");
      paint();
    });
  }

  // Export buttons in mini-panel
  root.querySelectorAll(".mini-export-bar .export-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fmt = btn.getAttribute("data-export");
      var visible = getVisiblePapers();
      var text = "";
      if (fmt === "bibtex") text = generateBibtex(visible);
      else if (fmt === "json") text = generateJson(visible);
      else if (fmt === "markdown") text = generateMarkdown(visible);
      else if (fmt === "csv") text = generateCsv(visible);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          showToast("Copied " + fmt.toUpperCase() + " (" + visible.length + " papers) to clipboard!");
        });
      }
      // Also switch active tab in showcase
      activeExportTab = fmt;
      exportTabs.forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-tab") === fmt); });
      updateExportDisplay(visible);
    });
  });

  // Export Showcase tabs
  exportTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      exportTabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      activeExportTab = tab.getAttribute("data-tab");
      updateExportDisplay(getVisiblePapers());
    });
  });

  // Copy code display button
  if (copyCodeBtn && codeDisplay) {
    copyCodeBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeDisplay.textContent).then(function () {
          showToast("Copied to clipboard!");
          copyCodeBtn.textContent = "Copied!";
          setTimeout(function () { copyCodeBtn.textContent = "Copy to clipboard"; }, 2000);
        });
      }
    });
  }

  // Keyboard navigation: "/" focuses search, "Escape" clears
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== searchInput && (!document.activeElement || document.activeElement.tagName !== "INPUT")) {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    } else if (e.key === "Escape") {
      if (searchInput && searchInput.value) searchInput.value = "";
      activeCellFilter = null;
      activeMetricFilter = null;
      matrixCells.forEach(function (c) { c.classList.remove("selected"); });
      if (hcoreBtn) hcoreBtn.classList.remove("active");
      if (i10Btn) i10Btn.classList.remove("active");
      operatorPills.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-query") === ""); });
      paint();
    }
  });

  paint();
})();
