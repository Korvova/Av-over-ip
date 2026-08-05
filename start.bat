@echo off
rem Запуск платформы управления AV-over-IP на Windows (production, один порт 8080).
rem Фронтенд должен быть собран: cd web && npm run build
cd /d "%~dp0"
if not exist web\dist (
  echo Сборка фронтенда...
  cd web
  call npm run build
  cd ..
)
echo Платформа: http://localhost:8080
node server\src\index.js
