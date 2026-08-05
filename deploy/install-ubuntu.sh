#!/usr/bin/env bash
# Установка платформы управления AV-over-IP на Ubuntu (22.04/24.04).
# Запуск: sudo bash deploy/install-ubuntu.sh
# Ставит: Node.js 22, PostgreSQL, git; клонирует/использует репозиторий,
# собирает фронт, применяет миграции, создаёт systemd-службу ekoder.
set -e

REPO_URL="https://github.com/Korvova/Av-over-ip.git"
APP_DIR="/opt/ekoder"
DB_NAME="ekoder"
DB_PASS="postgres"
RUN_USER="${SUDO_USER:-root}"

echo "== 1/6 Пакеты =="
apt-get update
apt-get install -y git curl ca-certificates postgresql

if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  echo "== Node.js 22 =="
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "== 2/6 PostgreSQL: база и пароль =="
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb "$DB_NAME"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '$DB_PASS';"

echo "== 3/6 Код приложения =="
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$RUN_USER":"$RUN_USER" "$APP_DIR"
cd "$APP_DIR"

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
fi

echo "== 4/6 Зависимости, миграции, сборка =="
sudo -u "$RUN_USER" bash -c "cd '$APP_DIR/server' && npm ci && npx prisma migrate deploy && npx prisma generate"
sudo -u "$RUN_USER" bash -c "cd '$APP_DIR/web' && npm ci && npm run build"

echo "== 5/6 Служба systemd =="
sed "s|__APP_DIR__|$APP_DIR|g; s|__USER__|$RUN_USER|g" deploy/ekoder.service > /etc/systemd/system/ekoder.service
systemctl daemon-reload
systemctl enable ekoder
systemctl restart ekoder

echo "== 6/6 Готово =="
IP=$(hostname -I | awk '{print $1}')
echo "Платформа запущена: http://$IP:8080"
echo "Журнал: journalctl -u ekoder -f"
