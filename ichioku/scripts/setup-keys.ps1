# e-Stat のアプリケーションIDを最初の1回だけ登録する
# 保存先はサイトのフォルダーの外（%LOCALAPPDATA%\ichioku-keys\）。以後のスクリプトはここから自動で取り出す。
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = Join-Path $env:LOCALAPPDATA 'ichioku-keys'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
$file = Join-Path $dir 'estat-appid.txt'
if (Test-Path $file) {
  $ans = Read-Host 'すでに登録されています。上書きしますか（y で上書き）'
  if ($ans -ne 'y') { Write-Host 'そのままにしました。'; exit 0 }
}
Write-Host 'e-Stat のマイページで発行された「アプリケーションID」を貼り付けて Enter を押してください。'
$id = (Read-Host 'アプリケーションID').Trim()
if ($id.Length -lt 20) {
  Write-Host 'IDが短すぎます。コピーした文字が途中で切れていないか確かめて、もう一度動かしてください。'
  exit 1
}
$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($file, $id, $enc)
Write-Host ('登録しました：' + $file)
