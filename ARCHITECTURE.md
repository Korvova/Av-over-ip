# Архитектура ПУ AV-over-IP

## Стек
- **Бэкенд:** Node.js 22 + Express 5 + ws (WebSocket) — `server/`
- **БД:** PostgreSQL 16 (локальный сервис `postgresql-x64-16`, база `ekoder`) + **Prisma 6** — `server/prisma/schema.prisma`
- **Фронтенд:** React 19 + Vite — `web/` (дев-порт 5173, прокси `/api` и `/ws` → 8080)
- **Устройства:** HDN-EA900 (ASPEED ast1530/1535), управление по Telnet (root/17909),
  команды `astparam s/g` (setup-time) и `e e_...::` (runtime). Справочник: `_api_ref.md`

## Структура бэкенда
```
server/
├── prisma/schema.prisma      — модели: Device, Route, VideoWall(+Panel,+Preset),
│                                User, Preset, UiLayout, PlatformSetting
├── .env                      — DATABASE_URL, DEVICE_DRIVER=mock|hdn900, PORT
└── src/
    ├── index.js              — точка входа, подключение роутов
    ├── db.js                 — PrismaClient
    ├── ws.js                 — WebSocket-хаб (broadcast обновлений)
    ├── auth.js               — сессии-токены + requireAuth/requireAdmin
    ├── seed.js               — 4 пользователя по ТЗ + firstRun
    ├── routes/               — по домену на файл
    │   ├── auth.js           — /api/auth       вход/выход/me
    │   ├── devices.js        — /api/devices    списки, discover, добавление, имена/ID
    │   ├── control.js        — /api/control    команды устройствам (через драйвер)
    │   ├── routing.js        — /api/routing    матрицы video/audio/usb + ir/rs232/cec
    │   ├── videowalls.js     — /api/walls      стены, панели, пресеты, рамки
    │   ├── users.js          — /api/users      пароли, пользовательские пресеты
    │   └── platform.js       — /api/platform   настройки ПУ, экспорт/импорт конфигурации
    └── drivers/              — слой железа, единый интерфейс
        ├── index.js          — выбор по DEVICE_DRIVER
        ├── mock.js           — эмулятор: 4 TX + 4 RX, мгновенные ответы
        └── hdn900.js         — Telnet-транспорт + карта команд из API-дока
```

## Ключевые решения
1. **Драйверный слой.** Роуты не знают про Telnet — только `driver.setParam / route / reboot...`.
   Переключение mock ↔ hdn900 одной переменной в `.env`. Когда придёт железо — тестируем
   те же роуты без переписывания.
2. **БД — источник истины** для состава системы и маршрутов; устройство подтверждает
   командой, потом фиксируем в БД и рассылаем по WebSocket всем клиентам.
3. **Настройки устройств** (LED, EDID, RS-232, IO...) — в `Device.settings` (JSONB):
   параметров ~30 на устройство, отдельные колонки не нужны, схема не раздувается.
4. **Роли на уровне API**: requireAdmin на всех изменяющих операциях, не только скрытие в UI.

## Интерфейс драйвера
```js
discover()                        // поиск устройств в видео LAN
getStatus(device)                 // {online, uptimeSec}
setParam(device, key, value)      // led | edid | resolution | irMode | fcMode | relay | io | hdcp | cecCode
route(signal, encoder, decoder)   // video | audio | usb | ir | rs232 | cec
setNetwork(device, {...})
reboot(device) / factoryReset(device)
```

## Протокол HDN-EA900 — ЗАКРЫТ полностью (папка «Full API for JPEG2000», выжимки в _docs/)
- ✅ **Коммутация**: каналы 0000–9999; энкодер `e e_reconnect::{ch}` (канал = deviceId);
  декодер `e e_reconnect::{ch}::{v|a|u|r|s|c}` посигнально (video/audio/usb/ir/rs232/cec);
  стоп `e e_stop_link::{сигнал}`; один-ко-многим требует `multicast_on=y` (+reboot)
- ✅ **Discovery**: `node_query --dump --json` запускается по telnet на любом известном
  устройстве → опрашивает всю сеть (MAC/IP/host-client/канал/статус); холодный старт — mDNS (`ast*`)
- ✅ **Видеостена** (API v2): `e e_vw_enable_{X1}_{Y1}_{X2}_{Y2}_2`, координаты ‱ 0–10000,
  компенсация рамок через OW/VW/OH/VH (реализовано в wallApply), поворот `e_vw_rotate_{3|6}`
- ✅ **Сетевые настройки**: UDP-multicast `225.3.0.0:3335`, пакет 5×char[20]
  (mac без ':', ip_mode, ip, netmask, gateway) — устройство само перезагружается
- ✅ **MJPEG-превью**: `http://<ip>:8080/?action=stream|snapshot` (до 720p/30fps, ~8 Мбит/с);
  ПУ проксирует в сеть управления через `/api/preview/:id/stream|snapshot`
- ⚠️ Telnet-порт **24** (не 23!), root/17909 (у чистого ASPEED — без пароля, драйвер умеет оба)
Обновление прошивки исключено из объёма (решение заказчика, 2026-08-05).

## Учётные данные по умолчанию (dev)
- ПУ: admin/admin, user1/1111, user2/2222, user3/3333
- Postgres: postgres/postgres, база `ekoder`
- Устройства: Telnet root/17909

## Запуск
- Бэкенд: `cd server && npm run dev` (порт 8080)
- Фронт: `cd web && npm run dev` (порт 5173)
- Prisma Studio (просмотр БД): `cd server && npm run studio`
