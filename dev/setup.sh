#!/usr/bin/env bash
# 개발 환경 기동 + 계정/토큰 준비. 여러 번 실행해도 안전합니다.
set -euo pipefail
cd "$(dirname "$0")"

VIEWER_PW="${VIEWER_PW:-safety1234}"
TOPIC="${TOPIC:-safety-alerts}"

docker compose up -d

echo "서버 기동 대기..."
for i in $(seq 1 30); do
  curl -sf http://localhost:18080/v1/health >/dev/null && break
  sleep 1
  [[ $i -eq 30 ]] && { echo "기동 실패. docker compose logs ntfy"; exit 1; }
done

docker exec ntfy-dev sh -c "NTFY_PASSWORD='$VIEWER_PW' ntfy user add --ignore-exists safety-viewer" 2>&1 | tail -1
docker exec ntfy-dev sh -c "NTFY_PASSWORD='dev-backend' ntfy user add --ignore-exists safety-backend" 2>&1 | tail -1
docker exec ntfy-dev ntfy access safety-viewer  "$TOPIC" ro >/dev/null 2>&1
docker exec ntfy-dev ntfy access safety-backend "$TOPIC" wo >/dev/null 2>&1

# ntfy CLI 는 결과를 stderr 로 출력합니다.
# grep 이 빈 결과면 종료 코드 1 이라, pipefail 아래에서는 || true 가 필요합니다.
TOKEN=$(docker exec ntfy-dev ntfy token list safety-backend 2>&1 | grep -o 'tk_[A-Za-z0-9]*' | head -1 || true)
if [[ -z "$TOKEN" ]]; then
  TOKEN=$(docker exec ntfy-dev ntfy token add safety-backend 2>&1 | grep -o 'tk_[A-Za-z0-9]*' | head -1 || true)
  [[ -n "$TOKEN" ]] || { echo "토큰 발급 실패."; exit 1; }
fi

# $_ 가 bash 에서 먼저 치환되지 않도록 PowerShell 명령은 홑따옴표로 감쌉니다.
IP=$(powershell.exe -NoProfile -Command '(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq "Wi-Fi" -and $_.IPAddress -notlike "169.254.*" }).IPAddress' 2>/dev/null | tr -d '\r' | head -1 || true)
IP="${IP:-<이 PC의 IP>}"

cat <<OUT

────────────────────────────────
개발 환경 준비 완료

  알람 서버 (이 PC)     http://localhost:18080
  알람 서버 (폰·타 기기) http://$IP:18080
  발신 테스트 페이지     http://localhost:18081/ntfy-alarm-sample.html

  토픽        $TOPIC
  구독 계정   safety-viewer / $VIEWER_PW
  발행 토큰   $TOKEN

  트레이 앱 실행: powershell windows/run-dev.ps1
────────────────────────────────
OUT
