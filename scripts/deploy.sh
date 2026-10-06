#!/usr/bin/env bash
# Publish the static site to Cloudflare Pages (production branch).
set -euo pipefail
cd "$(dirname "$0")/.."

dist="$(mktemp -d)"
trap 'rm -rf "$dist"' EXIT
cp -r index.html og.jpg src data "$dist/"

npx --yes wrangler pages deploy "$dist" --project-name=valencia-antiga --branch=main --commit-dirty=true
echo "Publicado: https://valencia-antiga.pages.dev/"
