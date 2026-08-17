#!/usr/bin/env bash
# Check that every relative link in a Markdown file points at a file that
# exists.
#
# This repository is documentation as much as it is code, and a broken link is
# a defect it can actually have today. The open questions list in
# docs/milestones.md went stale the moment the wordmark was drawn, and nothing
# but a reader caught it.
#
# The check reads three shapes, not one:
#
#   [text](target)          a Markdown link
#   <img src="target">      the wordmark header on every document
#   <a href="target">       the link around that wordmark
#
# Markdown alone is not enough. Every document here opens with an HTML header
# holding the wordmark, so a check that read only ](...) would report success
# while every logo on the site was broken.
#
# It tests relative links only. It opens no network connection, so it never
# fails because a remote site is slow or gone.

set -uo pipefail

fail=0
checked=0

while IFS= read -r file; do
  while IFS= read -r target; do
    [ -z "$target" ] && continue
    case "$target" in
      \#* | http:* | https:* | mailto:* | //*) continue ;;
    esac

    # A link may carry an anchor, such as file.md#section. Only the part
    # before the hash names a file.
    path="${target%%#*}"
    [ -z "$path" ] && continue

    resolved="$(dirname "$file")/$path"
    checked=$((checked + 1))

    if [ ! -e "$resolved" ]; then
      echo "::error file=${file#./}::Broken link to '$target'"
      fail=1
    fi
  done < <(
    {
      grep -oE '\]\([^)]+\)' "$file" | sed -E 's/^\]\(//; s/\)$//; s/ .*$//'
      grep -oE '<img[^>]+src="[^"]+"' "$file" | sed -E 's/.*src="//; s/"$//'
      grep -oE '<a[^>]+href="[^"]+"' "$file" | sed -E 's/.*href="//; s/"$//'
    } 2>/dev/null
  )
done < <(find . -name '*.md' -not -path './node_modules/*' -not -path './.git/*' | sort)

# A find that matches nothing leaves both counters at zero and the script
# reports success. That is the same failure this project guards against in the
# boundary test: a check that reads a directory has to say the directory held
# something.
if [ "$checked" -eq 0 ]; then
  echo "::error::Found no relative links at all. The search is broken, not the links."
  exit 1
fi

echo "Checked $checked relative links in Markdown files."
if [ "$fail" -eq 0 ]; then
  echo "Every one of them points at a file that exists."
fi

exit "$fail"
