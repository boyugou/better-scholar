#!/usr/bin/env node
// Is the bundled rank data still what the official sources publish?
//
//   node scripts/check-data-fresh.mjs
//
// Reads the two source addresses and checksums the data was built from (data/ccf-2026.json, data/core-2026.json),
// downloads both files again, and looks for a newer edition:
//   CCF   the PDF behind the catalogue's page: same file (sha-256)? and is the page still offering that very file, not a new one
//   CORE  the ICORE export: same file (sha-256)? and does the portal's list of editions hold a newer one than the bundled one
// It only reads (two downloads and two pages); it changes nothing.
//
// Exit status: 0 current · 1 out of date, or a source that says the file is gone (404, 410: moved or removed; what changed and the commands to run are
// printed) · 2 a source could not be reached or would not answer (no answer, a 5xx, a 403 or other refusal — bot checks answer so —, a challenge page instead of
// the file: no verdict).
// Run on a schedule by .github/workflows/data-fresh.yml.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const meta = (f) => JSON.parse(readFileSync(join(repo, "data", f), "utf8")).meta;
const ccf = meta("ccf-2026.json"), core = meta("core-2026.json");
const problems = [], unreachable = [], notes = [];

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
class Gone extends Error {}       // the source says the file is gone (404, 410): a finding. A 403 or another refusal is a block, not a removal: no verdict
async function get(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(120000), headers: { "user-agent": "scholar-roles-and-ranks data check (https://github.com/boyugou/scholar-roles-and-ranks)" } });
      if (res.status === 404 || res.status === 410) throw new Gone(`${url}: HTTP ${res.status}`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (e instanceof Gone) throw e;
      last = e; await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw new Error(`${url}: ${last && last.message}`);
}
const report = (what, e) => (e instanceof Gone ? problems : unreachable).push(`${what}: ${e.message}`);


// ---- CCF
try {
  const pdf = await get(ccf.pdfUrl);
  if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") unreachable.push(`CCF file: ${ccf.pdfUrl} answered, but not with a PDF (a challenge or an error page?): no verdict`);
  else if (sha(pdf) !== ccf.pdfSha256) problems.push(`CCF: the file at ${ccf.pdfUrl} has changed (sha-256 ${sha(pdf)}, the data was built from ${ccf.pdfSha256}). Re-extract it: see "Regenerate" under CCF in data/README.md.`);
  else notes.push("CCF: the catalogue file is the one the data was built from.");
} catch (e) { report("CCF file", e); }
try {
  const page = (await get(ccf.indexPage)).toString("utf8");
  const links = [...page.matchAll(/<a[^>]*href="([^"]*download\?ID=[^"]+)"[^>]*title="([^"]*)"/g)].filter((m) => /推荐国际学术会议和期刊目录/.test(m[2]));
  if (!links.length) problems.push(`CCF: ${ccf.indexPage} no longer links a catalogue file (the page changed): check by hand.`);
  else if (!links.some((m) => m[1] === ccf.pdfUrl)) problems.push(`CCF: ${ccf.indexPage} now offers ${links.map((m) => `“${m[2]}” (${m[1]})`).join(", ")}, not the file the data was built from: a new edition, probably.`);
  else if (links.some((m) => m[1] !== ccf.pdfUrl)) problems.push(`CCF: ${ccf.indexPage} offers another catalogue file next to the one the data was built from (${links.filter((m) => m[1] !== ccf.pdfUrl).map((m) => `“${m[2]}” (${m[1]})`).join(", ")}): a new edition, probably.`);
  else notes.push(`CCF: ${ccf.indexPage} still offers that file (“${links.find((m) => m[1] === ccf.pdfUrl)[2]}”) and no other.`);
} catch (e) { report("CCF page", e); }

// ---- CORE
try {
  const csv = await get(core.exportUrl);
  if (/^\s*<(!doctype|html)/i.test(csv.subarray(0, 200).toString("utf8"))) unreachable.push(`CORE export: ${core.exportUrl} answered with a web page, not the export (a challenge or an error page?): no verdict`);
  else if (sha(csv) !== core.csvSha256) problems.push(`CORE: the ${core.edition} export has changed (sha-256 ${sha(csv)}, the data was built from ${core.csvSha256}). Rebuild: see "CORE" in data/README.md.`);
  else notes.push(`CORE: the ${core.edition} export is the one the data was built from.`);
} catch (e) { report("CORE export", e); }
try {
  const page = (await get(core.portal)).toString("utf8");
  const editions = [...page.matchAll(/<option[^>]*value="((?:I?CORE|ERA)\d{4})"/g)].map((m) => m[1]);
  const year = (s) => parseInt(s.replace(/\D/g, ""), 10);
  const newer = editions.filter((e) => year(e) > year(core.edition));
  if (!editions.length) problems.push(`CORE: ${core.portal} lists no editions any more (the page changed): check by hand.`);
  else if (newer.length) problems.push(`CORE: ${core.portal} lists ${newer.join(", ")}, newer than the bundled ${core.edition}: a new edition.`);
  else notes.push(`CORE: no edition newer than ${core.edition} is listed (${editions.join(", ")}).`);
} catch (e) { report("CORE portal", e); }

for (const n of notes) console.log("ok   " + n);
for (const u of unreachable) console.log("??   " + u);
for (const p of problems) console.log("OLD  " + p);
if (problems.length) { console.log("\nThe bundled rank data is out of date."); process.exit(1); }
if (unreachable.length) { console.log("\nNo verdict: a source could not be reached."); process.exit(2); }
console.log("\nThe bundled rank data is current.");
