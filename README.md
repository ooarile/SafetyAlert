# 세이프티 알람 전송 시스템

폐쇄망 고객사에 알람 전송 기능을 납품하기 위한 소스와 설치 자산입니다.
상세 설계·운영 문서는 [docs/SAFETY_ALARM_BUILD_GUIDE.md](docs/SAFETY_ALARM_BUILD_GUIDE.md) 를 보십시오.

```
[세이프티 백엔드] --HTTP POST--> [ntfy :8080] --WebSocket--> [PC 트레이 앱]
                                             --WebSocket--> [Android ntfy 앱]
```

## 구성

| 경로 | 내용 |
|---|---|
| `server/install.sh` | 고객사 서버 설치 스크립트 (1회 실행, 재실행 안전) |
| `server/prepare-image.sh` | 인터넷 PC에서 오프라인 반입용 이미지 tar 생성 |
| `windows/SafetyAlarm/` | PC 상주 수신 앱 (.NET 8 WinForms, 외부 패키지 없음) |
| `windows/build.ps1` | 자체 포함 단일 exe 빌드 |
| `windows/deploy.ps1` | 고객사 PC 설치 + 시작 프로그램 등록 |
| `tools/ntfy-alarm-sample.html` | 발신 테스트 페이지 (데모·점검용) |
| `dist/` | 산출물. git 추적 제외 |

## 1. 반입 파일 준비 (인터넷 되는 PC)

```bash
cd server && ./prepare-image.sh          # dist/ntfy-image.tar 생성
```

```powershell
cd windows; .\build.ps1                  # dist/SafetyAlarm/SafetyAlarm.exe 생성
```

반입할 것: `install.sh`, `ntfy-image.tar`, `SafetyAlarm.exe`, `settings.json`, `ntfy.apk`

## 2. 서버 설치 (고객사 서버)

`install.sh` 와 `ntfy-image.tar` 를 같은 폴더에 두고:

```bash
sudo VIEWER_PW='고객사별_비밀번호' ./install.sh
```

환경변수로 조정할 수 있습니다: `INSTALL_DIR`(기본 `/opt/safety`), `TOPIC`(기본 `safety-alerts`),
`HTTP_PORT`(기본 `8080`), `IMAGE_TAG`, `IMAGE_TAR`.

스크립트는 설치 후 다음을 자동 확인합니다.
- 서버 health
- 토큰으로 발행 성공
- 구독 계정(`safety-viewer`)과 익명의 발행 시도가 403으로 거부되는지

발행 토큰은 `/opt/safety/.env` 에 저장됩니다. 백엔드와 발신 테스트 페이지가 이 값을 씁니다.

## 3. PC 수신 앱 배포

```powershell
# 관리자 PowerShell
cd windows; .\deploy.ps1
notepad 'C:\Program Files\SafetyAlarm\settings.json'   # 서버 IP·비밀번호 수정
Start-Process 'C:\Program Files\SafetyAlarm\SafetyAlarm.exe'
```

트레이 아이콘에 마우스를 올려 "연결됨" 이 뜨면 정상입니다. 우클릭 → **연결 상태**로 현재 서버·토픽·계정을 확인할 수 있습니다.

연결이 안 되면 앱이 원인을 판정해 알림으로 알려줍니다. 설치 담당자가 조치할 지점을 바로 지목합니다.

| 상황 | 알림 |
|---|---|
| `settings.json` 을 안 고치고 배포 | 설정이 필요합니다 — 기본값 그대로입니다 |
| 서버 주소 오타·서버 미기동·방화벽 | 알람 서버에 연결할 수 없습니다 |
| 비밀번호 오류 / 토픽 권한 없음 | 알람 서버 인증 실패 (HTTP 401·403) |
| 토픽 이름 오류 | 알람 토픽을 찾을 수 없습니다 (HTTP 404) |
| 서버는 정상인데 WebSocket 차단 | 실시간 연결에 실패했습니다 |

알림은 장애 구간당 1회, 계속 실패하면 10분 간격으로만 뜹니다. 같은 내용이 `safety-alarm.log` 에도 쌓입니다.

## 4. Android

가이드 7장 참고. **Instant delivery 켜기 + 배터리 제한 없음**을 빠뜨리면 며칠 뒤 알람이 끊깁니다.

## 5. 발신 테스트

`tools/ntfy-alarm-sample.html` 을 열고 서버 주소·토픽·**발행 토큰**을 입력한 뒤 알람 버튼을 누릅니다.
서버가 `auth-default-access: deny-all` 이므로 토큰 없이는 403 입니다.

## 검증 완료 항목 (2026-09-07, ntfy v2.11.0 로컬 재현)

- `install.sh` 의 계정·권한·토큰 발급 절차 (재실행 안전성 포함)
- 토큰 발행 성공 / `safety-viewer` 발행 403 / 익명 발행 403 / 익명 구독 403
- JSON 본문의 한글·특수문자(— ·) 무손실 왕복
- WebSocket + Basic 인증 구독 수신
- `?since=<마지막 id>` 재연결 시 놓친 알람 이어받기
- 발신 테스트 페이지 → 서버 → 구독자 전체 경로 (CORS preflight 포함)
- `SafetyAlarm.exe` 실행 → WebSocket 연결 수립, 서버 중단 후 재기동 시 자동 재연결
- 연결 실패 진단 5종 (아래 표) — 실제 exe를 시나리오별로 실행해 로그로 확인
- 실패 안내 중복 억제 — 재시도 7회 동안 알림 1회만 발생

`dist/` 에 들어 있는 산출물: `ntfy-image.tar` (26MB), `SafetyAlarm/SafetyAlarm.exe` (63MB, 자체 포함 단일 파일)

## 남은 작업

- 코드 서명 인증서 — 없으면 고객사 PC에서 SmartScreen 경고
- 앱 아이콘(`app.ico`) — 현재 윈도우 기본 경고 아이콘 사용
- 확인 버튼을 누를 때까지 사라지지 않는 알림, 경고음 반복 (가이드 6.7)
