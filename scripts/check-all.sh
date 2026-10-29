#!/usr/bin/env bash
# Every check that CI runs, in four lanes at once on this machine:
#   unit       npm test, the bundled data against data/*.json, the store kit's quotes; then the end-to-end checks' part 4 (E2E_PART=4: sections 26
#              on — the unit tests need no browser, so four browsers run at most)
#   e2e 1      the end-to-end checks, part 1 (E2E_PART=1: the long profile, sections 1–16 and S1–S6)
#   e2e 2      part 2 (E2E_PART=2: the sections with profiles of their own, 17–25), then the accessibility audit (scripts/axe-audit.mjs)
#   demo       part 3 (E2E_PART=3: the settings page's sections S7–S8), then the web demo's checks and the overflow audit (the demo and
#              the audit both build dist/demo, so one after the other; part 3 is short, so it shares this lane and four browsers run at most)
# Exit 0 only when every lane passed; a failed lane's last lines are printed. Logs go to $CHECK_LOGS (default: a new temporary folder).
#
#   scripts/check-all.sh
#
# Four browsers fill an 8-core machine: the script first waits (up to fifteen minutes) while the load is above twice the cores, or while
# another browser run of this repository's scripts is going (a starved click times out and a lane fails on nothing). To test a commit while
# you go on editing, run it in a worktree of that commit: git worktree add --detach ../check HEAD && (cd ../check && scripts/check-all.sh).
set -u
cd "$(dirname "$0")/.."
logs="${CHECK_LOGS:-$(mktemp -d "${TMPDIR:-/tmp}/check-all.XXXXXX")}"
mkdir -p "$logs"
rm -f "$logs"/*.ok

busy() {
  node -e 'const os = require("os"); process.exit(os.loadavg()[0] >= 2 * os.cpus().length ? 0 : 1)' && return 0
  pgrep -f 'test/e2e/(run|demo)\.mjs|scripts/(axe-audit|overflow-audit|store-images)' > /dev/null
}
for i in $(seq 1 90); do
  busy || break
  [ "$i" -eq 1 ] && echo "the machine is busy (load or another browser run): waiting"
  sleep 10
done

lane() {          # lane <name> <command…>: runs the command, its output in <name>.log, and marks <name>.ok when it passed
  local name="$1"; shift
  if "$@" > "$logs/$name.log" 2>&1; then touch "$logs/$name.ok"; echo "  ok      $name  $(date +%H:%M:%S)"; else echo "  FAILED  $name  $(date +%H:%M:%S)"; fi
}
start=$(date +%s)
echo "checking $(git rev-parse --short HEAD 2>/dev/null || echo .) in four lanes; logs in $logs"
lane unit bash -c 'npm test && node scripts/build-data.mjs --check && npm run check:claims && E2E_PART=4 node test/e2e/run.mjs' &
lane e2e1 env E2E_PART=1 node test/e2e/run.mjs &
lane e2e2 bash -c 'E2E_PART=2 node test/e2e/run.mjs && node scripts/axe-audit.mjs' &
lane demo bash -c 'E2E_PART=3 node test/e2e/run.mjs && npm run test:demo && node scripts/overflow-audit.mjs --width 1360,700,330 --scheme light' &
wait

failed=0
for name in unit e2e1 e2e2 demo; do
  [ -f "$logs/$name.ok" ] && continue
  failed=1
  echo; echo "==> $name ($logs/$name.log)"
  if grep -q 'E2E FAILED\|^not ok\|Error\|✗' "$logs/$name.log"; then grep -n -B2 -A10 'E2E FAILED\|^not ok\|Error\|✗' "$logs/$name.log" | head -40; else tail -20 "$logs/$name.log"; fi
done
echo; echo "$([ $failed -eq 0 ] && echo "all four lanes passed" || echo "a lane failed") in $(( $(date +%s) - start )) s"
exit $failed
