## Стек

| Слой | Технология |
|---|---|
| Бэкенд | Node.js 22, Express 5, WebSocket (ws) |
| База данных | PostgreSQL 16 + Prisma 6 |
| Фронтенд | React 19 + Vite |
| Устройства | HDN-EA900 (чипы ASPEED AST1530/1535), управление по Telnet |

Prisma намеренно версии 6: в 7-й сломали объявление подключения к базе в схеме.

## Структура репозитория

```
server/
  prisma/schema.prisma   модели: Device, Route, VideoWall (+панели, пресеты),
                         User, Preset, UiLayout, PlatformSetting
  src/
    index.js             точка входа; в production раздаёт собранный фронт
    routes/              REST по доменам: auth, devices, control, routing,
                         walls, users, platform, preview
    drivers/             слой железа: hdn900.js (реальные устройства), mock.js
    ws.js                рассылка живых обновлений всем клиентам
    version.js           версия сборки и самообновление из GitHub
web/src/                 страницы интерфейса, справка со скриншотами
deploy/                  установка на Ubuntu, systemd, скрипты обновления
tools/                   генератор скриншотов справки, разведчик протокола BeingHD
```

## Ключевые решения

**Драйверный слой.** Роуты не знают про Telnet и JSON-команды — они вызывают
`driver.route()`, `driver.setParam()`, `driver.wallApply()`. Какой драйвер работает,
решает переменная `DEVICE_DRIVER` в `server/.env`: `hdn900` — реальное железо,
`mock` — эмулятор для разработки без устройств. Благодаря этому поддержка второго
производителя (BeingHD) сводится к написанию третьего драйвера, платформа не меняется.

**База — источник истины.** Устройство подтверждает команду, после чего результат
фиксируется в базе и рассылается по WebSocket всем открытым браузерам. Поэтому
коммутация, сделанная одним оператором, тут же видна остальным.

**Настройки устройств — в JSONB.** У каждого энкодера и декодера около тридцати
параметров (EDID, светодиоды, RS-232, порты IO, реле). Они лежат в поле `settings`
одной колонкой, а не тридцатью — схема не разрастается при добавлении параметров.

**Права проверяются на API.** Роль администратора требуется на сервере, а не только
скрытием кнопок в интерфейсе.

## Интерфейс драйвера

```
discover(seedIps)             поиск устройств в сети
probeByIp(ip)                 опрос одного устройства по известному адресу
getStatus(device)             онлайн и время работы
setParam(device, key, value)  led | edid | resolution | irMode | fcMode |
                              relay | io | hdcp | cecCode | audioInput | videoOutput
route(signal, encoder, decoder)   video | audio | usb | ir | rs232 | cec
assignChannel(encoder)        назначить энкодеру канал вещания
wallApply(decoder, {...})     вырез области кадра для панели видеостены
wallDisable(decoder)          вернуть декодер в режим матрицы
previewUrl / snapshotUrl      адреса живой картинки устройства
setNetwork / reboot / factoryReset
```
