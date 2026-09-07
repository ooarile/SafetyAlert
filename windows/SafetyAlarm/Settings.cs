using System;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;

namespace SafetyAlarm;

public class Settings
{
    public string Server { get; set; } = "192.168.0.10:8080";
    public string Topic { get; set; } = "safety-alerts";
    public string User { get; set; } = "safety-viewer";
    public string Password { get; set; } = "";

    /// <summary>우선순위가 이 값 이상이면 경고음을 냅니다.</summary>
    public int SoundPriority { get; set; } = 4;

    /// <summary>알림 표시 시간(밀리초).</summary>
    public int NotifyTimeoutMs { get; set; } = 30000;

    /// <summary>배포 템플릿에 들어 있는 값. 고치지 않고 설치한 것을 판별하는 데 씁니다.</summary>
    private const string TemplateServer = "192.168.0.10:8080";
    private const string TemplatePassword = "고객사별_비밀번호";

    /// <summary>실제로 읽은 설정 파일 경로. 안내 문구에 넣어 담당자가 바로 찾게 합니다.</summary>
    public static string FilePath { get; } = Path.Combine(AppContext.BaseDirectory, "settings.json");

    /// <summary>서버 주소나 비밀번호가 배포 기본값 그대로인지 여부.</summary>
    public bool LooksLikeTemplate =>
        Server == TemplateServer
        || Password == TemplatePassword
        || string.IsNullOrWhiteSpace(Password);

    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public static Settings Load()
    {
        var path = FilePath;
        if (!File.Exists(path))
        {
            MessageBox.Show($"settings.json 파일이 없습니다.\n{path}", "세이프티 알람",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            Environment.Exit(1);
        }

        try
        {
            var cfg = JsonSerializer.Deserialize<Settings>(File.ReadAllText(path), Options)
                      ?? throw new InvalidDataException("설정이 비어 있습니다.");

            if (string.IsNullOrWhiteSpace(cfg.Server) || string.IsNullOrWhiteSpace(cfg.Topic))
                throw new InvalidDataException("Server 와 Topic 은 반드시 입력해야 합니다.");

            cfg.Server = cfg.Server.Trim()
                .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
                .Replace("ws://", "", StringComparison.OrdinalIgnoreCase)
                .TrimEnd('/');
            cfg.Topic = cfg.Topic.Trim();
            return cfg;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"settings.json 을 읽을 수 없습니다.\n{ex.Message}", "세이프티 알람",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            Environment.Exit(1);
            throw; // 도달하지 않습니다
        }
    }
}
