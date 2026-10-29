// Toolbar popup: the same role × tier summary as the in-page panel, for the active tab.
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  const { h, t, tn, copyText } = B.dom;

  await B.dom.useLanguage();
  document.documentElement.lang = B.dom.langTag();
  document.documentElement.dir = B.dom.dir();
  document.getElementById("title").textContent = t("extName");
  const settings = document.getElementById("settings");
  settings.title = settings.ariaLabel = t("settingsOpen");
  settings.addEventListener("click", () => { chrome.runtime.openOptionsPage(); window.close(); });
  const main = document.getElementById("main");

  const COLOR = { first: "var(--rr-c-first, #1a73e8)", cofirst: "var(--rr-c-cofirst, #a142f4)", second: "var(--rr-c-second, #f9ab00)", last: "var(--rr-c-last, #1e8e3e)", middle: "#9aa0a6" };
  const ROLE = { first: "roleFirst", cofirst: "roleCofirst", second: "roleSecond", last: "roleLast", middle: "roleMiddle" };
  const MARK_KEY = { award: "markAward", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight", "spotlight+highlight": "markSpotlightHighlight", "oral+spotlight+highlight": "markTalks" };

  // a list's name without its edition note, unbreakable and isolated from right-to-left text ("CCF 2026")
  const listName = (label) => "\u2068" + String(label).replace(/\s*\(.*?\)\s*$/, "").replace(/ /g, "\u00a0") + "\u2069";

  function notProfile() {
    main.replaceChildren(
      h("p", { class: "empty" }, t("popupNotProfile")),
      // (Scholar's own "My profile" address: the person's profile when signed in; most people look at their own first)
      h("div", { class: "actions" }, h("a", { class: "btn primary", href: "https://scholar.google.com/citations", target: "_blank", rel: "noopener" }, t("popupMyProfile")),
        h("a", { class: "btn", href: "https://scholar.google.com/", target: "_blank", rel: "noopener" }, t("popupOpenScholar"))));
  }

  // The page's own tab (?tab=<id> lets the end-to-end test aim the popup at a specific tab) and a call to it: { ok: true, result } | { ok: false, error }
  async function pageTab() {
    const forced = parseInt(new URLSearchParams(location.search).get("tab"), 10);
    const [tab] = Number.isFinite(forced) ? [{ id: forced }] : await chrome.tabs.query({ active: true, currentWindow: true });
    return tab && tab.id != null ? tab : null;
  }
  async function call(method, params) {
    const tab = await pageTab();
    if (!tab) return null;
    try { return await chrome.tabs.sendMessage(tab.id, { type: "rr:call", method, params }); } catch (e) { return null; }
  }

  // `prefs`: the settings (what the table, the awards line and the copy row draw, in what order, under what names — the same switches as the panel's), `ui`: the ranking the panel's table last used
  function render(data, prefs, ui) {
    // Scholar's page layout changed: the panel says so and shows nothing else, and so does the popup
    if (data.layoutBroken) {
      main.replaceChildren(h("p", { class: "empty" }, t("layoutWarning")), h("div", { class: "actions" }, h("a", { class: "btn", href: B.dom.issueUrl("Scholar page layout changed", ""), target: "_blank", rel: "noopener" }, t("reportLink"))));
      return;
    }
    // the lists the table has a tab for; "none" = roles only
    const listed = B.prefs.sources(prefs);
    const sources = data.noRanks ? [] : listed;                     // (nothing on this profile is on a list that is on: roles only)
    let source = sources.includes(B.prefs.source(prefs, ui)) ? B.prefs.source(prefs, ui) : sources[0] || "none";
    const tp = prefs.panel.table;
    // what the "not ranked" column holds, kind by kind (on hover), as in the panel
    const unrankedWords = (s) => (s.unranked ? [["unrankedPreprints", s.unranked.preprint], ["unrankedSecondary", s.unranked.secondary], ["unrankedOther", s.unranked.other]].filter(([, n]) => n).map(([k, n]) => `${t(k)} ${n}`).join(" · ") : "");
    const draw = () => {
      const s = data.summaries[source];
      const tier = (c) => (c === "none" ? "–" : c);
      const name = (k) => t(k === "ccf" ? "srcCcf" : "srcCore");
      const seg = !tp.show ? null : sources.length > 1
        ? h("div", { class: "seg", role: "group" },
          ...sources.map((k) => h("button", { type: "button", "data-src": k, "aria-pressed": String(k === source), onClick: () => { source = k; draw(); const again = main.querySelector('.seg button[data-src="' + k + '"]'); if (again) again.focus(); } }, name(k))))
        : sources.length === 1 ? h("div", { class: "src" }, name(sources[0])) : null;
      const cols = s.columns.filter((c) => c !== "none" || tp.unranked);
      const showTotal = tp.total || !cols.length;                                     // (a table with no tier column has no number but the total: it is drawn whatever its switch says)
      // (the count of the "hidden" row is its only number: with no total column it takes the room of the columns)
      const hiddenRow = s.hidden && tp.hidden ? h("tr", {}, h("th", {}, h("span", { class: "dot", style: "background:#dadce0" }), t("roleHidden")),
        showTotal ? [cols.length ? h("td", { colspan: String(cols.length), class: "z" }, "") : null, h("td", { class: "t" }, String(s.hidden))] : h("td", { colspan: String(Math.max(1, cols.length)), class: "t" }, String(s.hidden))) : null;
      const table = h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, h("span", { class: "sr" }, t("colRole"))), ...cols.map((c) => h("th", c === "none" ? { title: [t("tipUnranked"), unrankedWords(s)].filter(Boolean).join("\n") } : {}, tier(c))), showTotal ? h("th", { class: "rr-col-total" }, t("colTotal")) : null)),
        h("tbody", {}, ...s.rows.filter((r) => r.role !== "middle" || tp.other).map((r) => h("tr", {},
          h("th", {}, h("span", { class: "dot", style: "background:" + COLOR[r.role] }), t(ROLE[r.role])),
          ...cols.map((c) => h("td", { class: r[c] ? "" : "z" }, ...(r[c] ? [String(r[c])] : [h("span", { "aria-hidden": "true" }, "·"), h("span", { class: "sr" }, "0")]))),
          showTotal ? h("td", { class: "t" }, String(r.total)) : null)), hiddenRow),
        showTotal ? h("tfoot", {}, h("tr", {}, h("th", {}, t("colTotal")), ...cols.map((c) => h("td", {}, String(s.totals[c]))), h("td", {}, String(s.totals.total)))) : null);
      const mp = prefs.panel.marks;
      const markParts = !mp.show ? [] : B.marks.rows(mp.grouping).filter((g) => (data.marks || {})[g]).map((g) => t(MARK_KEY[g]) + "\u00a0" + data.marks[g]);          // (a count never stands alone at the start of a line)
      // A copy button: the text comes from the page (the same as the panel's button) and goes to the clipboard — the CSV to a file. What there is to say is said on the button.
      const say = (button, text, ok = true) => {
        const old = button.dataset.label || (button.dataset.label = button.textContent);
        clearTimeout(button.rrTimer);
        // (the button keeps the width of its own label, so that the shorter word does not let the buttons after it move up: the next click would land on another one;
        // at most the row's width — a long label wraps there)
        if (!button.style.minWidth) { const was = button.style.cssText; button.style.cssText = "flex:none;min-width:0;width:max-content"; const w = Math.ceil(button.getBoundingClientRect().width); button.style.cssText = was; button.style.minWidth = `min(${w}px, 100%)`; }
        button.textContent = text;
        const live = document.getElementById("live");          // (a button that changes its words is not read out: the status is)
        if (live) { live.textContent = text; clearTimeout(live.rrTimer); live.rrTimer = setTimeout(() => { live.textContent = ""; }, 1500); }
        if (ok) button.classList.add("btn-flashed");
        button.rrTimer = setTimeout(() => { button.textContent = old; button.classList.remove("btn-flashed"); button.style.minWidth = ""; }, 1200);
      };
      const deliver = (kind) => async (e) => {
        const button = e.target.closest("button") || e.target;
        const paperFormat = kind !== "summary" && kind !== "table" && kind !== "image";
        if (paperFormat && !data.shown) { say(button, t("copyEmpty"), false); return; }
        const res = await call("export", { format: kind, html: true, ...(paperFormat ? {} : { source }) });
        if (!res || !res.ok) { if (kind === "image") say(button, t("copyFailed"), false); return; }
        if (kind === "csv") { B.dom.downloadFile(((data.owner || "scholar").trim().replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_") || "scholar") + "-papers.csv", res.result.text); say(button, t("exported")); }
        else if (kind === "image") {          // (the page draws the picture and sends it as a data: address)
          let blob = null;
          try { blob = res.result.png ? await (await fetch(res.result.png)).blob() : null; } catch (err) { /* said below */ }
          if (blob && await B.dom.copyImage(blob, res.result.text)) say(button, t("copied")); else say(button, t("copyFailed"), false);
        }
        else if (await copyText(res.result.text, res.result.html)) say(button, t("copied"));
      };
      const copyKinds = prefs.panel.copy.show ? B.prefs.copyButtons(prefs) : [];
      const copyBar = copyKinds.length ? h("div", { class: "actions" },
        ...copyKinds.map((kind) => h("button", { class: "btn", "data-act": "copy-" + kind, type: "button", onClick: deliver(kind) }, t(B.dom.COPY_LABEL[kind])))) : null;
      // (replaceChildren would print a literal "null" for an absent part, so absent parts are dropped first)
      main.replaceChildren(...[
        h("div", { class: "who" }, h("b", { title: data.owner }, data.owner),
          // (a paper whose author list does not have the profile name is not in the table: "19 of 20 papers", and the tooltip says why)
          h("span", { title: s.absent > 0 ? tn("coverAbsent", s.absent, [String(s.absent)]) : null },
            data.loadingAll ? t("loadingAll", [String(data.loaded)])                         // (the list is still being loaded: the table is not final)
              : s.absent > 0 ? t("popupPapersOf", [String(data.loaded - s.absent), String(data.loaded)]) : tn("popupPapers", data.loaded, [String(data.loaded)]))),
        tp.show ? seg : null, tp.show ? table : null,
        tp.show && source !== "none" && tp.unranked ? h("p", { class: "legend" }, "– " + t("tipUnranked")) : null,
        tp.show && source !== "none" && data.mapped && data.mapped[source] ? h("p", { class: "legend", "data-rr": "mapped" }, B.dom.tn("coverMapped", data.mapped[source], [String(data.mapped[source])])) : null,          // (the panel's own line)          // (ranks the person mapped by hand are counted, and said to be)
        markParts.length ? h("p", { class: "marks", title: t("marksHint") }, mp.title ? h("b", {}, t("marksTitle") + B.dom.colon()) : null, markParts.join(" · ")) : null,
        copyBar,
        tp.show && tp.note && (data.noRanks || sources.length) ? h("p", { class: "note" }, t(data.noRanks ? "noRanksNote" : "dataNote", [(listed.length ? listed : ["ccf", "core"]).map((k) => listName(data.edition[k])).join(" · ")])) : null
      ].filter(Boolean));
    };
    draw();
  }

  main.replaceChildren(h("p", { class: "empty", role: "status" }, t("popupReading")));
  const answer = await call("summary");
  if (answer && answer.ok) { const prefs = await B.store.loadPrefs(); B.dom.setLabels(prefs.labels); render(answer.result, prefs, await B.store.loadUi()); } else notProfile();
})();
