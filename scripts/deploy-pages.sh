#!/usr/bin/env bash
# Build the frontend for GitHub Pages and publish it to the gh-pages branch.
#   npm run deploy:pages
# Site: https://aravindmanoj143.github.io/indichthys/  (API stays on Render, see src/app/core/api-base.pages.ts)
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=dist/pages
rm -rf "$OUT"
npx ng build --configuration production,pages --output-path "$OUT"
WEB="$OUT/browser"
cp "$WEB/index.html" "$WEB/404.html"   # deep links: Pages serves 404.html, Angular routes it
touch "$WEB/.nojekyll"                  # serve files as-is (no Jekyll processing)

SHA=$(git rev-parse --short HEAD)
TMP=$(mktemp -d)
trap 'git worktree remove --force "$TMP" >/dev/null 2>&1 || true' EXIT
if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git fetch -q origin gh-pages
  git worktree add -q -B gh-pages "$TMP" origin/gh-pages
else
  git worktree add -q --detach "$TMP"
  git -C "$TMP" checkout -q --orphan gh-pages
fi
git -C "$TMP" rm -rqf . >/dev/null 2>&1 || true
cp -R "$WEB"/. "$TMP"/
git -C "$TMP" add -A
if git -C "$TMP" diff --cached --quiet; then
  echo "gh-pages already up to date."
else
  git -C "$TMP" commit -qm "Deploy $SHA to GitHub Pages"
  git -C "$TMP" push -q origin gh-pages
  echo "Published $SHA to gh-pages."
fi
