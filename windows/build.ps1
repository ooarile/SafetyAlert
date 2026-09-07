# SafetyAlarm.exe 빌드 (인터넷 되는 개발 PC에서 실행)
# 자체 포함 단일 파일이라 고객사 PC에 .NET 런타임 설치가 필요 없습니다.
$ErrorActionPreference = 'Stop'

$proj = Join-Path $PSScriptRoot 'SafetyAlarm\SafetyAlarm.csproj'
$out  = Join-Path $PSScriptRoot '..\dist\SafetyAlarm'

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Error ".NET SDK가 없습니다. winget install Microsoft.DotNet.SDK.8 로 설치하십시오."
}

dotnet publish $proj -c Release -r win-x64 --self-contained true `
    -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:EnableCompressionInSingleFile=true `
    -o $out

Write-Host ""
Write-Host "빌드 완료: $out"
Write-Host "납품 파일: SafetyAlarm.exe + settings.json (고객사별로 settings.json 수정)"
