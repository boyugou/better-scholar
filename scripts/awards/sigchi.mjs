#!/usr/bin/env node
// SIGCHI's own conference programs, read into raw award entries for scripts/awards/merge-raw.mjs. programs.sigchi.org is an app whose data
// are public JSON files on files.sigchi.org — the conference's awards page is drawn from them:
//
//   https://files.sigchi.org/conference/cache/program-list              every conference: id, short name, year, publication status
//   https://files.sigchi.org/conference/cache/<id>/version-2            { scheduleVersion }
//   https://files.sigchi.org/conference/cache/<id>/<version>/program    contentTypes, sessions, contents (title, authors by personId, `award`), people
//
// A paper of the conference's main "Papers" track whose `award` is BEST_PAPER is a best paper, and HONORABLE_MENTION an honorable
// mention (the two names the awards page itself shows). Flags on other tracks (late-breaking work, demos, pictorials, works in
// progress) are not read, nor any other flag, nor a program that is still a draft. The authors are the program's own list in its order;
// an entry with an author the program does not describe is reported and skipped, never guessed.
//
//   node scripts/awards/sigchi.mjs CHI UIST CSCW > sigchi.json            fetches the list and each program, one request every 3 seconds
//   node scripts/awards/sigchi.mjs --dir saved/ CHI UIST > sigchi.json    reads saved program files ("<short name>-<year>-<id>.json") instead
//   node scripts/awards/merge-raw.mjs sigchi.json [--write]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { text } from "./html.mjs";

const BASE = "https://files.sigchi.org/conference/cache";
const FLAGS = { BEST_PAPER: { award: "best", label: "Best Paper" }, HONORABLE_MENTION: { award: "runner-up", label: "Honorable Mention" } };
const VENUES = { CHIPLAY: "CHI PLAY" };
// the track of full papers: "Papers", or "TEI 2018 Papers"
const MAIN_TRACK = /^(?:[A-Za-z][A-Za-z&' -]*? \d{4} )?(?:Full )?Papers?$/;

// "Sungsoo (Ray) Hong", 'Xingyu "Bruce" Liu', "Florian ‘Floyd’ Mueller": a nickname is not part of the name; nor is a stray comma ("Melanie Yi Ning, Quek")
const personName = (p) => p ? [p.firstName, p.middleInitial, p.lastName].join(" ")
  .normalize("NFC").replace(/\([^()]*\)/g, " ").replace(/["“”][^"“”]*["“”]/g, " ").replace(/\s[‘'][^‘’']+[’']\s/g, " ").replace(/,/g, " ").replace(/\s+/g, " ").trim() : "";

export function parseProgram(program) {
  const entries = [], skipped = [];
  const conf = program.conference || {}, info = program.publicationInfo || {};
  const where = `${conf.shortName} ${conf.year}`;
  if (!conf.id || !conf.shortName || !conf.year || !info.version) return { entries, skipped: [`${where}: no conference id, name, year or version`] };
  if (info.isDraft || info.publicationStatus !== "PUBLISHED") return { entries, skipped: [`${where}: not read: the program is a draft`] };
  const venue = VENUES[conf.shortName] || conf.shortName;
  const source = `${BASE}/${conf.id}/${info.version}/program`;
  const types = new Map((program.contentTypes || []).map((t) => [t.id, (t.displayName || t.name || "").trim()]));
  const sessions = new Map((program.sessions || []).map((s) => [s.id, s]));
  const people = new Map((program.people || []).map((p) => [p.id, p]));
  // older programs give the type on the session, not on the content
  const typeName = (c) => {
    let id = c.typeId;
    for (const sid of c.sessionIds || []) { if (id != null) break; id = (sessions.get(sid) || {}).typeId; }
    return types.get(id) || "";
  };
  const seen = new Set();
  for (const c of program.contents || []) {
    if (!c.award) continue;
    const flag = FLAGS[c.award];
    const title = text(c.title || "").normalize("NFC");
    if (!flag) { skipped.push(`${where}: flag ${c.award}: ${title.slice(0, 60)}`); continue; }
    if (!MAIN_TRACK.test(typeName(c))) continue;                                  // late-breaking work, demos, pictorials …
    if (seen.has(c.award + "|" + title.toLowerCase())) continue;                   // a paper listed twice
    seen.add(c.award + "|" + title.toLowerCase());
    const authors = (c.authors || []).map((a) => personName(people.get(a.personId)));
    if (title.length < 8 || !authors.length || authors.some((n) => !/\p{L}{2}/u.test(n) || n.split(" ").length < 2)) { skipped.push(`${where}: not read: ${title.slice(0, 60)} / ${authors.join("; ").slice(0, 60)}`); continue; }
    entries.push({ venue, year: conf.year, award: flag.award, awardLabel: flag.label, title, authors, track: "main", source,
      evidence: `${where} program, ${flag.label}: ${title} — ${authors.join(", ")}` });
  }
  return { entries, skipped };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": "scholar-roles-and-ranks award reader (reads one public page)" } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const di = args.indexOf("--dir");
  const dir = di >= 0 ? args.splice(di, 2)[1] : null;
  const wanted = new Set(args.map((a) => a.replace(/[_ ]/g, "").toLowerCase()));
  if (!wanted.size) { console.error("usage: sigchi.mjs [--dir saved/] CHI UIST …"); process.exit(2); }
  const programs = [];
  if (dir) {
    for (const f of readdirSync(dir).sort()) {
      const m = /^(.+)-(\d{4})-(\d+)\.json$/.exec(f);
      if (m && wanted.has(m[1].replace(/[_ ]/g, "").toLowerCase())) programs.push(JSON.parse(readFileSync(join(dir, f), "utf8")));
    }
  } else {
    const list = await get(`${BASE}/program-list`);
    for (const { conference: c } of list) {
      if (!wanted.has(c.shortName.replace(/[_ ]/g, "").toLowerCase())) continue;
      await sleep(3000);
      const { scheduleVersion } = await get(`${BASE}/${c.id}/version-2`);
      await sleep(3000);
      programs.push(await get(`${BASE}/${c.id}/${scheduleVersion}/program`));
    }
  }
  const entries = [], by = {};
  for (const p of programs) {
    const r = parseProgram(p);
    entries.push(...r.entries);
    for (const e of r.entries) by[`${e.venue} ${e.year}`] = (by[`${e.venue} ${e.year}`] || 0) + 1;
    for (const s of r.skipped) console.error("skipped:", s);
  }
  console.error(entries.length + " entries:", JSON.stringify(by));
  process.stdout.write(JSON.stringify({ entries }, null, 1) + "\n");
}
