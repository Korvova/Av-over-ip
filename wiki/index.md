Веб-платформа управления системой AV-over-IP: коммутация видео, аудио и USB между
энкодерами и декодерами, построение видеостен, кастомный интерфейс оператора.
Полностью на русском языке, работает в браузере, разворачивается на отдельном мини-ПК
и не требует интернета на объекте.

**Репозиторий:** https://github.com/Korvova/Av-over-ip

## Состояние

Все страницы интерфейса по техническому заданию реализованы и проверены на реальном
железе HDN-EA900: поиск устройств, коммутация видео и аудио, видеостена с нарезкой
кадра по панелям, живые миниатюры источников. Платформа развёрнута на мини-ПК под
Ubuntu 24.04 как служба с автозапуском, обновляется кнопкой из интерфейса.

В работе: резервирование пары серверов, периодический опрос состояния устройств,
поддержка второго производителя (BeingHD).

## Требования

| Раздел | Что охватывает |
|---|---|
| [Т. Общие требования](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-obshhie) | Платформа целиком, структура интерфейса, роли |
| [Т. Первый запуск](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-pervyj-zapusk) | Вход в систему, проводник первичной настройки |
| [Т. Элементы системы](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-elementy-sistemy) | Поиск устройств, списки, добавление в систему |
| [Т. Энкодеры](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-enkodery) | Настройки энкодера |
| [Т. Декодеры](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-dekodery) | Настройки декодера |
| [Т. Коммутация](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-kommutaciya) | Коммутационное поле, матрицы видео, аудио, USB |
| [Т. Видеостена](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-videostena) | Построение стен, пресеты, компенсация рамок |
| [Т. Интерфейс пользователя](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-interfejs-polzovatelya) | Рабочая страница оператора и её конструктор |
| [Т. Пользователи](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-polzovateli) | Учётные записи, пароли, пресеты |
| [Т. Настройка платформы](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/t-nastrojka-platformy) | Конфигурации, резервирование, обновление |

Новое требование или правка — новая строка в таблице соответствующего раздела.

Колонки таблиц: **Номер** — по нумерации технического задания; **Требование** —
что должно быть; **Описание** — как это выглядит на практике; **Урок** — заметки
по реализации и подводные камни, чтобы можно было повторить; **Статус** — ✅ Готово,
⚠️ Частично (сделано в интерфейсе, но не доходит до устройства), ⬜ Не начато.

## Техническая документация

* [Архитектура и стек](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/arxitektura)
* [Развёртывание и эксплуатация](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/razvertyvanie)
* [Протокол HDN-EA900 (ASPEED)](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/protokol-hdn-ea900)
* [BeingHD: анализ API и переписка с заводом](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/beinghd)

## Доступы

**Веб-интерфейс платформы:** `http://<адрес мини-ПК>:8080`

Учётные записи платформы: `admin / admin` (при первом входе мастер предложит сменить
пароль), `user1 / 1111`, `user2 / 2222`, `user3 / 3333`.

**Мини-ПК (Ubuntu):** логин `RMS`, пароль `Asavuf81@`

Адреса сетевых портов мини-ПК зафиксированы статикой: первый порт — сеть управления
192.168.1.20, второй — видео-сеть 169.254.99.20. Подробности в разделе
[Развёртывание](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/razvertyvanie).

## Техническое задание

:file[Техническое задание ПУ.pdf](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/.files/texnicheskoezadaniepu.pdf){type="application/pdf"}

Локальный кабель — на первый порт мини-ПК:

![image.png](/homepage/iniciativa.-proekty-rms/platforma-upravlenija-av-over-ip/.files/image-1.png =604x557)
