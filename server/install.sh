#!/usr/bin/env bash
# 세이프티 알람 서버 설치 스크립트 (폐쇄망 고객사 서버에서 1회 실행)
# 여러 번 실행해도 안전합니다. 계정·토큰은 이미 있으면 건너뜁니다.
set -euo pipefail

# ===== 설정 (환경변수로 덮어쓸 수 있습니다) =====
INSTALL_DIR="${INSTALL_DIR:-/opt/safety}"
IMAGE_TAG="${IMAGE_TAG:-binwiederhier/ntfy:v2.11.0}"
IMAGE_TAR="${IMAGE_TAR:-./ntfy-image.tar}"
TOPIC="${TOPIC:-safety-alerts}"
HTTP_PORT="${HTTP_PORT:-8080}"
VIEWER_PW="${VIEWER_PW:-safety1234}"   # 현장 사용자 구독 비밀번호

# ===== 사전 확인 =====
[[ $EUID -eq 0 ]] || { echo "root 권한으로 실행하십시오. (sudo ./install.sh)"; exit 1; }

if ! command -v docker >/dev/null; then
  echo "Docker가 설치되어 있지 않습니다."
  echo "폐쇄망에서는 자동 설치가 불가하므로 고객사 IT팀에 설치를 요청하십시오."
  exit 1
fi

docker compose version >/dev/null 2>&1 || { echo "Docker Compose 플러그인이 없습니다."; exit 1; }

if [[ "$VIEWER_PW" == "safety1234" ]]; then
  echo "경고: 기본 비밀번호를 사용합니다. 납품 시에는 VIEWER_PW 를 지정하십시오."
fi

# ===== 이미지 적재 =====
if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
  [[ -f "$IMAGE_TAR" ]] || { echo "$IMAGE_TAR 를 찾을 수 없습니다. prepare-image.sh 로 만든 tar를 같은 폴더에 두십시오."; exit 1; }
  echo "이미지 적재 중..."
  docker load -i "$IMAGE_TAR"
fi

# ===== 디렉터리 =====
mkdir -p "$INSTALL_DIR/ntfy/"{cache,lib}

# ===== 서버 설정 =====
cat > "$INSTALL_DIR/ntfy/server.yml" <<EOF
listen-http: ":$HTTP_PORT"

cache-file: "/var/cache/ntfy/cache.db"
cache-duration: "24h"

auth-file: "/var/lib/ntfy/user.db"
auth-default-access: "deny-all"

attachment-cache-dir: ""
log-level: "info"
EOF

# ===== compose =====
cat > "$INSTALL_DIR/docker-compose.yml" <<EOF
services:
  ntfy:
    image: $IMAGE_TAG
    container_name: ntfy
    command: serve
    ports:
      - "$HTTP_PORT:$HTTP_PORT"
    volumes:
      - ./ntfy/server.yml:/etc/ntfy/server.yml:ro
      - ./ntfy/cache:/var/cache/ntfy
      - ./ntfy/lib:/var/lib/ntfy
    restart: unless-stopped
EOF

# ===== 기동 =====
cd "$INSTALL_DIR"
docker compose up -d
echo "서버 기동 대기..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:$HTTP_PORT/v1/health" >/dev/null; then break; fi
  sleep 1
  [[ $i -eq 30 ]] && { echo "기동 실패. docker compose logs ntfy 를 확인하십시오."; exit 1; }
done

# ===== 계정 =====
# 이미 있으면 건너뜁니다. 재실행해도 안전합니다.
docker exec ntfy sh -c "NTFY_PASSWORD='$VIEWER_PW' ntfy user add --ignore-exists safety-viewer"
docker exec ntfy sh -c "NTFY_PASSWORD='$(openssl rand -base64 24)' ntfy user add --ignore-exists safety-backend"

docker exec ntfy ntfy access safety-viewer  "$TOPIC" ro
docker exec ntfy ntfy access safety-backend "$TOPIC" wo

# ===== 토큰 =====
# .env 가 이미 있으면 기존 토큰을 그대로 씁니다. 재실행 시 백엔드 설정이 깨지지 않게 하기 위해서입니다.
ENV_FILE="$INSTALL_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  # ntfy CLI 는 결과를 stderr 로 출력합니다. 2>&1 을 빼면 토큰을 못 받습니다.
  TOKEN=$(docker exec ntfy ntfy token add safety-backend 2>&1 | grep -o 'tk_[A-Za-z0-9]*' | head -1)
  [[ -n "$TOKEN" ]] || { echo "토큰 발급 실패."; exit 1; }
  printf 'NTFY_URL=http://localhost:%s\nNTFY_TOPIC=%s\nNTFY_TOKEN=%s\n' "$HTTP_PORT" "$TOPIC" "$TOKEN" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

# ===== 검증 발송 =====
curl -sf -H "Authorization: Bearer $NTFY_TOKEN" \
  -d "{\"topic\":\"$TOPIC\",\"title\":\"설치 완료\",\"message\":\"알람 서버가 정상 동작합니다.\",\"priority\":3}" \
  "http://localhost:$HTTP_PORT/" >/dev/null && echo "검증 발송 성공" || { echo "검증 발송 실패"; exit 1; }

# ===== 권한 검증 =====
# 구독 계정으로 발행이 막히는지, 인증 없이 발행이 막히는지 확인합니다.
VIEWER_CODE=$(curl -s -o /dev/null -w '%{http_code}' -u "safety-viewer:$VIEWER_PW" \
  -d "{\"topic\":\"$TOPIC\",\"message\":\"권한 시험\"}" "http://localhost:$HTTP_PORT/")
ANON_CODE=$(curl -s -o /dev/null -w '%{http_code}' \
  -d "{\"topic\":\"$TOPIC\",\"message\":\"권한 시험\"}" "http://localhost:$HTTP_PORT/")
if [[ "$VIEWER_CODE" == "200" || "$ANON_CODE" == "200" ]]; then
  echo "경고: 발행 권한이 열려 있습니다 (viewer=$VIEWER_CODE, anon=$ANON_CODE). server.yml 설정을 확인하십시오."
else
  echo "권한 검증 통과 (viewer=$VIEWER_CODE, anon=$ANON_CODE)"
fi

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
IP="${IP:-<서버IP>}"
cat <<EOF

────────────────────────────────
설치 완료

  서버 주소   http://$IP:$HTTP_PORT
  토픽        $TOPIC
  구독 계정   safety-viewer / $VIEWER_PW
  발행 토큰   $INSTALL_DIR/.env 에 저장됨

다음: PC에 SafetyAlarm.exe 배포, 단말에 ntfy 앱 설치
────────────────────────────────
EOF
