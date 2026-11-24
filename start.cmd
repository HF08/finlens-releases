@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  if not exist node_modules\pdf-parse (
    echo Installing required document and voice dependencies...
    call npm.cmd install --omit=dev
  )
  start "" http://127.0.0.1:8787
  node server\server.mjs
) else (
  echo [错误] 未找到 Node.js，请先安装 Node 22.5+ 后重试。
  pause
)
