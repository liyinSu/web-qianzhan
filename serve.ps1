# 前詹镇综合展示平台 - 本地静态服务器（PowerShell 版，无需安装任何软件）
# 用于正确加载 3D 模型（GLB）与视频，支持 Range 请求（视频拖动进度条）
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $PSScriptRoot).Path
$port = 8000
$prefix = "http://localhost:$port/"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.mjs'  = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.mp4'  = 'video/mp4'
  '.webm' = 'video/webm'
  '.mp3'  = 'audio/mpeg'
  '.glb'  = 'model/gltf-binary'
  '.gltf' = 'model/gltf+json'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
  '.pdf'  = 'application/pdf'
}

function Get-Mime([string]$ext) {
  if ($mime.ContainsKey($ext)) { return $mime[$ext] }
  return 'application/octet-stream'
}

$listener = New-Object System.Net.HttpListener
try {
  $listener.Prefixes.Add($prefix)
  $listener.Start()
} catch {
  Write-Host "端口 $port 已被占用，请关闭占用该端口的程序后重试。" -ForegroundColor Red
  exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  前詹镇综合展示平台 · 本地预览服务已启动" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  地址: $prefix" -ForegroundColor Yellow
Write-Host "  网站根目录: $root"
Write-Host "  关闭本窗口即停止服务。" -ForegroundColor Gray
Write-Host ""

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }

  try {
    $req = $ctx.Request
    $res = $ctx.Response
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $rel = $rel -replace '/', [IO.Path]::DirectorySeparatorChar

    # 阻止路径穿越
    $full = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $res.Close(); continue
    }

    if (-not (Test-Path $full -PathType Leaf)) {
      $msg = [Text.Encoding]::UTF8.GetBytes('404 Not Found: ' + $rel)
      $res.StatusCode = 404
      $res.ContentType = 'text/plain; charset=utf-8'
      $res.OutputStream.Write($msg, 0, $msg.Length)
      $res.Close(); continue
    }

    $item = Get-Item $full
    $ext = $item.Extension.ToLower()
    $res.ContentType = Get-Mime $ext

    # 解析 Range（支持单区间，满足视频拖动进度条）
    $range = $req.Headers['Range']
    if ($range -and $range -match '^bytes=(\d*)-(\d*)$') {
      $startS = $Matches[1]; $endS = $Matches[2]
      $total = $item.Length
      $start = 0; $end = $total - 1
      if ($startS -ne '' -and $endS -ne '') {
        $start = [int64]$startS; $end = [int64]$endS
      } elseif ($startS -ne '') {
        $start = [int64]$startS
      } elseif ($endS -ne '') {
        $len = [int64]$endS
        $start = [Math]::Max(0, $total - $len); $end = $total - 1
      }
      if ($end -ge $total) { $end = $total - 1 }
      if ($start -gt $end -or $start -ge $total) {
        $res.StatusCode = 416
        $res.AddHeader('Content-Range', "bytes */$total")
        $res.Close(); continue
      }
      $res.StatusCode = 206
      $res.AddHeader('Content-Range', "bytes $start-$end/$total")
      $res.ContentLength64 = $end - $start + 1
      $fs = [IO.File]::OpenRead($full)
      $fs.Seek($start, 'Begin') | Out-Null
      $buf = New-Object byte[] 81920
      $remain = $res.ContentLength64
      while ($remain -gt 0) {
        $toRead = [int][Math]::Min($buf.Length, $remain)
        $n = $fs.Read($buf, 0, $toRead)
        if ($n -le 0) { break }
        $res.OutputStream.Write($buf, 0, $n)
        $remain -= $n
      }
      $fs.Close()
      $res.Close()
    } else {
      $res.ContentLength64 = $item.Length
      $fs = [IO.File]::OpenRead($full)
      $buf = New-Object byte[] 81920
      while ($true) {
        $n = $fs.Read($buf, 0, $buf.Length)
        if ($n -le 0) { break }
        $res.OutputStream.Write($buf, 0, $n)
      }
      $fs.Close()
      $res.Close()
    }
  } catch {
    try { $ctx.Response.StatusCode = 500; $ctx.Response.Close() } catch {}
  }
}
