#!/usr/bin/env bash
# Rebuilds the site with the built-in sample league and serves the production build on port 3300 (for Lighthouse runs).
cd "$(dirname "$0")/.."
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3300 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"
export NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= NEXT_PUBLIC_SUPABASE_ANON_KEY=
rm -rf .next
npx next build 2>&1 | tail -3
(npx next start -p 3300 > "${TEMP:-/tmp}/next-start.log" 2>&1 &)
sleep 6
curl -s -o /dev/null -w "server: %{http_code}\n" http://localhost:3300/
