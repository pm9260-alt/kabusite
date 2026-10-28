#!/bin/sh
# 納品の zip を作る（公開用の dist/ の中身と、いちばん上に test-results.md）。使い方：sh tools/make-zip.sh 2026-10-28 v19
set -e
cd "$(dirname "$0")/.."
Z=/home/user/ichioku1000_cloudflare_$1_$2.zip
rm -f "$Z"
(cd dist && zip -qr "$Z" .)
zip -qj "$Z" test-results.md
# 使ってはいけない文字列が入っていないか
n=$(unzip -p "$Z" | grep -ac "p\.m\.9260${ICHIOKU_ESTAT_APPID:+\|$ICHIOKU_ESTAT_APPID}" || true)
[ "$n" = "0" ] || { echo "使ってはいけない文字列 $n 件"; exit 1; }
cp "$Z" ./
echo "$Z $(du -h "$Z" | cut -f1)"
