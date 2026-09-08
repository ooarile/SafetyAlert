# 세이프티 알람 수신 앱 설치
# 관리자 권한 PowerShell 에서 이 폴더 안에서 실행하십시오.
#   powershell -ExecutionPolicy Bypass -File .\설치.ps1
$ErrorActionPreference = 'Stop'

$src  = $PSScriptRoot
$dest = 'C:\Program Files\SafetyAlarm'

if (-not (Test-Path (Join-Path $src 'SafetyAlarm.exe'))) {
    Write-Error "SafetyAlarm.exe 를 찾을 수 없습니다. 압축을 푼 폴더에서 실행하십시오."
}

# 관리자 권한 확인
$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Write-Error "관리자 권한이 필요합니다. PowerShell 을 관리자로 실행한 뒤 다시 시도하십시오."
}

Get-Process SafetyAlarm -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800

if (-not (Test-Path $dest)) { New-Item -ItemType Directory $dest | Out-Null }
Copy-Item (Join-Path $src 'SafetyAlarm.exe') $dest -Force

# settings.json 은 현장 설정이므로 이미 있으면 유지합니다.
$cfgPath = Join-Path $dest 'settings.json'
if (Test-Path $cfgPath) {
    Write-Host "기존 settings.json 을 유지했습니다."
} else {
    Copy-Item (Join-Path $src 'settings.json') $dest
    Write-Host "settings.json 을 복사했습니다."
}

# 시작 프로그램 등록 (로그인 시 자동 실행)
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'SafetyAlarm.lnk'
$sc = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$sc.TargetPath = Join-Path $dest 'SafetyAlarm.exe'
$sc.WorkingDirectory = $dest
$sc.Description = '세이프티 알람'
$sc.Save()

Write-Host ""
Write-Host "설치 완료: $dest"
Write-Host "시작 프로그램 등록: $lnk"
Write-Host ""
Write-Host "다음 두 가지를 하십시오."
Write-Host "  1. 메모장으로 $cfgPath 를 열어 Server 와 Password 를 현장 값으로 수정"
Write-Host "  2. 아래 명령으로 실행 (또는 PC 재시작)"
Write-Host "     Start-Process '$dest\SafetyAlarm.exe'"
Write-Host ""
Write-Host "트레이 아이콘에 마우스를 올려 '연결됨' 이 보이면 정상입니다."
