"use strict";
// A local stand-in for a Google Scholar profile page, built from the real rows in
// test/fixtures/profiles/*.json with Scholar's real DOM structure (ids, classes,
// "Show more", per-paper detail pages). Used only by the end-to-end test.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

function loadProfile(slug, repeat = 1) {
  const f = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "fixtures", "profiles", slug + ".json"), "utf8"));
  // `repeat` multiplies the rows (distinct ids) to stand in for a very large profile
  const source = Array.from({ length: repeat }, () => f.rows).flat();
  const rows = source.map(([authors, venue, title], i) => {
    const y = /(\d{4})\D*$/.exec(venue);
    return {
      id: "TEST:P" + String(i).padStart(3, "0"),
      title: title || "Paper number " + (i + 1) + " — " + venue.slice(0, 28),
      authors, venue,
      cites: Math.max(0, 900 - i * 9) + (i % 7),
      year: y ? parseInt(y[1], 10) : 2000
    };
  });
  return { owner: f.owner, rows };
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

let BROKEN = false;   // render rows without Scholar's gs_gray author/venue lines, as if the markup had changed
let ROW_HL = "en";   // the interface language baked into row links, like Scholar's hl= parameter
function rowHtml(r) {
  return `<tr class="gsc_a_tr"><td class="gsc_a_t"><a href="/citations?view_op=view_citation&amp;hl=${ROW_HL}&amp;user=TEST&amp;citation_for_view=${esc(r.id)}" class="gsc_a_at">${esc(r.title)}</a>` +
    // like the real DOM: a no-break space sits before the "…" that truncates a venue
    `<div class="${BROKEN ? "gx_a" : "gs_gray"}">${esc(r.authors)}</div><div class="${BROKEN ? "gx_a" : "gs_gray"}">${esc(r.venue.replace(/ …/g, "\u00a0…"))}</div></td>` +
    `<td class="gsc_a_c"><a class="gsc_a_ac gs_ibl">${r.cites}</a></td><td class="gsc_a_y"><span class="gsc_a_h gsc_a_hc gs_ibl">${r.year}</span></td></tr>`;
}

const CSS = `
body{margin:0;font:13px Arial,sans-serif;color:#222;background:#fff}
#gs_top{max-width:1200px;margin:0 auto;padding:16px}
#gsc_prf_in{font-size:22px;padding:8px 0}
.gsc_rsb{float:right;width:318px}
.gsc_rsb_s{border:1px solid #eee;padding:12px;margin-bottom:12px}
#gsc_a_tw{width:850px}
#gsc_a_t{width:100%;border-collapse:collapse}
#gsc_a_t td{padding:12px 8px;border-top:1px solid #eee;vertical-align:top;background:#fff}
a.gsc_a_at{font-size:16px;color:#1a0dab;text-decoration:none}
.gs_gray{color:#777}
td.gsc_a_c,td.gsc_a_y{text-align:right;width:60px}
#gsc_bpf_more{margin:12px 0;padding:8px 16px}
/* real Scholar: below ~1000px the right sidebar drops UNDER the paper list */
@media (max-width: 1000px){#gsc_bdy{display:flex;flex-direction:column}#gsc_prf{order:1}#gsc_a_tw{order:2;width:auto}.gsc_rsb{order:3;float:none;width:auto}}
`;

function profilePage(profile, opts) {
  const first = profile.rows.slice(0, opts.pageSize);
  const rest = profile.rows.slice(opts.pageSize);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(profile.owner)} - Google Scholar</title><style>${CSS}</style></head><body>
<div id="gs_top"><div id="gs_bdy"><div id="gsc_bdy">
<div id="gsc_prf"><div id="gsc_prf_i"><div id="gsc_prf_in">${esc(opts.header || profile.owner)}</div></div></div>
<div class="gsc_rsb"><div id="gsc_rsb_cit" class="gsc_rsb_s gsc_prf_pnl">Cited by<br>All 100000<br>h-index 100</div><div id="gsc_rsb_mnd" class="gsc_rsb_s gsc_prf_pnl">Public access</div><div id="gsc_rsb_co" class="gsc_rsb_s gsc_prf_pnl">Co-authors</div></div>
<div id="gsc_a_tw"><table id="gsc_a_t"><thead><tr><th>TITLE</th><th>CITED BY</th><th>YEAR</th></tr></thead><tbody id="gsc_a_b">${first.map(rowHtml).join("")}</tbody></table>
<button id="gsc_bpf_more" type="button"${rest.length ? "" : " disabled"}>Show more</button></div>
</div></div></div>
<script>
const REST = ${JSON.stringify(rest.map((r) => rowHtml(r)))};
const STOP_AFTER = ${opts.stopAfter == null ? -1 : opts.stopAfter};   // Scholar stops answering after this many presses: the button comes back, no rows do
let presses = 0;
const btn = document.getElementById("gsc_bpf_more");
btn.addEventListener("click", () => {
  btn.disabled = true;
  setTimeout(() => {
    if (STOP_AFTER >= 0 && presses++ >= STOP_AFTER) { btn.disabled = false; return; }
    document.getElementById("gsc_a_b").insertAdjacentHTML("beforeend", REST.splice(0, 80).join(""));
    btn.disabled = REST.length === 0;
  }, 150);
});
</script></body></html>`;
}

function detailPage(profile, id, hl) {
  const r = profile.rows.find((x) => x.id === id);
  // Scholar localises the field labels with the interface language
  const L = hl === "en" ? { authors: "Authors", conf: "Conference" } : { authors: "作者", conf: "会议" };
  if (!r) return "<!doctype html><title>404</title>not found";
  // full author list: the visible names plus the profile owner, last (what Scholar's detail page shows)
  const visible = r.authors.split(/,\s*/).filter((t) => t && !/^\.\.\.$|…/.test(t));
  const full = /\.\.\.|…/.test(r.authors) ? [...visible, profile.owner].join(", ") : r.authors;
  return `<!doctype html><html><body><div id="gsc_oci_title">${esc(r.title)}</div><div id="gsc_oci_table">
<div class="gs_scl"><div class="gsc_oci_field">${L.authors}</div><div class="gsc_oci_value">${esc(full)}</div></div>
<div class="gs_scl"><div class="gsc_oci_field">${L.conf}</div><div class="gsc_oci_value">${esc(r.venue.replace(/,.*$/, ""))}</div></div>
</div></body></html>`;
}

function start({ slug = "ion-stoica", pageSize = 20, header, port = 0, hl = "en", repeat = 1, brokenLayout = false, stopAfter } = {}) {
  ROW_HL = hl;
  BROKEN = brokenLayout;
  const profile = loadProfile(slug, repeat);
  let detailRequests = 0;
  const detailHls = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://127.0.0.1");
    if (u.pathname === "/citations" && u.searchParams.get("view_op") === "view_citation") {
      detailRequests++;
      detailHls.push(u.searchParams.get("hl"));
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.end(detailPage(profile, u.searchParams.get("citation_for_view"), u.searchParams.get("hl")));
    }
    if (u.pathname === "/citations") {
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.end(profilePage(profile, { pageSize, header, stopAfter }));
    }
    if (u.pathname === "/scholar" || u.pathname === "/scholar.bib") {                         // (search results, and a download the language redirect must leave alone)
      res.setHeader("content-type", u.pathname.endsWith(".bib") ? "text/plain" : "text/html; charset=utf-8");
      return res.end(u.pathname.endsWith(".bib") ? "@article{x}" : "<!doctype html><title>search</title><body>results</body>");
    }
    if (u.pathname === "/favicon.ico") { res.statusCode = 204; return res.end(); }
    res.statusCode = 404; res.end("not found");
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({
    server, profile, port: server.address().port, url: `http://127.0.0.1:${server.address().port}/citations?user=TEST&hl=en`,
    detailRequests: () => detailRequests, detailHls: () => detailHls.slice(), close: () => new Promise((r) => server.close(r))
  })));
}

module.exports = { start, loadProfile };
