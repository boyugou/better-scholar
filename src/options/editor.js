// The preview as a place to edit. Hover a part of it and a small tag offers to hide it (✕), to rename it (✎, for a text that has a name) and to move it (⠿, for what has an
// order); a part of the panel also has a rail at its left edge to hide or move the whole part. Double-click a name to rename it. What was hidden is in a tray above the
// preview, one click to show it again. All of it changes the settings the controls on the left change (the page's put / save), so the two sides are one record.
//
// The preview's own DOM is drawn again after every change, so nothing here lives in it: the overlays are children of the preview's card, placed by measuring, and the page
// calls refresh() after it has drawn the preview. What the panel marks for this module: data-rr-part (the path of the switch that draws it), data-rr-label (the message
// key of a text with a name), data-rr-order on a container (the path of its order setting) with data-rr-item (or data-section) on its items, data-rr-axis="x" for a row.
(function () {
  "use strict";
  const B = globalThis.RolesRanks;
  const { h, t } = B.dom;

  // ctx: aside (the scroll box of the preview), host (its card: where the overlays go), tray (where the tray goes), at / put / save (the page's own), partName(path) → words,
  //      hiddenParts() → [{ path, name }] (the switches that are off and could be turned on from here)
  function attach({ aside, host, tray: trayHost, at, put, save, partName, hiddenParts }) {
    let current = null, hideTimer = 0, dragging = null, renaming = null, frame = 0;

    const btn = (cls, text, label, onClick) => h("button", { type: "button", class: "pv-btn " + cls, title: label, "aria-label": label, tabindex: "-1", onClick }, text);
    const tag = h("div", { class: "pv-tag", hidden: true });
    const rail = h("div", { class: "pv-rail", hidden: true });
    const drop = h("div", { class: "pv-drop", hidden: true });
    host.append(tag, rail, drop);
    for (const box of [tag, rail]) {
      box.addEventListener("pointerenter", () => clearTimeout(hideTimer));
      box.addEventListener("pointerleave", () => schedule());
    }

    const rel = (el) => { const r = el.getBoundingClientRect(), b = host.getBoundingClientRect(); return { left: r.left - b.left, top: r.top - b.top, width: r.width, height: r.height }; };
    const hide = () => { current = null; tag.hidden = true; rail.hidden = true; };
    const schedule = () => { clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (!dragging) hide(); }, 160); };

    // the order a part belongs to: the container that carries data-rr-order, and the part's id in it
    const groupOf = (el) => {
      const item = el.closest("[data-rr-item], [data-section]");
      const box = item && item.parentElement && item.parentElement.closest("[data-rr-order]");
      return item && box && box.contains(item) ? { item, box, id: item.dataset.rrItem !== undefined ? item.dataset.rrItem : item.dataset.section } : null;
    };
    const hidePart = (path) => { hide(); put(path, false); save(); };

    function show(el) {
      if (el === current) return;
      clearTimeout(hideTimer);
      current = el;
      const path = el.dataset.rrPart, sec = el.closest("[data-section]"), labelEl = el.closest("[data-rr-label]"), isSection = el === sec;
      // the tag: for a thing in a part (the part itself has its rail)
      tag.replaceChildren();
      if (!isSection) {
        const g = groupOf(el);
        if (g && g.item === el) tag.append(btn("pv-grip", "⠿", t("optDragMove"), null));
        if (labelEl) tag.append(btn("pv-edit", "✎", t("optRename"), () => openRename(labelEl)));
        tag.append(btn("pv-x", "✕", `${t("optHide")}: ${partName(path)}`, () => hidePart(path)));
        if (tag.firstChild && tag.firstChild.classList.contains("pv-grip")) tag.firstChild.addEventListener("pointerdown", (e) => startDrag(e, g));
        const r = rel(el);
        tag.hidden = false;
        tag.style.left = Math.max(0, r.left) + "px";
        tag.style.top = Math.max(0, r.top - tag.offsetHeight + 3) + "px";
      } else tag.hidden = true;
      // the rail: the whole part, at its left edge (inside the part's own margin)
      rail.replaceChildren();
      if (sec && sec.dataset.section) {
        const g = groupOf(sec), spath = `panel.${sec.dataset.section}.show`, r = rel(sec);
        const grip = btn("pv-grip", "⠿", t("optDragMove"), null);
        grip.addEventListener("pointerdown", (e) => startDrag(e, g));
        rail.append(grip, btn("pv-x", "✕", `${t("optHide")}: ${partName(spath)}`, () => hidePart(spath)));
        rail.hidden = false;
        rail.style.left = Math.max(0, r.left) + "px";
        rail.style.top = r.top + "px";
        rail.style.height = Math.min(r.height, 62) + "px";
      } else rail.hidden = true;
    }

    aside.addEventListener("pointermove", (e) => {
      if (dragging || renaming) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = e.target.closest ? e.target.closest("[data-rr-part]") : null;
        if (el && aside.contains(el)) show(el); else schedule();
      });
    });
    aside.addEventListener("pointerleave", () => schedule());
    aside.addEventListener("dblclick", (e) => { const el = e.target.closest && e.target.closest("[data-rr-label]"); if (el && aside.contains(el)) { e.preventDefault(); openRename(el); } });

    // ---- moving a part or a button: drag the grip; a bar says where it would go; letting go puts it there (Escape gives up) ----------------------------------------------
    function startDrag(e, g) {
      if (!g || e.button > 0) return;
      e.preventDefault();
      clearTimeout(hideTimer);
      const items = [...g.box.children].filter((c) => (c.dataset.rrItem !== undefined || c.dataset.section !== undefined) && !c.hidden && c.offsetParent);
      const idOf = (c) => (c.dataset.rrItem !== undefined ? c.dataset.rrItem : c.dataset.section);
      dragging = { path: g.box.dataset.rrOrder, horizontal: g.box.dataset.rrAxis === "x", items, idOf, from: g.id, target: null };
      g.item.classList.add("pv-dragged");
      document.body.classList.add("pv-dragging");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("keydown", onKey, true);
    }
    function onMove(e) {
      let best = null, bestD = Infinity;
      for (const it of dragging.items) {
        const r = it.getBoundingClientRect(), d = Math.hypot(e.clientX - (r.left + r.width / 2), dragging.horizontal ? (e.clientY - (r.top + r.height / 2)) * 2 : e.clientY - (r.top + r.height / 2));
        if (d < bestD) { bestD = d; best = it; }
      }
      if (!best) return;
      const r = best.getBoundingClientRect(), after = dragging.horizontal ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
      dragging.target = { id: dragging.idOf(best), after };
      const b = host.getBoundingClientRect();
      drop.hidden = false;
      if (dragging.horizontal) Object.assign(drop.style, { left: (after ? r.right : r.left) - b.left - 1 + "px", top: r.top - b.top + "px", width: "3px", height: r.height + "px" });
      else Object.assign(drop.style, { left: r.left - b.left + "px", top: (after ? r.bottom : r.top) - b.top - 1 + "px", width: r.width + "px", height: "3px" });
    }
    function endDrag() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey, true);
      document.body.classList.remove("pv-dragging");
      for (const it of dragging.items) it.classList.remove("pv-dragged");
      drop.hidden = true;
      const d = dragging;
      dragging = null;
      return d;
    }
    function onUp() {
      const d = endDrag();
      if (!d || !d.target || d.target.id === d.from) return;
      const order = at(d.path).filter((id) => id !== d.from);
      const to = order.indexOf(d.target.id) + (d.target.after ? 1 : 0);
      order.splice(to, 0, d.from);
      if (order.join() !== at(d.path).join()) { hide(); put(d.path, order); save(); }
    }
    function onKey(e) {
      if (e.key !== "Escape") return;
      e.preventDefault(); e.stopPropagation();
      window.removeEventListener("pointerup", onUp);
      endDrag();
    }

    // ---- renaming: an input over the text; Enter or leaving the box keeps it, Escape does not, an empty box is the standard name ----------------------------------------------
    function openRename(el) {
      closeRename(false);
      const key = el.dataset.rrLabel, def = B.dom.tDefault(key), r = rel(el);
      const input = h("input", { type: "text", class: "pv-rename-input", maxlength: String(B.prefs.NAME_MAX), spellcheck: "false", "aria-label": `${def} — ${t("optNameOf")}`, value: at("labels." + key) || def });
      const box = h("div", { class: "pv-rename" }, input, h("span", { class: "pv-rename-hint" }, t("optRenameHint")));
      renaming = { key, def, input, box, done: false };
      hide();
      host.append(box);
      box.style.left = Math.max(0, r.left - 4) + "px";
      box.style.top = Math.max(0, r.top - 6) + "px";
      box.style.minWidth = Math.max(176, r.width + 8) + "px";
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); closeRename(true); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeRename(false); }
      });
      input.addEventListener("blur", () => closeRename(true));
      input.focus();
      input.select();
    }
    function closeRename(keep) {
      const r = renaming;
      if (!r || r.done) return;
      r.done = true;
      renaming = null;
      const words = r.input.value.replace(/\s+/g, " ").trim();
      r.box.remove();
      if (keep && words !== (at("labels." + r.key) || r.def)) { put("labels." + r.key, words === r.def ? "" : words); save(); }
    }

    // ---- what was hidden: the tray ------------------------------------------------------------------------------------------------------------------------------------------
    const summary = h("summary", {});
    const list = h("div", { class: "pv-tray-list" });
    const tray = h("details", { class: "pv-tray", hidden: true }, summary, list);
    trayHost.append(tray);
    function refreshTray() {
      const hiddenNow = hiddenParts();
      tray.hidden = !hiddenNow.length;
      summary.textContent = t("optHiddenTray", [String(hiddenNow.length)]);
      list.replaceChildren(...hiddenNow.map(({ path, name }) => h("button", { type: "button", class: "pv-chip", "data-restore": path, title: t("optShowAgain"), "aria-label": `${t("optShowAgain")}: ${name}`,
        onClick: () => { put(path, true); save(); } }, "＋ " + name)));
    }

    // ---- from the controls to the preview: the part a setting draws is outlined, and brought into view ------------------------------------------------------------------------
    let marked = [];
    function highlight(path, labelKey) {
      for (const el of marked) el.classList.remove("pv-hot");
      marked = [];
      if (!path && !labelKey) return;
      const sel = path ? `[data-rr-part="${path}"]` : `[data-rr-label="${labelKey}"]`;
      marked = [...aside.querySelectorAll(sel)];
      for (const el of marked) el.classList.add("pv-hot");
      const first = marked.find((el) => el.offsetParent);
      if (!first) return;
      const r = first.getBoundingClientRect(), a = aside.getBoundingClientRect();
      if (r.top < a.top + 8) aside.scrollTop -= a.top + 8 - r.top;
      else if (r.bottom > a.bottom - 8) aside.scrollTop += r.bottom - (a.bottom - 8);
    }

    // the preview was drawn again (its parts are drawn again, but some of the elements stay): the outlines are taken off, and the controls point again if the pointer is still on one
    function refresh() { hide(); for (const el of aside.querySelectorAll(".pv-hot")) el.classList.remove("pv-hot"); marked = []; refreshTray(); }
    refreshTray();
    return { refresh, highlight, busy: () => !!(dragging || renaming) };
  }

  B.editor = { attach };
})();
