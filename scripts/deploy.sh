#!/usr/bin/env bash
# Publish the static site to Cloudflare Pages.
# Usage: deploy.sh [preview]   — no argument publishes to production.
set -euo pipefail
cd "$(dirname "$0")/.."

dist="$(mktemp -d)"
trap 'rm -rf "$dist"' EXIT
cp -r index.html og.jpg src data "$dist/"

if [ "${1:-}" = preview ]; then
  npx --yes wrangler pages deploy "$dist" --project-name=valencia-antiga --branch=preview --commit-dirty=true
  echo "Publicado en la preview: https://preview.valencia-antiga.pages.dev/"
else
  npx --yes wrangler pages deploy "$dist" --project-name=valencia-antiga --branch=main --commit-dirty=true
  echo "Publicado: https://valencia-antiga.pages.dev/"
fi
