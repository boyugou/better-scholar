#!/usr/bin/env bash
#
# Refresh the Google Scholar domain list in src/manifest.json.
#
# Scholar is served from every Google country domain (scholar.google.com.sg,
# scholar.google.co.uk, …) and a Manifest V3 match pattern cannot wildcard a
# TLD — "https://scholar.google.*/*" is rejected — so the domains have to be
# enumerated. This regenerates the content script's `matches` from Google's own
# published list, keeping scholar.google.com first. The extension only acts on
# profile pages, so each pattern is scoped to /citations*.
#
# Run it when Google adds a country domain; the diff is the review.
#
# Usage: scripts/update-scholar-domains.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/src/manifest.json"
SOURCE="https://www.google.com/supported_domains"

python3 - "$MANIFEST" "$SOURCE" <<'PY'
import collections, json, sys, urllib.request

manifest_path, source = sys.argv[1], sys.argv[2]

with urllib.request.urlopen(source, timeout=30) as resp:
    domains = [line.strip().lstrip(".")
               for line in resp.read().decode().splitlines() if line.strip()]

if "google.com" not in domains or len(domains) < 100:
    sys.exit("unexpected response from %s (%d entries)" % (source, len(domains)))

# google.com first (the canonical host), the country domains sorted after it.
ordered = ["google.com"] + sorted(d for d in domains if d != "google.com")
patterns = ["https://scholar.%s/citations*" % d for d in ordered]

with open(manifest_path) as f:
    manifest = json.load(f, object_pairs_hook=collections.OrderedDict)

manifest["content_scripts"][0]["matches"] = patterns

with open(manifest_path, "w") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)
    f.write("\n")

print("%d Scholar domains written to %s" % (len(patterns), manifest_path))
PY
