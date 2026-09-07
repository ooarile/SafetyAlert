# 세이프티 알람 전송 시스템 — 개발 및 구축 통합 문서

폐쇄망 고객사에 알람 전송 기능을 납품하기 위해 필요한 것 전부를 담았습니다. 서버 설치 자동화, 백엔드 연동, 윈도우 수신 앱 개발, 안드로이드 세팅 순서입니다.

---

## 0. 산출물

| 구분 | 파일 | 용도 |
|---|---|---|
| 설치 스크립트 | `install.sh` | 고객사 서버에서 1회 실행 |
| 이미지 | `ntfy-image.tar` | 오프라인 반입용 |
| 수신 앱 | `SafetyAlarm.exe` | 고객사 PC 상주 |
| 수신 앱 설정 | `settings.json` | exe와 같은 폴더 |
| 안드로이드 앱 | `ntfy.apk` | 현장 단말 |
| 발신 테스트 | `ntfy-alarm-sample.html` | 데모·점검용. 발행 토큰 입력이 필요합니다 |

앞의 셋은 이 문서를 보고 만들고, 뒤의 셋은 내려받거나 이미 만들어져 있습니다.

---

## 1. 구성

```
 [세이프티 백엔드] --- HTTP POST ---> [ntfy 서버 :8080]
  이벤트 감지                              |
                                          +--- WebSocket ---> [PC 트레이 앱]
                                          +--- WebSocket ---> [Android 앱]
```

전부 평문 HTTP입니다. 폐쇄망 내부 통신이고, 인증 토큰으로 발행 권한을 통제합니다. 인증서를 쓰지 않는 이유는 두 가지입니다. 사설 인증서를 안드로이드 앱이 신뢰하지 않을 수 있고, PC에 인증서를 심는 절차가 고객사 IT팀 협조를 요구해 설치 일정을 늘립니다. 브라우저로도 접속하려면 부록 A를 보십시오.

### 지원 범위

| 단말 | 앱 종료·화면 꺼짐 상태 |
|---|---|
| PC (트레이 앱) | 수신 가능 |
| Android | 수신 가능 |
| iPhone / iPad | **수신 불가** |

iOS는 애플이 앱의 백그라운드 상시 연결을 금지하므로 우회 방법이 없습니다. 아이폰으로 알람을 받으려면 애플 푸시 서버를 경유해야 하고 이는 인터넷을 요구합니다. 제안 단계에서 알람 단말을 Android로 못 박으십시오.

---

## 2. 고객사 사전 확인

- [ ] 서버에 Docker, Docker Compose 설치 여부
- [ ] 서버 고정 내부 IP 확보
- [ ] 단말 → 서버 TCP 8080 인바운드 방화벽 허용
- [ ] 개인 스마트폰의 사내 Wi-Fi 접속 허용 여부
- [ ] APK 설치 허용 여부 (MDM으로 막는 곳이 있습니다)
- [ ] 알람 수신 PC에 exe 실행 허용 여부

3번과 4번이 막히면 해당 경로가 통째로 사라집니다. 설치 일정 전에 확인하십시오.

---

## 3. 반입 파일 준비

인터넷이 되는 PC에서 미리 만듭니다.

```bash
docker pull binwiederhier/ntfy:v2.11.0
docker save binwiederhier/ntfy:v2.11.0 -o ntfy-image.tar
```

버전 태그는 릴리스 페이지에서 확인해 고정하십시오. APK는 ntfy GitHub 릴리스에서 받습니다. **F-Droid 또는 GitHub 배포판을 쓰십시오.** 플레이스토어 배포판은 구글 푸시 서비스 의존 코드가 있어 폐쇄망에서 불필요한 지연이 생깁니다.

---

## 4. 서버 설치 스크립트

`install.sh` 로 저장하고 `ntfy-image.tar` 와 같은 폴더에 둡니다.
(이 저장소에서는 `server/install.sh` 에 들어 있으며, 아래 코드에 더해 `INSTALL_DIR`·`TOPIC`·`HTTP_PORT`
환경변수 지원과 설치 후 권한 검증이 추가되어 있습니다.)

```bash
#!/usr/bin/env bash
set -euo pipefail

# ===== 설정 =====
INSTALL_DIR="/opt/safety"
IMAGE_TAG="binwiederhier/ntfy:v2.11.0"
IMAGE_TAR="./ntfy-image.tar"
TOPIC="safety-alerts"
VIEWER_PW="${VIEWER_PW:-safety1234}"   # 현장 사용자 구독 비밀번호

# ===== 사전 확인 =====
[[ $EUID -eq 0 ]] || { echo "root 권한으로 실행하십시오."; exit 1; }

if ! command -v docker >/dev/null; then
  echo "Docker가 설치되어 있지 않습니다."
  echo "폐쇄망에서는 자동 설치가 불가하므로 고객사 IT팀에 설치를 요청하십시오."
  exit 1
fi

docker compose version >/dev/null 2>&1 || { echo "Docker Compose 플러그인이 없습니다."; exit 1; }

# ===== 이미지 적재 =====
if ! docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
  [[ -f "$IMAGE_TAR" ]] || { echo "$IMAGE_TAR 를 찾을 수 없습니다."; exit 1; }
  echo "이미지 적재 중..."
  docker load -i "$IMAGE_TAR"
fi

# ===== 디렉터리 =====
mkdir -p "$INSTALL_DIR/ntfy/"{cache,lib}

# ===== 서버 설정 =====
cat > "$INSTALL_DIR/ntfy/server.yml" <<'EOF'
listen-http: ":8080"

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
      - "8080:8080"
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
for i in {1..30}; do
  curl -sf http://localhost:8080/v1/health >/dev/null && break
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
ENV_FILE="$INSTALL_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  # ntfy CLI 는 결과를 stderr 로 출력합니다. 2>&1 을 빼면 토큰을 못 받고 여기서 중단됩니다.
  TOKEN=$(docker exec ntfy ntfy token add safety-backend 2>&1 | grep -o 'tk_[A-Za-z0-9]*' | head -1)
  [[ -n "$TOKEN" ]] || { echo "토큰 발급 실패."; exit 1; }
  printf 'NTFY_URL=http://localhost:8080\nNTFY_TOPIC=%s\nNTFY_TOKEN=%s\n' "$TOPIC" "$TOKEN" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
source "$ENV_FILE"

# ===== 검증 발송 =====
curl -sf -H "Authorization: Bearer $NTFY_TOKEN" \
  -d "{\"topic\":\"$TOPIC\",\"title\":\"설치 완료\",\"message\":\"알람 서버가 정상 동작합니다.\",\"priority\":3}" \
  http://localhost:8080/ >/dev/null && echo "검증 발송 성공" || { echo "검증 발송 실패"; exit 1; }

IP=$(hostname -I | awk '{print $1}')
cat <<EOF

────────────────────────────────
설치 완료

  서버 주소   http://$IP:8080
  토픽        $TOPIC
  구독 계정   safety-viewer / $VIEWER_PW
  발행 토큰   $INSTALL_DIR/.env 에 저장됨

다음: PC에 SafetyAlarm.exe 배포, 단말에 ntfy 앱 설치
────────────────────────────────
EOF
```

실행:

```bash
chmod +x install.sh
sudo VIEWER_PW='고객사별_비밀번호' ./install.sh
```

여러 번 실행해도 안전합니다. 계정과 토큰은 이미 있으면 건너뜁니다.

> Docker 자체 설치는 자동화하지 않았습니다. 폐쇄망에서는 패키지 저장소 접근이 불가하고, 고객사 서버의 OS·보안 정책에 따라 방식이 달라지므로 IT팀 작업 영역으로 남기는 것이 맞습니다.

---

## 5. 백엔드 연동

### 5.1 발송 규격

```
POST http://ntfy:8080/
Authorization: Bearer tk_...

{
  "topic": "safety-alerts",
  "title": "넘어짐 감지 — 1구역 압출기 라인",
  "message": "작업자 넘어짐이 감지되었습니다. 즉시 확인이 필요합니다.",
  "priority": 5,
  "tags": ["rotating_light"]
}
```

**HTTP 헤더로 제목을 보내지 마십시오.** ntfy 문서에 `Title` 헤더 방식이 나오지만 헤더에는 한글과 이모지를 안전하게 담을 수 없어 제목이 깨집니다. 반드시 JSON 방식을 쓰십시오.

우선순위 매핑:

| 이벤트 | priority | 동작 |
|---|---|---|
| 넘어짐 감지 | 5 | 방해금지 모드 무시하고 울림 |
| 위험구역 침입 | 4 | 소리 있음 |
| 안전모 미착용 | 3 | 기본 |

### 5.2 C# 구현

```csharp
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class NtfyService
{
    private static readonly HttpClient client = new HttpClient();

    private static readonly string BaseUrl = Environment.GetEnvironmentVariable("NTFY_URL");
    private static readonly string Topic   = Environment.GetEnvironmentVariable("NTFY_TOPIC");
    private static readonly string Token   = Environment.GetEnvironmentVariable("NTFY_TOKEN");

    public static async Task<bool> SendAlertAsync(string title, string message, int priority)
    {
        var payload = new { topic = Topic, title, message, priority };

        var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl.TrimEnd('/') + "/")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8)
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Token);

        try
        {
            var response = await client.SendAsync(request);
            response.EnsureSuccessStatusCode();
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ntfy] 전송 실패: {ex.Message}");
            return false;
        }
    }
}
```

**알람 전송 실패가 감지 파이프라인을 멈추면 안 됩니다.** 예외를 삼키되 로그에 남기고, 전송 성공 여부는 자사 DB에 기록하십시오. ntfy는 전달 이력을 남기지 않습니다.

### 5.3 compose에 백엔드 추가

`install.sh` 가 만든 `docker-compose.yml` 에 자사 서비스를 추가합니다.

```yaml
  safety-backend:
    image: safety-app:latest
    ports:
      - "5000:5000"
    env_file: .env
    environment:
      - NTFY_URL=http://ntfy:8080   # 컨테이너 간 통신은 서비스명
    depends_on:
      - ntfy
```

`.env` 의 `NTFY_URL` 은 localhost로 되어 있으므로 여기서 덮어씁니다. 컨테이너 안에서 localhost는 자기 자신을 가리켜 연결이 실패합니다.

---

## 6. 윈도우 수신 앱 개발

브라우저 탭에 의존하지 않고, PC가 켜져 있으면 무조건 알람을 받는 상주 프로그램입니다.

### 6.1 프로젝트 생성

```bash
dotnet new winforms -n SafetyAlarm
cd SafetyAlarm
```

`SafetyAlarm.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <Nullable>enable</Nullable>
    <ApplicationIcon>app.ico</ApplicationIcon>
  </PropertyGroup>
</Project>
```

외부 패키지를 쓰지 않습니다. 폐쇄망 재빌드 상황에서 NuGet 의존성이 문제가 되는 것을 피하기 위해서입니다.

### 6.2 `Program.cs`

```csharp
using System;
using System.Windows.Forms;

namespace SafetyAlarm;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new AlarmContext());
    }
}
```

### 6.3 `AlarmContext.cs`

```csharp
using System;
using System.Drawing;
using System.IO;
using System.Media;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SafetyAlarm;

public class AlarmContext : ApplicationContext
{
    private readonly NotifyIcon _tray;
    private readonly CancellationTokenSource _cts = new();
    private readonly Settings _cfg;
    private string? _lastId;

    public AlarmContext()
    {
        _cfg = Settings.Load();

        var menu = new ContextMenuStrip();
        menu.Items.Add("종료", null, (_, _) => Exit());

        _tray = new NotifyIcon
        {
            Icon = SystemIcons.Warning,
            Text = "세이프티 알람",
            Visible = true,
            ContextMenuStrip = menu
        };

        _ = Task.Run(() => ListenLoopAsync(_cts.Token));
    }

    private async Task ListenLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ConnectAsync(ct);
            }
            catch (OperationCanceledException) { return; }
            catch (Exception)
            {
                SetStatus("연결 끊김 — 재시도 중");
            }

            try { await Task.Delay(5000, ct); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task ConnectAsync(CancellationToken ct)
    {
        using var ws = new ClientWebSocket();

        var credential = Convert.ToBase64String(
            Encoding.UTF8.GetBytes($"{_cfg.User}:{_cfg.Password}"));
        ws.Options.SetRequestHeader("Authorization", "Basic " + credential);

        // 재연결 시 놓친 알람을 이어받습니다
        var since = _lastId is null ? "" : $"?since={_lastId}";
        var url = $"ws://{_cfg.Server}/{_cfg.Topic}/ws{since}";

        await ws.ConnectAsync(new Uri(url), ct);
        SetStatus("연결됨");

        var buffer = new byte[8192];
        while (ws.State == WebSocketState.Open && !ct.IsCancellationRequested)
        {
            using var ms = new MemoryStream();
            WebSocketReceiveResult result;
            do
            {
                result = await ws.ReceiveAsync(buffer, ct);
                if (result.MessageType == WebSocketMessageType.Close) return;
                ms.Write(buffer, 0, result.Count);
            } while (!result.EndOfMessage);

            Handle(Encoding.UTF8.GetString(ms.ToArray()));
        }
    }

    private void Handle(string json)
    {
        try
        {
            var root = JsonDocument.Parse(json).RootElement;
            if (root.GetProperty("event").GetString() != "message") return;

            _lastId = root.GetProperty("id").GetString();

            var title = root.TryGetProperty("title", out var t) ? t.GetString() : "알람";
            var body = root.TryGetProperty("message", out var m) ? m.GetString() : "";
            var priority = root.TryGetProperty("priority", out var p) ? p.GetInt32() : 3;

            Show(title ?? "알람", body ?? "", priority);
        }
        catch (Exception) { /* 형식이 다른 메시지는 무시 */ }
    }

    private void Show(string title, string body, int priority)
    {
        _tray.ShowBalloonTip(
            30000, title, body,
            priority >= 4 ? ToolTipIcon.Error : ToolTipIcon.Warning);

        if (priority >= 4) SystemSounds.Exclamation.Play();
    }

    private void SetStatus(string s) => _tray.Text = $"세이프티 알람 — {s}";

    private void Exit()
    {
        _cts.Cancel();
        _tray.Visible = false;
        _tray.Dispose();
        ExitThread();
    }
}

public class Settings
{
    public string Server { get; set; } = "192.168.0.10:8080";
    public string Topic { get; set; } = "safety-alerts";
    public string User { get; set; } = "safety-viewer";
    public string Password { get; set; } = "";

    public static Settings Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "settings.json");
        if (!File.Exists(path))
        {
            MessageBox.Show("settings.json 파일이 없습니다.", "세이프티 알람");
            Environment.Exit(1);
        }
        return JsonSerializer.Deserialize<Settings>(File.ReadAllText(path))!;
    }
}
```

### 6.4 `settings.json`

exe와 같은 폴더에 둡니다. 고객사마다 이 파일만 바꿔서 배포하면 됩니다.

```json
{
  "Server": "192.168.0.10:8080",
  "Topic": "safety-alerts",
  "User": "safety-viewer",
  "Password": "고객사별_비밀번호"
}
```

### 6.5 빌드

```bash
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true
```

`bin/Release/net8.0-windows/win-x64/publish/` 에 exe 하나가 생깁니다. **자체 포함 방식이라 고객사 PC에 .NET 런타임을 따로 설치할 필요가 없습니다.** 폐쇄망에서 런타임 설치는 번거로우므로 이 옵션을 반드시 유지하십시오.

### 6.6 PC 배포

1. `SafetyAlarm.exe` 와 `settings.json` 을 `C:\Program Files\SafetyAlarm\` 에 복사
2. 시작 프로그램 등록 — `Win + R` → `shell:startup` → 열린 폴더에 exe 바로가기 생성
3. 실행 후 트레이 아이콘에 마우스를 올려 "연결됨" 표시 확인

### 6.7 연결 실패 안내

앞의 코드는 연결이 끊기면 트레이 툴팁만 바꿉니다. 실제 저장소의 구현은 여기에 더해
**원인을 판정해 알림으로 알려줍니다.** 설치 담당자가 `settings.json` 수정을 빠뜨렸을 때
증상이 "아무 일도 안 일어남" 으로 나타나는 것을 막기 위해서입니다.

판정은 WebSocket 핸드셰이크 실패 후 같은 계정으로 HTTP 를 한 번 조회해서 합니다.
**ntfy 는 WebSocket 인증 실패를 401 이 아니라 200 빈 응답으로 돌려주므로**
핸드셰이크 상태 코드만으로는 인증 실패와 네트워크 장애를 구분할 수 없습니다.

| 조회 결과 | 안내 |
|---|---|
| 서버에 못 닿음 | 알람 서버에 연결할 수 없습니다 — 주소·기동 여부·방화벽 |
| 401 / 403 | 알람 서버 인증 실패 — 계정·비밀번호 또는 토픽 권한 |
| 404 | 알람 토픽을 찾을 수 없습니다 |
| 200 | 실시간 연결에 실패했습니다 — 프록시·방화벽의 WebSocket 차단 |

시작 시 `settings.json` 이 배포 기본값(`192.168.0.10:8080`, `고객사별_비밀번호`) 그대로면
연결 시도 전에 먼저 안내합니다. 알림은 장애 구간당 1회, 계속 실패하면 10분 간격입니다.

### 6.8 남은 개선 항목

지금 구현은 윈도우 기본 알림(풍선 도움말)을 사용합니다. 다음이 필요하면 추가 개발이 필요합니다.

- 사용자가 확인 버튼을 누를 때까지 사라지지 않는 알림
- 전용 경고음 반복 재생
- 알람 클릭 시 자사 대시보드 해당 이벤트로 이동
- 코드 서명 인증서 (없으면 윈도우 SmartScreen 경고가 뜹니다)

마지막 항목은 고객사 납품 시 실제로 문제가 됩니다. 영업 초기에 코드 서명 인증서 구매를 검토하십시오.

---

## 7. 안드로이드 세팅

1. APK를 단말에 복사하고 설치 (출처를 알 수 없는 앱 허용 필요)
2. 앱 실행 → **+** 버튼
3. **Use another server** 체크
4. Service URL `http://192.168.0.10:8080`, Topic `safety-alerts`
5. 로그인 정보에 `safety-viewer` 계정 입력

### 백그라운드 수신 설정 — 필수

이 셋을 빠뜨리면 화면이 꺼졌을 때 알람이 끊깁니다.

1. 앱 설정 → **Instant delivery** 켜기
2. 안드로이드 설정 → 앱 → ntfy → 배터리 → **제한 없음**
3. 삼성·샤오미·오포 단말은 **자동 실행 허용** 별도 설정

상태바에 ntfy 상주 알림이 뜨는 것이 정상입니다. 이 알림을 지우면 연결이 끊깁니다. 사용자에게 "이 앱을 종료하지 마십시오"를 안내하십시오.

---

## 8. 설치 검증

- [ ] `install.sh` 실행 → 검증 발송 성공 출력
- [ ] PC 트레이 아이콘 "연결됨" 표시
- [ ] 발신 테스트 HTML로 발송 → PC 알림 표시
- [ ] Android 앱 포그라운드 수신
- [ ] **Android 화면 끄고 5분 대기 후 발송 → 수신**
- [ ] PC 네트워크 케이블 뽑았다 꽂고 발송 → 수신
- [ ] PC 재부팅 후 트레이 앱 자동 실행 확인
- [ ] `safety-viewer` 계정으로 발행 시도 → 거부
- [ ] 인증 없이 발행 시도 → 거부
- [ ] 자사 백엔드 실제 이벤트 발생 → 알람 도달

5번이 가장 중요합니다. 배터리 최적화 누락은 설치 당일에는 정상으로 보이다가 며칠 뒤 알람이 끊기는 형태로 나타납니다.

---

## 9. 문제 해결

| 증상 | 조치 |
|---|---|
| 스크립트가 Docker 없다고 종료 | 고객사 IT팀에 Docker 설치 요청 |
| 트레이 앱 "연결 끊김" 지속 | 방화벽 8080, settings.json의 서버 IP 확인 |
| 403 Forbidden | 토큰 또는 계정 권한. `docker exec ntfy ntfy access` 로 확인 |
| Android 며칠 뒤부터 안 옴 | 배터리 최적화. 7장 설정 재확인 |
| 제목 깨짐 | 헤더 방식으로 보낸 경우. JSON 방식으로 변경 |
| 백엔드에서 연결 거부 | 컨테이너에서 `localhost` 사용. `http://ntfy:8080` 으로 변경 |
| exe 실행 시 보안 경고 | 코드 서명 없음. 고객사에 예외 등록 요청 또는 인증서 구매 |

로그: `docker compose logs -f ntfy`

---

## 10. 운영

- **캐시 기간** 24시간. 이후 미수신 메시지는 사라집니다.
- **알람 이력** ntfy에는 수신 확인·읽음·조치 이력 기능이 없습니다. 자사 DB에 별도 기록하십시오.
- **백업** `ntfy/lib/user.db` 만 백업하면 됩니다.
- **업그레이드** 이미지 tar 재반입 후 태그 변경, `docker compose up -d`.

---

## 11. 제안서에 명시할 제약

1. iOS는 실시간 알람 수신이 불가합니다.
2. 알람 전달은 최선 노력 방식입니다. 미수신 시 자동 재발송이나 에스컬레이션이 없습니다.
3. 수신·확인 여부를 추적할 수 없습니다.
4. PC 알람은 프로그램이 실행 중일 때만 동작합니다.

이 때문에 알람 채널은 보조 수단으로 포지셔닝하십시오. 도달 보장이 계약 요건이라면 대시보드와 무전 채널을 주 경로로 두어야 합니다.

---

## 부록 A. 브라우저로도 접속하려면

트레이 앱 대신 브라우저를 쓰려면 HTTPS가 필요합니다. 브라우저는 보안 연결이 아닌 페이지에서 알림 팝업을 차단하기 때문입니다.

```bash
# 사내 루트 인증서
openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
  -keyout ca.key -out ca.crt -subj "/CN=Safety Internal CA"

# 서버 인증서
openssl req -newkey rsa:2048 -nodes -keyout server.key -out server.csr \
  -subj "/CN=192.168.0.10"

cat > san.cnf <<'EOF'
subjectAltName = IP:192.168.0.10
extendedKeyUsage = serverAuth
EOF

openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 398 -sha256 -extfile san.cnf

cat server.crt ca.crt > fullchain.crt
```

`server.yml` 에 추가:

```yaml
base-url: "https://192.168.0.10:8443"
listen-https: ":8443"
key-file: "/etc/ntfy/certs/server.key"
cert-file: "/etc/ntfy/certs/fullchain.crt"
```

compose에 `- ./ntfy/certs:/etc/ntfy/certs:ro` 볼륨과 `8443:8443` 포트를 추가합니다. 각 PC에는 `ca.crt` 를 신뢰할 수 있는 루트 인증 기관에 설치해야 합니다.

**단, 브라우저 방식에는 두 가지 한계가 남습니다.** 탭을 닫으면 알람이 오지 않고, 서버 인증서가 398일 후 만료되면 알림이 조용히 멈춥니다. 만료일을 유지보수 일정에 등록하십시오. 이 두 가지가 트레이 앱을 기본으로 삼은 이유입니다.
