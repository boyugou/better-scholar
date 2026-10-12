"use strict";
// scholar.loadAll against a stand-in for Scholar's "Show more" button: it presses until the list is complete, says why it stopped,
// gives up when Scholar stops answering, can be cancelled, waits for the foreground tab and for the button to come back.
const test = require("node:test");
const assert = require("node:assert/strict");

globalThis.RolesRanks = {};
require("../src/content/dom.js");
require("../src/content/scholar.js");
const { loadAll } = globalThis.RolesRanks.scholar;

const FAST = { pause: 1, jitter: 1, rowTimeout: 80, regrace: 120 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A page with `first` rows and a button that, when pressed, adds the next batch of `batches` after a short delay —
// like Scholar: disabled while it loads, disabled for good when nothing is left. `answers`: how many presses are answered at all;
// `silent`: presses (counted from 1) that bring no rows; `lateEnable`: the button comes back this many ms after the rows do.
function page({ first = 3, batches = [3, 3], answers = Infinity, silent = [], lateEnable = 0, hidden = false, noButton = false } = {}) {
  const rows = Array.from({ length: first }, (_, i) => ({ i }));
  const queue = batches.slice();
  const btn = {
    disabled: queue.length === 0, presses: 0, pressedAt: [],
    click() {
      this.presses++; this.pressedAt.push(Date.now());
      this.disabled = true;
      setTimeout(() => {
        if (this.presses > answers || silent.includes(this.presses)) { this.disabled = false; return; }   // no answer: the button comes back, no rows do
        const n = queue.shift() || 0;
        for (let i = 0; i < n; i++) rows.push({ i: rows.length });
        const more = queue.length > 0;
        if (lateEnable && more) setTimeout(() => { this.disabled = false; }, lateEnable); else this.disabled = !more;
      }, 5);
    }
  };
  globalThis.document = {
    hidden,
    querySelector: (sel) => (sel === "#gsc_bpf_more" && !noButton ? btn : null),
    querySelectorAll: (sel) => (sel === "#gsc_a_b tr.gsc_a_tr" ? rows : [])
  };
  return { rows, btn };
}

test("presses until the list is complete, reports each batch, says done", async () => {
  const p = page({ first: 100, batches: [100, 100, 40] });
  const seen = [];
  const stopped = await loadAll({ timing: FAST, onProgress: (n) => seen.push(n) });
  assert.equal(stopped, "done");
  assert.equal(p.rows.length, 340);
  assert.equal(p.btn.presses, 3);
  assert.deepEqual(seen, [200, 300, 340]);
});

test("nothing to load: no press, done", async () => {
  const p = page({ first: 50, batches: [] });
  assert.equal(await loadAll({ timing: FAST }), "done");
  assert.equal(p.btn.presses, 0);
  const q = page({ noButton: true });
  assert.equal(await loadAll({ timing: FAST }), "done");
  assert.equal(q.btn.presses, 0);
});

test("Scholar stops answering: an automatic run gives up after one silent press, a manual one after two", async () => {
  let p = page({ first: 3, batches: [3, 3, 3, 3], answers: 1 });
  assert.equal(await loadAll({ timing: FAST, maxStalls: 1 }), "stalled");
  assert.equal(p.btn.presses, 2, "one answered press, one silent press, and no third");
  assert.equal(p.rows.length, 6);
  p = page({ first: 3, batches: [3, 3, 3, 3], answers: 1 });
  assert.equal(await loadAll({ timing: FAST, maxStalls: 2 }), "stalled");
  assert.equal(p.btn.presses, 3);
  await wait(60);
  assert.equal(p.btn.presses, 3, "and it is not pressed again afterwards");
});

test("one silent press between answered ones is forgiven by a manual run (two in a row are not), never by an automatic one", async () => {
  let p = page({ first: 3, batches: [3, 3], silent: [1] });
  assert.equal(await loadAll({ timing: FAST, maxStalls: 2 }), "done");
  assert.equal(p.rows.length, 9);
  assert.equal(p.btn.presses, 3);
  p = page({ first: 3, batches: [3, 3], silent: [1, 2] });
  assert.equal(await loadAll({ timing: FAST, maxStalls: 2 }), "stalled");
  assert.equal(p.rows.length, 3);
  p = page({ first: 3, batches: [3, 3], silent: [1] });
  assert.equal(await loadAll({ timing: FAST, maxStalls: 1 }), "stalled");
  assert.equal(p.btn.presses, 1);
});

test("Cancel ends it at once and says cancelled", async () => {
  const p = page({ first: 3, batches: [3, 3, 3, 3, 3] });
  const ctl = new AbortController();
  const stopped = await loadAll({ timing: FAST, signal: ctl.signal, onProgress: () => ctl.abort() });
  assert.equal(stopped, "cancelled");
  assert.equal(p.btn.presses, 1);
  await wait(40);
  assert.equal(p.btn.presses, 1);
  const q = page({ first: 3, batches: [3] });
  const pre = new AbortController(); pre.abort();
  assert.equal(await loadAll({ timing: FAST, signal: pre.signal }), "cancelled");
  assert.equal(q.btn.presses, 0, "cancelled before it began: nothing is pressed");
});

test("startDelay: the first press waits", async () => {
  const p = page({ first: 3, batches: [3] });
  const t0 = Date.now();
  await loadAll({ timing: FAST, startDelay: 60 });
  assert.ok(p.btn.pressedAt[0] - t0 >= 55, `pressed after ${p.btn.pressedAt[0] - t0} ms`);
});

test("foregroundOnly: a tab in the background does not press; when it comes forward, it does", async () => {
  const p = page({ first: 3, batches: [3, 3], hidden: true });
  const run = loadAll({ timing: FAST, foregroundOnly: true });
  await wait(150);
  assert.equal(p.btn.presses, 0, "hidden: no press");
  globalThis.document.hidden = false;
  assert.equal(await run, "done");
  assert.equal(p.rows.length, 9);
  // a manual run does not care
  const q = page({ first: 3, batches: [3], hidden: true });
  assert.equal(await loadAll({ timing: FAST }), "done");
  assert.equal(q.rows.length, 6);
  // and a run waiting for the foreground can still be cancelled
  const r = page({ first: 3, batches: [3], hidden: true });
  const ctl = new AbortController();
  const waiting = loadAll({ timing: FAST, foregroundOnly: true, signal: ctl.signal });
  await wait(30); ctl.abort();
  assert.equal(await waiting, "cancelled");
  assert.equal(r.btn.presses, 0);
});

test("a button that comes back a moment after the rows do is not taken for the end of the list", async () => {
  const p = page({ first: 3, batches: [3, 3, 3], lateEnable: 40 });
  assert.equal(await loadAll({ timing: FAST }), "done");
  assert.equal(p.rows.length, 12);
  assert.equal(p.btn.presses, 3);
});

test("a press still in flight is not the end of the list: a late answer after a silent timeout says stalled; a button busy at the start is waited for", async () => {
  const slow = page({ first: 3, batches: [3, 3] });
  const origClick = slow.btn.click;
  // an answer slower than rowTimeout: the button stays disabled past the timeout
  slow.btn.click = function () { this.presses++; this.disabled = true; setTimeout(() => { for (let i = 0; i < 3; i++) slow.rows.push({}); this.disabled = false; }, 200); };
  assert.equal(await loadAll({ timing: { ...FAST, rowTimeout: 60, regrace: 40 }, maxStalls: 2 }), "stalled");
  void origClick;
  const busy = page({ first: 3, batches: [3] });
  busy.btn.disabled = true;                          // a press by the user is in flight when the loader looks
  setTimeout(() => { busy.rows.push({}, {}, {}); busy.btn.disabled = true; }, 20);
  const r = loadAll({ timing: { ...FAST, regrace: 100 } });
  setTimeout(() => { busy.btn.disabled = false; }, 40);
  assert.equal(await r, "done");
  assert.ok(busy.btn.presses >= 1, "pressed once the button came back");
});
