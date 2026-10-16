// The chips drawn on a paper's venue line: venue rank (CCF / CORE) and award / talk level. Shared by the
// Scholar page and the settings page's preview, so what you configure is exactly what you get.
(function () {
  "use strict";
  const B = (globalThis.RolesRanks = globalThis.RolesRanks || {});
  const { h, t } = B.dom;

  // outline ramp: strongest = top tier. CCF and CORE share shades so "A" looks the same in both.
  const SHADE = { ccf: { A: 1, B: 3, C: 4 }, core: { "A*": 1, A: 2, B: 3, C: 4 } };
  const RULE_TEXT = { name: "ruleName", acronym: "ruleAcronym", prefix: "rulePrefix" };

  const ruleText = (info) => t(RULE_TEXT[info.rule] || "ruleName");

  const tierOf = (kind, info) => (kind === "ccf" ? info.tier : info.rank);
  const sourceName = (kind) => (kind === "ccf" ? t("srcCcf") : t("srcCore"));
  const venueLine = (kind, info) => `${sourceName(kind)} ${tierOf(kind, info)} · ${info.name}${info.abbr ? " (" + info.abbr + ")" : ""}`;

  // kind: "ccf" | "core"; info: the venue match ({ tier } or { rank }, name, abbr, rule); edition: the list's label
  // `also`: the other list's match, when it ranks the venue too and the chip stands for both (the settings prefer this list): the tooltip names that rank as well
  function tierChip(kind, info, edition, also) {
    const tier = tierOf(kind, info);
    const lines = [
      venueLine(kind, info),
      ...(also ? [venueLine(also.kind, also.info)] : []),
      ruleText(info),
      edition + " — " + t("tipToday")
    ];
    return h("span", { class: "rr-chip rr-chip-rank rr-chip-t" + (SHADE[kind][tier] || 4), title: lines.join("\n"), "data-kind": kind, "data-tier": tier, ...(also ? { "data-also": also.kind } : {}) },
      h("span", { class: "rr-k" }, sourceName(kind)), " ", h("b", {}, tier));
  }

  // Chip text: the kind in the interface language. A named category keeps the name it was given.
  const MARK_TEXT = {
    best: "mkBest", "best-student": "mkBestStudent", outstanding: "mkOutstanding", distinguished: "mkDistinguished",
    "runner-up": "mkRunnerUp", tot: "mkTot", finalist: "mkFinalist", oral: "markOral", spotlight: "markSpotlight", highlight: "markHighlight"
  };
  // `standard`: the words as the language has them, not the person's own names (for what a machine reads: the exports)
  const markLabel = (mark, standard) => (MARK_TEXT[mark.kind] ? (standard ? B.dom.tDefault : t)(MARK_TEXT[mark.kind]) : mark.label);

  // A paper's standing: an award from the bundled list, or what the author wrote ("Oral", "Best Paper Award"…).
  function markChip(mark) {
    const name = markLabel(mark);
    const lines = [name];
    if (mark.source === "list") {
      lines.push(t("tipMarkList", [mark.awardLabel || name, mark.venue + " " + mark.year]));
      if (mark.declared) lines.push(t("tipMarkAuthor", [mark.declared]));
    } else lines.push(t("tipMarkAuthor", [mark.text]));
    return h("span", { class: "rr-chip rr-chip-mark rr-chip-mark-" + mark.group, "data-mark": mark.kind, "data-group": mark.group, "data-source": mark.source,
      ...(MARK_TEXT[mark.kind] ? { "data-rr-label": MARK_TEXT[mark.kind] } : {}), title: lines.join("\n") }, name);
  }

  // The kind's name in the interface language, for counts ("Best paper 5 · Honorable mention 47")
  const kindName = (kind) => t(kind === "best-category" ? "mkCategory" : MARK_TEXT[kind] || "mkBest");

  B.chips = { tierChip, ruleText, markChip, markLabel, kindName };
})();
