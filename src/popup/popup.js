// Toolbar popup: the same role × tier summary as the in-page panel, for the active tab.
(async function () {
  "use strict";
  const B = globalThis.RolesRanks;
  const { h, t, tn, copyText } = B.dom;
  const metrics = B.metrics;

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
  const COPY = { first: "copyFirst", cofirst: "copyCofirst", second: "copySecond", last: "copyLast", middle: "copyMiddle" };

  function notProfile() {
    main.replaceChildren(
      h("p", { class: "empty" }, t("popupNotProfile")),
      h("div", { class: "actions" }, h("a", { class: "btn primary", href: "https://scholar.google.com/", target: "_blank", rel: "noopener" }, t("popupOpenScholar"))));
  }

  async function ask() {
    // ?tab=<id> lets the end-to-end test aim the popup at a specific tab
    const forced = parseInt(new URLSearchParams(location.search).get("tab"), 10);
    const [tab] = Number.isFinite(forced) ? [{ id: forced }] : await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) return null;
    try { return await chrome.tabs.sendMessage(tab.id, { type: "rr:summary" }); } catch (e) { return null; }
  }

  function render(data) {
    // the lists switched on in the settings; "none" = roles only
    const sources = data.sources || ["ccf", "core"];
    let source = sources.includes(data.source) ? data.source : sources[0] || "none";
    const labels = () => Object.fromEntries(Object.entries(COPY).map(([k, v]) => [k, t(v)]));
    const draw = () => {
      const s = data.summaries[source];
      const tier = (c) => (c === "none" ? "–" : c);
      const name = (k) => t(k === "ccf" ? "srcCcf" : "srcCore");
      const seg = sources.length > 1
        ? h("div", { class: "seg", role: "group" },
          ...sources.map((k) => h("button", { type: "button", "aria-pressed": String(k === source), onClick: () => { source = k; draw(); } }, name(k))))
        : sources.length === 1 ? h("div", { class: "src" }, name(sources[0])) : null;
      const table = h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}), ...s.columns.map((c) => h("th", {}, tier(c))), h("th", {}, t("colTotal")))),
        h("tbody", {}, ...s.rows.map((r) => h("tr", {},
          h("th", {}, h("span", { class: "dot", style: "background:" + COLOR[r.role] }), t(ROLE[r.role])),
          ...s.columns.map((c) => h("td", { class: r[c] ? "" : "z" }, r[c] ? String(r[c]) : "·")),
          h("td", { class: "t" }, String(r.total)))),
          s.hidden ? h("tr", {}, h("th", {}, h("span", { class: "dot", style: "background:#dadce0" }), t("roleHidden")), h("td", { colspan: String(s.columns.length), class: "z" }, ""), h("td", { class: "t" }, String(s.hidden))) : null),
        h("tfoot", {}, h("tr", {}, h("th", {}, t("colTotal")), ...s.columns.map((c) => h("td", {}, String(s.totals[c]))), h("td", {}, String(s.totals.total)))));
      const parts = data.parts || { summary: true, marks: true };
      const markParts = !parts.marks ? [] : B.marks.rows(data.talkRows).filter((g) => (data.marks || {})[g]).map((g) => t(MARK_KEY[g]) + " " + data.marks[g]);
      const marksLine = markParts.length ? t("marksTitle") + ": " + markParts.join(", ") + " (" + t("marksAsWritten") + ")" : "";
      const copy = (kind) => async (e) => {
        const text = kind === "tsv"
          ? metrics.toTsv(s, { label: labels(), header: t("tsvRole"), total: t("tsvTotal"), notRanked: t("tipUnranked") })
          : metrics.toText(s, { owner: data.owner, label: labels(), notRanked: t("tipUnranked").toLowerCase(), extra: marksLine ? [marksLine] : [], edition: source === "none" ? "" : `${data.edition[source]} — ${t("tipToday")}` });
        if (await copyText(text)) { const b = e.target; const old = b.textContent; b.textContent = t("copied"); setTimeout(() => (b.textContent = old), 1200); }
      };
      // (replaceChildren would print a literal "null" for an absent part, so absent parts are dropped first)
      main.replaceChildren(...[
        h("div", { class: "who" }, h("b", {}, data.owner),
          // (a paper whose author list does not have the profile name is not in the table: "19 of 20 papers", and the tooltip says why)
          h("span", { title: s.absent > 0 ? tn("coverAbsent", s.absent, [String(s.absent)]) : null },
            s.absent > 0 ? `${data.loaded - s.absent} ${t("metricsOf")} ${tn("popupPapers", data.loaded, [String(data.loaded)])}` : tn("popupPapers", data.loaded, [String(data.loaded)]))),
        parts.summary ? seg : null, parts.summary ? table : null,
        markParts.length ? h("p", { class: "marks", title: t("marksHint") }, h("b", {}, t("marksTitle") + ": "), markParts.join(" · ")) : null,
        parts.summary ? h("div", { class: "actions" },
          h("button", { class: "btn", type: "button", onClick: copy("text") }, t("copySummary")),
          h("button", { class: "btn", type: "button", onClick: copy("tsv") }, t("copyTable"))) : null,
        parts.summary ? h("p", { class: "note" }, t("dataNote", [(sources.length ? sources : ["ccf", "core"]).map((k) => data.edition[k]).join(" · ")])) : null
      ].filter(Boolean));
    };
    draw();
  }

  main.replaceChildren(h("p", { class: "empty" }, t("popupReading")));
  const data = await ask();
  if (data && data.ok) render(data); else notProfile();
})();
