# 고객사 PC 배포 (관리자 권한 PowerShell에서 실행)
# dist\SafetyAlarm 의 exe와 settings.json 을 설치하고 시작 프로그램에 등록합니다.
$ErrorActionPreference = 'Stop'

$src     = Join-Path $PSScriptRoot '..\dist\SafetyAlarm'
$dest    = 'C:\Program Files\SafetyAlarm'
$exe     = Join-Path $dest 'SafetyAlarm.exe'
$startup = [Environment]::GetFolderPath('Startup')

if (-not (Test-Path (Join-Path $src 'SafetyAlarm.exe'))) {
    Write-Error "$src 에 SafetyAlarm.exe 가 없습니다. 먼저 build.ps1 을 실행하십시오."
}

if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest | Out-Null }

# settings.json 은 고객사 설정이므로 이미 있으면 덮어쓰지 않습니다.
Copy-Item (Join-Path $src 'SafetyAlarm.exe') $dest -Force
if (-not (Test-Path (Join-Path $dest 'settings.json'))) {
    Copy-Item (Join-Path $src 'settings.json') $dest
    Write-Host "settings.json 을 복사했습니다. 서버 IP와 비밀번호를 수정하십시오: $dest\settings.json"
} else {
    Write-Host "기존 settings.json 을 유지했습니다."
}

# 시작 프로그램 바로가기
$lnk = Join-Path $startup 'SafetyAlarm.lnk'
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnk)
$sc.TargetPath = $exe
$sc.WorkingDirectory = $dest
$sc.Description = '세이프티 알람'
$sc.Save()

Write-Host "설치 완료: $dest"
Write-Host "시작 프로그램 등록: $lnk"
Write-Host "지금 실행하려면: Start-Process '$exe'"
