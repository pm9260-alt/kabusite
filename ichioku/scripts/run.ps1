# 全工程を順に走らせる（15章）
#   .\scripts\run.ps1            試験モード → 本番 → 公開前の検査
#   .\scripts\run.ps1 -TestOnly  試験モードだけ
#   .\scripts\run.ps1 -Survey    18章の確認だけ（e-Stat を検索して logs\18-survey.txt にまとめる）
#   .\scripts\run.ps1 -Publish   検査がすべて合格したときだけ Cloudflare Pages に公開する
param([switch]$TestOnly, [switch]$Survey, [switch]$Publish)
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Node.js がなければ自動で入れる
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js が見つからないため、自動で入れます（winget）。'
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js を入れられませんでした。https://nodejs.org/ja から LTS 版を入れて、もう一度動かしてください。'
    exit 1
  }
}

if ($Survey) {
  node tools/fetch.mjs --survey
  exit $LASTEXITCODE
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()
Write-Host '== 1. 試験モード（3都道府県・少しのデータで全工程を通す） =='
node tools/fetch.mjs --test
$fetchCode = $LASTEXITCODE
if ($fetchCode -eq 2) { exit 2 }
node tools/transform.mjs
node tools/build.mjs --test
$buildCode = $LASTEXITCODE
# 1800〜1974年生まれのための昔の統計（人口統計資料集・Wikipedia の表・Our World in Data）
node tools/history-fetch.mjs
node tools/history.mjs
node tools/build-history.mjs
if ($LASTEXITCODE -ne 0) { $buildCode = 1 }
node tools/check.mjs --test
$checkTest = $LASTEXITCODE
Write-Host ('試験モード：' + [int]$sw.Elapsed.TotalSeconds + '秒')
if ($fetchCode -ne 0 -or $buildCode -ne 0) {
  Write-Host '試験モードが最後まで通らなかったため、本番に進みません。'
  exit 1
}
if ($TestOnly) { exit $checkTest }

Write-Host '== 2. 本番（全国分） =='
node tools/fetch.mjs
node tools/transform.mjs
node tools/build.mjs
if ($LASTEXITCODE -ne 0) { Write-Host 'データの束を作れませんでした。'; exit 1 }
node tools/build-history.mjs
if ($LASTEXITCODE -ne 0) { Write-Host '1800〜1974年生まれの束を作れませんでした。'; exit 1 }

Write-Host '== 3. 公開前の検査 =='
node tools/check.mjs
$checkCode = $LASTEXITCODE
if (Test-Path 'logs\skipped.txt') {
  Write-Host ''
  Get-Content 'logs\skipped.txt' -Encoding UTF8
}
if ($checkCode -ne 0) {
  Write-Host '公開前の検査に不合格があるため、公開しません。logs\check-report.txt を確かめてください。'
  exit 1
}
if ($Publish) {
  Write-Host '== 4. 公開 =='
  npx wrangler pages deploy site --project-name ichioku
}
Write-Host ('全工程が終わりました：' + [int]$sw.Elapsed.TotalSeconds + '秒')
