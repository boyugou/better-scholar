// Keep a copy of every public page the data scripts read, so a page is fetched once and then read from disk.
//   node scripts/page-cache.mjs <https-url> [--refresh]   → prints the path of the saved copy (fetching it only if it is not saved yet)
// Copies live in .cache/pages/ (git-ignored) with an index of what came from where. A plain request, no tricks: a page that answers with
// an error, a CAPTCHA or a bot check is not saved (and is not retried by other means).
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".cache", "pages");
const INDEX = join(DIR, "index.json");

export function cachedPath(url) {
  const ext = /\.(pdf|json|csv|txt|xml)(?:$|[?#])/i.exec(url);
  return join(DIR, createHash("sha1").update(url).digest("hex").slice(0, 16) + "." + (ext ? ext[1].toLowerCase() : "html"));
}

export async function cachedPage(url, { refresh = false } = {}) {
  if (!/^https:\/\//.test(url)) throw new Error("https only: " + url);
  const file = cachedPath(url);
  if (!refresh && existsSync(file)) return file;
  const res = await fetch(url, { headers: { "user-agent": "better-scholar award reader (reads one public page)" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const body = Buffer.from(await res.arrayBuffer());
  if (/captcha|are you a robot|unusual traffic|checking your browser/i.test(body.subarray(0, 4000).toString("utf8"))) throw new Error("bot check, not saved: " + url);
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file, body);
  const index = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : {};
  index[url] = { file: file.split("/").pop(), fetched: new Date().toISOString().slice(0, 10), bytes: body.length };
  writeFileSync(INDEX, JSON.stringify(index, null, 2) + "\n");
  return file;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [url, flag] = process.argv.slice(2);
  if (!url) { console.error("usage: node scripts/page-cache.mjs <https-url> [--refresh]"); process.exit(2); }
  console.log(await cachedPage(url, { refresh: flag === "--refresh" }));
}
