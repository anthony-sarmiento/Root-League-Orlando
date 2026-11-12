#!/usr/bin/env bash
# Runs Lighthouse (mobile and desktop) against a running production build and prints the four scores per page.
# Usage: scripts/lh-run.sh [port] [paths…]     e.g. scripts/lh-run.sh 3300 "" leaderboard players
# Needs Chrome (set CHROME_PATH if it isn't in the usual place). Reports land in $TEMP/lh.
port="${1:-3300}"; shift || true
paths=("$@"); [ ${#paths[@]} -eq 0 ] && paths=("" leaderboard players factions sessions)
out="${TEMP:-/tmp}/lh"; mkdir -p "$out"
export CHROME_PATH="${CHROME_PATH:-C:/Program Files/Google/Chrome/Application/chrome.exe}"
for form in mobile desktop; do
  for path in "${paths[@]}"; do
    name="${form}-${path:-home}"; name="${name//\//_}"
    preset=""; [ "$form" = desktop ] && preset="--preset=desktop"
    npx --yes lighthouse@12 "http://localhost:$port/$path" $preset \
      --only-categories=performance,accessibility,best-practices,seo \
      --chrome-flags="--headless=new --no-sandbox" --output=json --output-path="$out/$name.json" --quiet >/dev/null 2>&1
    node -e "const r=require(process.argv[1]);console.log(process.argv[2].padEnd(26),Object.entries(r.categories).map(([k,v])=>k.slice(0,4)+':'+Math.round(v.score*100)).join(' '))" "$out/$name.json" "$name"
  done
done
