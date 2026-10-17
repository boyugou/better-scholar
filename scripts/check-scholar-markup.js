// Is the markup the extension reads (and hides) still on Google Scholar's real pages?
//
// Paste this whole file into the DevTools console (Chrome: F12 → Console) of
//   - a Scholar profile page (scholar.google.com/citations?user=…), and
//   - a paper's own page (click a paper title: "View article"),
// each time. It lists every element the extension relies on on that kind of page, with how many it found,
// and says which are missing. It reads the page you have open and sends nothing anywhere.
//
// `npm test` checks that every selector below is still the one the source uses (test/markup-check.test.js),
// so this list cannot drift from the code. Last confirmed against Scholar's live markup on 2026-10-13
// (a profile with 13 papers and one of its paper pages).
(function () {
  // [selector, what it is, how many are expected: "some" (at least one) | "rows" (one per paper row, two for the author / venue lines) | "maybe" (may be absent)]
  const PROFILE = [
    ["#gsc_prf_in", "profile name", "some"],
    ["#gsc_a_b tr.gsc_a_tr", "paper rows", "some"],
    ["#gsc_a_b tr.gsc_a_tr a.gsc_a_at", "…each with a title link", "rows"],
    ["#gsc_a_b tr.gsc_a_tr td.gsc_a_t .gs_gray", "…its author and venue lines (two per row)", "rows2"],
    ["#gsc_a_b tr.gsc_a_tr td.gsc_a_y", "…its year", "rows"],
    ["#gsc_a_b tr.gsc_a_tr td.gsc_a_c", "…its citation count", "rows"],
    [".gsc_a_e", "the message row of a profile with no articles (only there)", "maybe"],
    ["#gsc_bpf_more", "the Show more button", "some"],
    ["#gsc_a_tw", "the paper table's wrapper", "some"],
    ["#gsc_a_t", "the paper table (the panel is placed by it when the wrapper is missing)", "some"],
    [".gsc_rsb", "the right-hand sidebar", "some"],
    ["#gsc_rsb_cit", "sidebar: Cited by (can be hidden)", "some"],
    ["#gsc_rsb_st", "sidebar: Cited by table (can be hidden)", "maybe"],
    [".gsc_md_hist_b", "sidebar: Cited by year chart (can be hidden)", "maybe"],
    ["#gsc_rsb_co", "sidebar: Co-authors (can be hidden)", "maybe"],
    ["#gsc_rsb_mnd", "sidebar: Public access (can be hidden)", "maybe"]
  ];
  const PAPER = [
    ["#gsc_oci_table .gs_scl", "the field rows", "some"],
    ["#gsc_oci_table .gs_scl .gsc_oci_field", "…each field's name", "some"],
    ["#gsc_oci_table .gs_scl .gsc_oci_value", "…each field's value", "some"]
  ];
  if (typeof module !== "undefined" && module.exports) { module.exports = { PROFILE, PAPER }; return; }

  const isPaper = !!document.querySelector("#gsc_oci_table");
  const checks = isPaper ? PAPER : PROFILE;
  const rows = document.querySelectorAll("#gsc_a_b tr.gsc_a_tr").length;
  const result = checks.map(([selector, what, expect]) => {
    const found = document.querySelectorAll(selector).length;
    const ok = expect === "rows" ? found === rows && rows > 0 : expect === "rows2" ? found >= 2 * rows && rows > 0 : expect === "maybe" ? true : found > 0;
    return { selector, what, found, ok: ok ? (found || expect !== "maybe" ? "ok" : "absent (allowed)") : "MISSING" };
  });
  if (isPaper) {                                                              // the author list is read from the field named "Authors" (the page is requested with hl=en)
    const names = [...document.querySelectorAll("#gsc_oci_table .gs_scl .gsc_oci_field")].map((e) => e.textContent.trim());
    result.push({ selector: 'field "Authors"', what: "the full author list (English interface)", found: names.filter((n) => n === "Authors").length, ok: names.includes("Authors") ? "ok" : "MISSING (or the page is not in English: add &hl=en)" });
  }
  console.table(result);
  const bad = result.filter((r) => /^MISSING/.test(r.ok));
  console.log(bad.length ? "Missing: " + bad.map((r) => r.selector).join(", ") + ". Scholar's markup has changed: see CONTRIBUTING.md." : "Everything the extension reads on this " + (isPaper ? "paper" : "profile") + " page is there.");
})();
