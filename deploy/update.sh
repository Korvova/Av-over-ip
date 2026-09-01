#!/usr/bin/env bash
# Самообновление платформы из git (Linux). Запускается кнопкой «Обновить»
# или вручную: bash deploy/update.sh
set -e
cd "$(dirname "$0")/.."

echo "[update] git: подтягиваем origin/main"
git fetch origin main
git reset --hard origin/main

echo "[update] server: зависимости и миграции"
cd server
npm ci
npx prisma migrate deploy
npx prisma generate

echo "[update] web: сборка фронтенда"
cd ../web
# --include=dev обязателен: служба работает с NODE_ENV=production, скрипт наследует
# эту переменную, и без флага npm ci пропускает vite — сборка падает с «vite: not found»
npm ci --include=dev
npm run build

echo "[update] готово — приложение перезапустится"
