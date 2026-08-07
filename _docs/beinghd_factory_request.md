# API Feature Request — BeingHD JSON Control Protocol
# Запрос на доработку API — BeingHD JSON Control Protocol

To integrate your devices with our AV-over-IP management platform, we need the following
additions to the JSON Control Protocol.
Для интеграции ваших устройств с нашей платформой управления AV-over-IP нам необходимы
следующие доработки JSON-протокола.

---

## CRITICAL / КРИТИЧНО НЕОБХОДИМО

**1. Device discovery / Обнаружение устройств**
EN: A broadcast or multicast discovery command so the controller can find all devices on the
network without knowing their IP addresses in advance. Each device should reply with:
device type (encoder/decoder), MAC address, IP address, device ID, firmware version.
RU: Широковещательная (broadcast/multicast) команда обнаружения, чтобы контроллер находил
все устройства в сети, не зная их IP заранее. Каждое устройство должно ответить: тип
(энкодер/декодер), MAC-адрес, IP-адрес, ID устройства, версия прошивки.

**2. Device type & firmware version query / Запрос типа устройства и версии прошивки**
EN: Commands like {"cmd":"getdevicetype"} and {"cmd":"getversion"} — currently there is no way
to distinguish an encoder from a decoder or read the firmware version via the API.
RU: Команды вида {"cmd":"getdevicetype"} и {"cmd":"getversion"} — сейчас через API невозможно
отличить энкодер от декодера и узнать версию прошивки.

**3. HTTP preview: JPEG snapshot / MJPEG stream / HTTP-превью: JPEG-кадр / MJPEG-поток**
EN: An HTTP endpoint on each device, e.g. GET http://ip:port/snapshot.jpg (single frame) and/or
an HTTP MJPEG sub-stream. Web browsers cannot play RTSP, and our web UI shows live thumbnails
of every source. RTSP-only preview forces the controller to transcode, which does not scale.
RU: HTTP-эндпоинт на каждом устройстве, например GET http://ip:port/snapshot.jpg (один кадр)
и/или HTTP MJPEG-подпоток. Браузеры не воспроизводят RTSP, а наш веб-интерфейс показывает
живые миниатюры всех источников. Превью только по RTSP заставляет контроллер транскодировать,
что плохо масштабируется.

**4. CEC over IP / Маршрутизация CEC**
EN: Commands to route and send CEC between encoder and decoder (independent routing per signal
is required by our specification), e.g. send CEC code to display, CEC follow/route selection.
RU: Команды маршрутизации и передачи CEC между энкодером и декодером (наше ТЗ требует
независимую маршрутизацию каждого сигнала), например отправка CEC-кода на дисплей, выбор
источника CEC.

**5. Direct USB/KVM routing command / Прямая команда маршрутизации USB/KVM**
EN: An explicit command "connect decoder USB to encoder X" (point-to-point), independent of the
selected video window. Currently USB follows the selected window only (setselectwindow).
RU: Явная команда «подключить USB декодера к энкодеру X» (точка-точка), независимо от
выбранного видеоокна. Сейчас USB привязан только к выбранному окну (setselectwindow).

---

## DESIRABLE / ЖЕЛАТЕЛЬНО

**6. EDID management / Управление EDID**
EN: Select EDID from a preset list; copy EDID from the display attached to a decoder;
store/apply user-defined EDID (2 slots).
RU: Выбор EDID из списка предустановок; копирование EDID с дисплея, подключённого к декодеру;
запись/применение пользовательских EDID (2 ячейки).

**7. Front panel LED control / Управление светодиодами передней панели**
EN: Modes: always on / on for 60 seconds / off.
RU: Режимы: горят постоянно / горят 60 секунд / выключены.

**8. Output image rotation / Поворот изображения на выходе декодера**
EN: 0° / 90° / 180° / 270° / horizontal flip / vertical flip.
RU: 0° / 90° / 180° / 270° / горизонтальный переворот / вертикальный переворот.

**9. Bezel compensation for LCD walls / Компенсация рамок для ЖК-видеостен**
EN: Explicit fields for panel outer size vs visible (active) size in newwall, or a documented
method to achieve bezel compensation.
RU: Явные поля внешнего и видимого (активного) размера панели в newwall, либо
задокументированный способ компенсации рамок.

**10. IR port voltage selection / Выбор напряжения ИК-порта**
EN: 5V / 12V selection, if supported by hardware.
RU: Выбор 5В / 12В, если поддерживается аппаратно.

**11. HDCP mode control / Управление режимами HDCP**
EN: Follow source / follow sink / force 1.4 / force 2.2 / off.
RU: Как у источника / как у дисплея / принудительно 1.4 / принудительно 2.2 / выключен.

**12. Decoder video output on/off / Включение-выключение видеовыхода декодера**
EN: A dedicated command to disable/enable the HDMI output (display standby), separate from
closing windows.
RU: Отдельная команда выключения/включения HDMI-выхода (перевод дисплея в ожидание), не
через закрытие окон.

---

## QUESTIONS / ВОПРОСЫ НА УТОЧНЕНИЕ

**Q1.** EN: setio/getio are marked "Board changes — this command is no longer meaningful".
What replaces them on current hardware?
RU: setio/getio помечены «Board changes — команда больше не действует». Чем они заменены
на актуальных платах?

**Q2.** EN: getdhcp is marked "GK hardware version does not support". Which hardware versions
support DHCP?
RU: getdhcp помечена «GK hardware version does not support». Какие версии железа
поддерживают DHCP?

**Q3.** EN: What are the limits: max devices per system, max walls, max windows per decoder?
RU: Каковы лимиты: максимум устройств в системе, максимум видеостен, максимум окон на декодер?

**Q4.** EN: What is "serverip" in setnet used for, and is it mandatory?
RU: Для чего используется параметр serverip в setnet и обязателен ли он?
