using System;
using System.Drawing;
using System.IO;
using System.Media;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace SafetyAlarm;

public class AlarmContext : ApplicationContext
{
    private const int ReconnectDelayMs = 5000;

    /// <summary>실패 원인 판정용 HTTP 프로브. 연결이 안 될 때만 씁니다.</summary>
    private static readonly HttpClient Http = new();

    /// <summary>연결이 계속 실패할 때 같은 안내를 다시 띄우는 간격.</summary>
    private static readonly TimeSpan RenotifyInterval = TimeSpan.FromMinutes(10);

    private readonly NotifyIcon _tray;
    private readonly CancellationTokenSource _cts = new();
    private readonly Settings _cfg;
    private string? _lastId;

    // 연결 실패 안내를 5초마다 반복해서 띄우지 않기 위한 상태입니다.
    private bool _connected;
    private DateTime _lastFailureNotice = DateTime.MinValue;

    public AlarmContext()
    {
        _cfg = Settings.Load();

        var menu = new ContextMenuStrip();
        menu.Items.Add("연결 상태", null, (_, _) => ShowConnectionInfo());
        menu.Items.Add("테스트 알림", null, (_, _) => Show("테스트", "알림이 정상 표시됩니다.", 3));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("종료", null, (_, _) => Exit());

        _tray = new NotifyIcon
        {
            Icon = SystemIcons.Warning,
            Text = "세이프티 알람",
            Visible = true,
            ContextMenuStrip = menu
        };
        SetStatus("연결 중");

        // 설정 파일을 고치지 않고 배포한 경우를 설치 시점에 바로 잡아냅니다.
        if (_cfg.LooksLikeTemplate)
        {
            Notify("설정이 필요합니다",
                "settings.json 이 배포 기본값 그대로입니다.\n"
                + "고객사 서버 주소와 비밀번호로 수정하십시오.\n"
                + Settings.FilePath,
                ToolTipIcon.Warning);
        }

        _ = Task.Run(() => ListenLoopAsync(_cts.Token));
    }

    private async Task ListenLoopAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await ConnectAsync(ct);
                _connected = false;
                SetStatus("연결 끊김 — 재시도 중");
            }
            catch (OperationCanceledException) { return; }
            catch (Exception ex)
            {
                _connected = false;
                SetStatus("연결 끊김 — 재시도 중");
                Log(ex.Message);
                await NotifyFailureAsync(ct);
            }

            try { await Task.Delay(ReconnectDelayMs, ct); }
            catch (OperationCanceledException) { return; }
        }
    }

    private async Task ConnectAsync(CancellationToken ct)
    {
        using var ws = new ClientWebSocket();

        ws.Options.SetRequestHeader("Authorization", "Basic " + Credential());

        // 케이블이 뽑히는 등으로 연결이 조용히 죽는 것을 감지합니다.
        ws.Options.KeepAliveInterval = TimeSpan.FromSeconds(30);

        // 핸드셰이크가 거부됐을 때 응답 코드를 로그에 남기기 위해서입니다.
        // 원인 판정은 이 코드만으로 안 되므로 ProbeAsync 를 함께 씁니다.
        ws.Options.CollectHttpResponseDetails = true;

        // 재연결 시 놓친 알람을 이어받습니다.
        var since = _lastId is null ? "" : $"?since={_lastId}";
        var url = $"ws://{_cfg.Server}/{_cfg.Topic}/ws{since}";

        try
        {
            await ws.ConnectAsync(new Uri(url), ct);
        }
        catch (WebSocketException ex) when (ws.HttpStatusCode != 0)
        {
            throw new ConnectFailedException(ws.HttpStatusCode, ex);
        }

        _connected = true;
        _lastFailureNotice = DateTime.MinValue;   // 다음 장애 때 다시 알리도록 초기화
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

    /// <summary>
    /// 연결 실패를 사용자에게 알립니다. 5초마다 뜨면 방해가 되므로
    /// 장애 구간당 한 번, 계속 안 되면 10분 간격으로만 띄웁니다.
    /// </summary>
    private async Task NotifyFailureAsync(CancellationToken ct)
    {
        if (DateTime.Now - _lastFailureNotice < RenotifyInterval) return;
        _lastFailureNotice = DateTime.Now;

        var (title, body) = Diagnose(await ProbeAsync(ct));
        Notify(title, body, ToolTipIcon.Error);
    }

    /// <summary>
    /// 같은 계정으로 HTTP 를 한 번 찔러 실패 원인을 가려냅니다.
    /// ntfy 는 WebSocket 인증 실패를 401 이 아니라 200 빈 응답으로 돌려주기 때문에
    /// 핸드셰이크 상태 코드만으로는 인증 실패와 네트워크 장애를 구분할 수 없습니다.
    /// </summary>
    /// <returns>서버에 닿지 못하면 null.</returns>
    private async Task<HttpStatusCode?> ProbeAsync(CancellationToken ct)
    {
        try
        {
            var url = $"http://{_cfg.Server}/{_cfg.Topic}/json?poll=1";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic", Credential());

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(5));

            using var res = await Http.SendAsync(req, cts.Token);
            return res.StatusCode;
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>실패 원인을 설치 담당자가 바로 조치할 수 있는 문장으로 바꿉니다.</summary>
    private (string Title, string Body) Diagnose(HttpStatusCode? probed)
    {
        if (probed is null)
        {
            return ("알람 서버에 연결할 수 없습니다",
                $"서버 {_cfg.Server} 에 닿지 않습니다.\n"
                + "서버 주소, 서버 실행 여부, 방화벽 허용을 확인하십시오.\n"
                + Settings.FilePath);
        }

        if (probed is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
        {
            return ("알람 서버 인증 실패",
                $"계정·비밀번호가 틀렸거나 이 토픽을 구독할 권한이 없습니다. (HTTP {(int)probed})\n"
                + $"계정 {_cfg.User}, 토픽 {_cfg.Topic}\n"
                + Settings.FilePath);
        }

        if (probed is HttpStatusCode.NotFound)
        {
            return ("알람 토픽을 찾을 수 없습니다",
                $"토픽 {_cfg.Topic} 을(를) 서버에서 찾지 못했습니다. (HTTP 404)\n"
                + Settings.FilePath);
        }

        // 서버도 계정도 정상인데 WebSocket 만 실패하는 경우입니다.
        return ("실시간 연결에 실패했습니다",
            $"서버 {_cfg.Server} 응답은 정상입니다. (HTTP {(int)probed})\n"
            + "중간의 프록시나 방화벽이 WebSocket 을 막고 있는지 확인하십시오.\n"
            + Settings.FilePath);
    }

    private string Credential() => Convert.ToBase64String(
        Encoding.UTF8.GetBytes($"{_cfg.User}:{_cfg.Password}"));

    private void ShowConnectionInfo()
    {
        var state = _connected ? "연결됨" : "연결 끊김 — 재시도 중";
        MessageBox.Show(
            $"상태: {state}\n서버: {_cfg.Server}\n토픽: {_cfg.Topic}\n계정: {_cfg.User}\n\n설정 파일: {Settings.FilePath}",
            "세이프티 알람", MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private void Handle(string json)
    {
        try
        {
            var root = JsonDocument.Parse(json).RootElement;

            // keepalive, open 등 다른 이벤트는 무시합니다.
            if (!root.TryGetProperty("event", out var ev) || ev.GetString() != "message") return;

            if (root.TryGetProperty("id", out var id)) _lastId = id.GetString();

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
            _cfg.NotifyTimeoutMs, title, body,
            priority >= _cfg.SoundPriority ? ToolTipIcon.Error : ToolTipIcon.Warning);

        if (priority >= _cfg.SoundPriority) SystemSounds.Exclamation.Play();
    }

    /// <summary>알람이 아닌 프로그램 안내. 로그에도 남겨 사후 확인이 가능하게 합니다.</summary>
    private void Notify(string title, string body, ToolTipIcon icon)
    {
        _tray.ShowBalloonTip(_cfg.NotifyTimeoutMs, title, body, icon);
        Log($"[안내] {title} — {body.Replace("\n", " ")}");
    }

    private void SetStatus(string s)
    {
        // NotifyIcon.Text 는 63자를 넘으면 예외가 납니다.
        var text = $"세이프티 알람 — {s}";
        _tray.Text = text.Length > 63 ? text[..63] : text;
    }

    /// <summary>진단용 로그. 알람 동작을 막지 않도록 실패는 무시합니다.</summary>
    private static void Log(string message)
    {
        try
        {
            var path = System.IO.Path.Combine(AppContext.BaseDirectory, "safety-alarm.log");
            File.AppendAllText(path, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}  {message}{Environment.NewLine}");
        }
        catch (Exception) { }
    }

    private void Exit()
    {
        _cts.Cancel();
        _tray.Visible = false;
        _tray.Dispose();
        ExitThread();
    }
}

/// <summary>핸드셰이크가 HTTP 응답으로 거부된 경우. 상태 코드를 진단에 씁니다.</summary>
public class ConnectFailedException : Exception
{
    public HttpStatusCode StatusCode { get; }

    public ConnectFailedException(HttpStatusCode statusCode, Exception inner)
        : base($"서버가 WebSocket 업그레이드를 거부했습니다. (HTTP {(int)statusCode})", inner)
    {
        StatusCode = statusCode;
    }
}
