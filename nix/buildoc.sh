#!/bin/bash
test "$stdenv" && source $stdenv/setup

dotproc=${dotproc-dot}
mdproc=${mdproc-markdown}
src=${src-.}
test "$out" && dest="$out/share/doc" || dest=.

mkdir -p $dest

for dot in $src/*.dot; do
  $dotproc -Tsvg -o $dest/`basename ${dot%%.dot}.svg` ${dot}
done

for md in $src/*.md; do
  $mdproc -o $dest/`basename ${md%%.md}.html` ${md}
done
