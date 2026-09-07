#!/usr/bin/env bash
# 인터넷이 되는 PC에서 실행. 폐쇄망 반입용 이미지 tar 를 만듭니다.
set -euo pipefail

IMAGE_TAG="${IMAGE_TAG:-binwiederhier/ntfy:v2.11.0}"
OUT="${OUT:-../dist/ntfy-image.tar}"

mkdir -p "$(dirname "$OUT")"
docker pull "$IMAGE_TAG"
docker save "$IMAGE_TAG" -o "$OUT"

echo "생성됨: $OUT ($(du -h "$OUT" | cut -f1))"
echo "반입 파일: $OUT, install.sh"
