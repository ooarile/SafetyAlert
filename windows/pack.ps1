# 타 PC 배포용 설치 패키지 생성.
# 빌드된 exe + windows\package\ 의 설치 스크립트·안내문을 하나의 zip 으로 묶습니다.
#   .\build.ps1   먼저 실행해 exe 를 만든 뒤
#   .\pack.ps1
$ErrorActionPreference = 'Stop'

$root  = Split-Path $PSScriptRoot -Parent
$exe   = Join-Path $root 'dist\SafetyAlarm\SafetyAlarm.exe'
$srcs  = Join-Path $PSScriptRoot 'package'
$stage = Join-Path $root 'dist\package'
$zip   = Join-Path $root 'dist\SafetyAlarm-setup.zip'

if (-not (Test-Path $exe)) {
    Write-Error "$exe 가 없습니다. 먼저 .\build.ps1 을 실행하십시오."
}

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory $stage | Out-Null

Copy-Item $exe $stage
foreach ($f in '설치.ps1', '읽어주세요.txt', 'settings.json') {
    $p = Join-Path $srcs $f
    # PowerShell 5.1 과 메모장이 한글을 바르게 읽도록 BOM 을 붙여 내보냅니다.
    $text = [IO.File]::ReadAllText($p, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $stage $f), $text, [Text.UTF8Encoding]::new($true))
}

if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal

$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host ""
Write-Host "패키지 생성 완료: $zip ($mb MB)"
Write-Host "이 zip 을 알람 수신 PC로 옮겨 압축을 풀고, 관리자 PowerShell 에서 실행하십시오."
Write-Host "  powershell -ExecutionPolicy Bypass -File .\설치.ps1"
