# Платформа управления AV-over-IP

Русскоязычная веб-платформа управления системой RMS AV-over-IP (энкодеры/декодеры
HDN-EA900 на чипах ASPEED AST1530/1535, JPEG2000).

- **ТЗ**: «Техническое задание ПУ.pdf», разбивка на задачи — [CHECKLIST.md](CHECKLIST.md)
- **Архитектура**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Протокол устройств**: выжимки из вендорской документации — папка [_docs/](_docs/)

## Стек

- Бэкенд: Node.js 22 + Express 5 + WebSocket, PostgreSQL 16 + Prisma 6 — `server/`
- Фронтенд: React 19 + Vite — `web/`
- Устройства: Telnet (порт 24), команды `astparam` / `e e_...`, discovery через
  `node_query` + ARP, видеостены Video Wall API v2, MJPEG-превью с порта 8080

## Запуск

```bash
# база: PostgreSQL, создать БД ekoder, настроить server/.env (см. .env.example)
cd server && npm install && npx prisma migrate dev && npm run dev   # порт 8080
cd web && npm install && npm run dev                                # порт 5173
```

Драйвер устройств переключается в `server/.env`:
`DEVICE_DRIVER=hdn900` — реальное железо, `mock` — эмулятор для разработки без устройств.

Учётные записи по умолчанию: `admin/admin` (при первом входе мастер предложит сменить),
`user1/1111`, `user2/2222`, `user3/3333`.

## Структура

- `server/src/routes/` — REST API по доменам (auth, devices, control, routing, walls, users, platform, preview)
- `server/src/drivers/` — слой устройств: `hdn900.js` (реальный Telnet-драйвер) и `mock.js`
- `web/src/` — страницы: вход, мастер первого запуска, элементы системы, коммутация,
  видеостены, интерфейс пользователя (конструктор), пользователи, настройка ПУ, справка
- `tools/make_help_shots.js` — генератор скриншотов для встроенной справки (headless Edge)
