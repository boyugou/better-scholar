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
      h("div", { class: "actions" }, h("a", { class: "btn primary", href: "https://scholar.google.com/", target: "_blank", rel: "noopener" }, t("popupOpenScholar"))));
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

  function render(data) {
    // Scholar's page layout changed: the panel says so and shows nothing else, and so does the popup
    if (data.layoutBroken) {
      main.replaceChildren(h("p", { class: "empty" }, t("layoutWarning")), h("div", { class: "actions" }, h("a", { class: "btn", href: B.dom.issueUrl("Scholar page layout changed", ""), target: "_blank", rel: "noopener" }, t("reportLink"))));
      return;
    }
    // the lists switched on in the settings; "none" = roles only
    const listed = data.sources || ["ccf", "core"];
    const sources = data.noRanks ? [] : listed;                     // (nothing on this profile is on a list that is on: roles only)
    let source = sources.includes(data.source) ? data.source : sources[0] || "none";
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
          s.hidden ? h("tr", {}, h("th", {}, h("span", { class: "dot", style: "background:#dadce0" }), t("roleHidden")), s.columns.length ? h("td", { colspan: String(s.columns.length), class: "z" }, "") : null, h("td", { class: "t" }, String(s.hidden))) : null),
        h("tfoot", {}, h("tr", {}, h("th", {}, t("colTotal")), ...s.columns.map((c) => h("td", {}, String(s.totals[c]))), h("td", {}, String(s.totals.total)))));
      const parts = data.parts || { summary: true, marks: true };
      const markParts = !parts.marks ? [] : B.marks.rows(data.talkRows).filter((g) => (data.marks || {})[g]).map((g) => t(MARK_KEY[g]) + " " + data.marks[g]);
      // A copy button: the text comes from the page (the same as the panel's button) and goes to the clipboard — the CSV to a file. What there is to say is said on the button.
      const say = (button, text, ok = true) => {
        const old = button.dataset.label || (button.dataset.label = button.textContent);
        clearTimeout(button.rrTimer);
        button.textContent = text;
        if (ok) button.classList.add("btn-flashed");
        button.rrTimer = setTimeout(() => { button.textContent = old; button.classList.remove("btn-flashed"); }, 1200);
      };
      const deliver = (kind) => async (e) => {
        const button = e.target.closest("button") || e.target;
        const paperFormat = kind !== "summary" && kind !== "table";
        if (paperFormat && !data.shown) { say(button, t("copyEmpty"), false); return; }
        const res = await call("export", { format: kind, ...(paperFormat ? {} : { source }) });
        if (!res || !res.ok) return;
        if (kind === "csv") { B.dom.downloadFile(((data.owner || "scholar").trim().replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_") || "scholar") + "-papers.csv", res.result.text); say(button, t("exported")); }
        else if (await copyText(res.result.text)) say(button, t("copied"));
      };
      const copyBar = data.copyButtons.length ? h("div", { class: "actions" },
        ...data.copyButtons.map((kind) => h("button", { class: "btn", "data-act": "copy-" + kind, type: "button", onClick: deliver(kind) }, t(B.dom.COPY_LABEL[kind])))) : null;
      // (replaceChildren would print a literal "null" for an absent part, so absent parts are dropped first)
      main.replaceChildren(...[
        h("div", { class: "who" }, h("b", {}, data.owner),
          // (a paper whose author list does not have the profile name is not in the table: "19 of 20 papers", and the tooltip says why)
          h("span", { title: s.absent > 0 ? tn("coverAbsent", s.absent, [String(s.absent)]) : null },
            data.loadingAll ? t("loadingAll", [String(data.loaded)])                         // (the list is still being loaded: the table is not final)
              : s.absent > 0 ? t("popupPapersOf", [String(data.loaded - s.absent), String(data.loaded)]) : tn("popupPapers", data.loaded, [String(data.loaded)]))),
        parts.summary ? seg : null, parts.summary ? table : null,
        parts.summary && source !== "none" ? h("p", { class: "legend" }, "– " + t("tipUnranked")) : null,
        markParts.length ? h("p", { class: "marks", title: t("marksHint") }, h("b", {}, t("marksTitle") + ": "), markParts.join(" · ")) : null,
        copyBar,
        parts.summary && (data.noRanks || sources.length) ? h("p", { class: "note" }, t(data.noRanks ? "noRanksNote" : "dataNote", [(listed.length ? listed : ["ccf", "core"]).map((k) => listName(data.edition[k])).join(" · ")])) : null
      ].filter(Boolean));
    };
    draw();
  }

  main.replaceChildren(h("p", { class: "empty" }, t("popupReading")));
  const answer = await call("summary");
  if (answer && answer.ok) render(answer.result); else notProfile();
})();
