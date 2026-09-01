# Самообновление платформы из git (Windows). Запускается кнопкой «Обновить»
# или вручную: powershell -File deploy\update.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

Write-Output '[update] git: подтягиваем origin/main'
git fetch origin main
git reset --hard origin/main

Write-Output '[update] server: зависимости и миграции'
Set-Location server
npm ci
npx prisma migrate deploy
npx prisma generate

Write-Output '[update] web: сборка фронтенда'
Set-Location ..\web
# --include=dev: без него при NODE_ENV=production не ставится vite и сборка падает
npm ci --include=dev
npm run build

Write-Output '[update] готово — приложение перезапустится'
