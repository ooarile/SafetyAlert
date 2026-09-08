# 개발용 트레이 앱 실행. 로컬 개발 서버(localhost:18080)에 붙습니다.
# 납품용 dist\SafetyAlarm\settings.json 은 건드리지 않습니다.
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root 'dist\SafetyAlarm\SafetyAlarm.exe'
$run  = Join-Path $root 'dist\dev'

if (-not (Test-Path $src)) {
    Write-Error "$src 가 없습니다. 먼저 windows\build.ps1 을 실행하십시오."
}

# 실행 중이면 먼저 내립니다. 중복 실행은 앱이 자체적으로 막습니다.
Get-Process SafetyAlarm -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

if (-not (Test-Path $run)) { New-Item -ItemType Directory $run | Out-Null }
Copy-Item $src $run -Force

# 개발 서버를 가리키는 설정
$cfg = [ordered]@{
    Server          = 'localhost:18080'
    Topic           = 'safety-alerts'
    User            = 'safety-viewer'
    Password        = 'safety1234'
    SoundPriority   = 4
    NotifyTimeoutMs = 20000
}
[IO.File]::WriteAllText((Join-Path $run 'settings.json'),
    ($cfg | ConvertTo-Json), [Text.UTF8Encoding]::new($false))

$p = Start-Process (Join-Path $run 'SafetyAlarm.exe') -PassThru
Start-Sleep -Seconds 5

$conn = Get-NetTCPConnection -OwningProcess $p.Id -ErrorAction SilentlyContinue |
        Where-Object { $_.RemotePort -eq 18080 -and $_.State -eq 'Established' }

Write-Host ""
Write-Host "트레이 앱 실행됨 (PID $($p.Id))"
if ($conn) {
    Write-Host "알람 서버 연결: 정상"
} else {
    Write-Host "알람 서버 연결: 실패 - dev\setup.sh 로 서버가 떠 있는지 확인하십시오."
    $log = Join-Path $run 'safety-alarm.log'
    if (Test-Path $log) { Get-Content $log -Tail 3 }
}
Write-Host "종료: 트레이 아이콘 우클릭 -> 종료"
