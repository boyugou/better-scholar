// A tiny static server for the built site (_site by default), used by the dev tools that open its pages in a browser: the demo in each page needs
// http (from file:// its frame would show a folder and its strings could not be read).
//   node scripts/serve.mjs [port]     serves _site until stopped
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8" };

// → { server, origin }; `port` 0 picks a free one
export function serve(dir, port = 0) {
  const base = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let file = path.normalize(path.join(base, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, data) => (err ? res.writeHead(404).end("not found") : res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(data)));
  });
  return new Promise((ok) => server.listen(port, "127.0.0.1", () => ok({ server, origin: "http://127.0.0.1:" + server.address().port })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const site = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
  const { origin } = await serve(site, Number(process.argv[2] || 8080));
  console.log(`serving ${site} at ${origin}/ (Ctrl-C to stop)`);
}
