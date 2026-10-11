#!/usr/bin/env bash
# Assemble the GitHub Pages site into _site/.
#
#   tools/build-site.sh                      # relative URLs, for local preview
#   SITE_URL=https://example.org/repo/ tools/build-site.sh
#
# The showcase page lives in site/; the live engine (js, fonts, score) is
# copied in from film/ so it is never duplicated in the repo. SITE_URL makes
# the link-preview tags (og:image, og:video) absolute, which social sites need.
set -euo pipefail
cd "$(dirname "$0")/.."

out=_site
rm -rf "$out"
mkdir -p "$out"
cp -r site/. "$out/"
cp -r film/js film/fonts film/audio "$out/"

url="${SITE_URL:-}"
if [[ -n "$url" && "$url" != */ ]]; then url="$url/"; fi
sed -i.bak "s|%SITE_URL%|${url}|g" "$out/index.html" && rm "$out/index.html.bak"

echo "built $out/ ($(du -sh "$out" | cut -f1))${url:+ for $url}"
