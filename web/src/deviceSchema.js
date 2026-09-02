// Схема настроек энкодера/декодера (ТЗ разд. III.2 и III.3).
// apply: как применяется поле:
//   'store'        — только сохранить в settings устройства (PATCH /api/devices)
//   'param'        — команда устройству (POST /api/control/:id/param, key=paramKey)
//   'routing'      — маршрут сигнала (POST /api/routing, signal=signalKey)
// map: преобразование значения перед отправкой команды

// ТЗ: 27 вариантов EDID; имена команд — из API-дока (e_edid_select)
export const EDID_OPTIONS = [
  '1080PPCM20SDR', '1080PDTS51SDR', '1080PHD71SDR',
  '1080IPCM20SDR', '1080IDTS51SDR', '1080IHD71SDR',
  '3DPCM20SDR', '3DDTS51SDR', '3DHD71SDR',
  '4K30444PCM20SDR', '4K30444DTS51SDR', '4K30444HD71SDR',
  '4K60420PCM20SDR', '4K60420DTS51SDR', '4K60420HD71SDR',
  '4K60444PCM20SDR', '4K60444DTS51SDR', '4K60444HD71SDR',
  '4K60444PCM20HDR', '4K60444DTS51HDR', '4K60444HD71HDR',
  'DVI1280X1024', 'DVI1920X1080', 'DVI1920X1200',
];
// Человеческие подписи EDID (как в ТЗ)
export const EDID_LABELS = {
  '1080PPCM20SDR': '1080P Stereo Audio 2.0 SDR', '1080PDTS51SDR': '1080P DolbyDTS 5.1 SDR',
  '1080PHD71SDR': '1080P HD Audio 7.1 SDR', '1080IPCM20SDR': '1080I Stereo Audio 2.0 SDR',
  '1080IDTS51SDR': '1080I DolbyDTS 5.1 SDR', '1080IHD71SDR': '1080I HD Audio 7.1 SDR',
  '3DPCM20SDR': '3D Stereo Audio 2.0 SDR', '3DDTS51SDR': '3D DolbyDTS 5.1 SDR',
  '3DHD71SDR': '3D HD Audio 7.1 SDR',
  '4K30444PCM20SDR': '4K2K30 444 Stereo 2.0 SDR', '4K30444DTS51SDR': '4K2K30 444 DolbyDTS 5.1 SDR',
  '4K30444HD71SDR': '4K2K30 444 HD Audio 7.1 SDR',
  '4K60420PCM20SDR': '4K2K60 420 Stereo 2.0 SDR', '4K60420DTS51SDR': '4K2K60 420 DolbyDTS 5.1 SDR',
  '4K60420HD71SDR': '4K2K60 420 HD Audio 7.1 SDR',
  '4K60444PCM20SDR': '4K2K60 444 Stereo 2.0 SDR', '4K60444DTS51SDR': '4K2K60 444 DolbyDTS 5.1 SDR',
  '4K60444HD71SDR': '4K2K60 444 HD Audio 7.1 SDR',
  '4K60444PCM20HDR': '4K2K60 444 Stereo 2.0 HDR 10бит', '4K60444DTS51HDR': '4K2K60 444 DolbyDTS 5.1 HDR 10бит',
  '4K60444HD71HDR': '4K2K60 444 HD Audio 7.1 HDR 10бит',
  DVI1280X1024: 'DVI 1280x1024', DVI1920X1080: 'DVI 1920x1080', DVI1920X1200: 'DVI 1920x1200',
};

export const SCALING_OPTIONS = [
  'bypass', '1080P50', '1080P60', '720P50', '720P60',
  '2160P24', '2160P30', '2160P50', '2160P60',
  '1280x1024', '1360x768', '1440x900', '1680x1050', '1920x1200',
];

const onOff = [
  { v: true, l: 'Вкл.' },
  { v: false, l: 'Выкл.' },
];

const LED_FIELD = {
  key: 'led', label: 'Светодиодные индикаторы', type: 'select', apply: 'param', paramKey: 'led',
  options: [
    { v: 'on', l: 'Вкл.' },
    { v: 'on60', l: 'Вкл. 60 сек.' },
    { v: 'off', l: 'Выкл.' },
  ],
  map: (v) => ({ on: v !== 'off', timerSec: v === 'on60' ? 60 : 0, lock: false }),
};

const NETWORK_SECTION = { title: 'Сетевые настройки', network: true };

const RS232_SECTION = {
  title: 'Настройки RS-232',
  fields: [
    { key: 'rs232Relay', label: 'Команды Relay RS-232', type: 'select', apply: 'serial', options: onOff },
    { key: 'parity', label: 'Parity (чётность)', type: 'select', apply: 'serial',
      options: [{ v: 'none', l: 'None' }, { v: 'even', l: 'Even' }, { v: 'odd', l: 'Odd' }] },
    { key: 'baudRate', label: 'Baud Rate', type: 'select', apply: 'serial',
      options: [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map((v) => ({ v, l: String(v) })) },
    { key: 'dataBits', label: 'Data Bits', type: 'select', apply: 'serial',
      options: [5, 6, 7, 8].map((v) => ({ v, l: String(v) })) },
    { key: 'stopBits', label: 'Stop Bits', type: 'select', apply: 'serial',
      options: [1, 2].map((v) => ({ v, l: String(v) })) },
  ],
};

const PORTS_SECTION = {
  title: 'Настройка портов',
  fields: [
    { key: 'irMode', label: 'ИК порт (IR) — напряжение', type: 'select', apply: 'param', paramKey: 'irMode',
      options: [{ v: '5v', l: '5 В' }, { v: '12v', l: '12 В' }] },
    { key: 'ioLevel', label: 'Порты Digital IO — напряжение', type: 'select', apply: 'store',
      options: [{ v: '5v', l: '5 В' }, { v: '12v', l: '12 В' }] },
    { key: 'io1mode', label: 'Digital IO 1 — направление', type: 'select', apply: 'io', port: 1,
      options: [{ v: 'in', l: 'Вход' }, { v: 'out', l: 'Выход' }] },
    { key: 'io1level', label: 'Digital IO 1 — логический уровень', type: 'select', apply: 'io', port: 1,
      options: [{ v: 'low', l: 'Низкий' }, { v: 'high', l: 'Высокий' }] },
    { key: 'io2mode', label: 'Digital IO 2 — направление', type: 'select', apply: 'io', port: 2,
      options: [{ v: 'in', l: 'Вход' }, { v: 'out', l: 'Выход' }] },
    { key: 'io2level', label: 'Digital IO 2 — логический уровень', type: 'select', apply: 'io', port: 2,
      options: [{ v: 'low', l: 'Низкий' }, { v: 'high', l: 'Высокий' }] },
    { key: 'relay1', label: 'Порт Relay 1 — нормальное состояние', type: 'select', apply: 'store',
      options: [{ v: 'nc', l: 'Нормально-замкнутое' }, { v: 'no', l: 'Нормально-разомкнутое' }] },
    { key: 'relay2', label: 'Порт Relay 2 — нормальное состояние', type: 'select', apply: 'store',
      options: [{ v: 'nc', l: 'Нормально-замкнутое' }, { v: 'no', l: 'Нормально-разомкнутое' }] },
  ],
};

/** Секции настроек энкодера */
export function encoderSections(decoders) {
  return [
    {
      title: 'Базовые установки',
      base: true, // имя + ID редактируются особо
      fields: [LED_FIELD],
    },
    {
      title: 'Настройка видео/аудио',
      fields: [
        { key: 'edid', label: 'EDID', type: 'select', apply: 'param', paramKey: 'edid',
          options: [
            ...EDID_OPTIONS.map((v) => ({ v, l: EDID_LABELS[v] || v })),
            { v: 'from_decoder', l: 'EDID от декодера' },
            { v: 'user1', l: 'EDID пользователя 1' },
            { v: 'user2', l: 'EDID пользователя 2' },
          ],
          // пользовательские ячейки и копия с декодера применяются только записью в settings
          storeOnly: (v) => ['from_decoder', 'user1', 'user2'].includes(v) },
        { key: 'edidCopyFrom', label: 'Декодер для копирования EDID', type: 'select', apply: 'store',
          options: decoders.map((d) => ({ v: d.id, l: d.name })) },
        { key: 'audioInput', label: 'Аудио — источник звука', type: 'select', apply: 'param', paramKey: 'audioInput',
          options: [{ v: 'hdmi', l: 'HDMI' }, { v: 'analog', l: 'Аналог' }] },
      ],
    },
    NETWORK_SECTION,
    {
      title: 'Аппаратные настройки',
      fields: [
        { key: 'arcTarget', label: 'Возврат аудио ARC/eARC — декодер', type: 'select', apply: 'store',
          options: decoders.map((d) => ({ v: d.id, l: d.name })) },
        { key: 'fcMode', label: 'Тип сетевого порта', type: 'select', apply: 'param', paramKey: 'fcMode',
          options: [{ v: 'fiber', l: 'Оптоволоконный (SFP)' }, { v: 'copper', l: 'Медный (RJ-45)' }] },
      ],
    },
    RS232_SECTION,
    PORTS_SECTION,
  ];
}

/** Секции настроек декодера */
export function decoderSections(encoders) {
  const routeField = (key, label, signal) => ({
    key, label, type: 'select', apply: 'routing', signal,
    options: [
      { v: 'follow', l: 'С потоком' },
      ...encoders.map((e) => ({ v: e.id, l: e.name })),
    ],
  });
  return [
    {
      title: 'Базовые установки',
      base: true,
      fields: [LED_FIELD],
    },
    {
      title: 'Настройки аудио/видео',
      fields: [
        { key: 'videoOut', label: 'Выход видеосигнала', type: 'select', apply: 'param', paramKey: 'videoOutput',
          options: onOff, map: (v) => ({ off: !v }) },
        { key: 'mute', label: 'Отключение звука', type: 'select', apply: 'store', options: onOff },
        { key: 'rotation', label: 'Вращение и переворот изображения', type: 'select', apply: 'store',
          options: [
            { v: 0, l: '0°' }, { v: 90, l: '90°' }, { v: 180, l: '180°' }, { v: 270, l: '270°' },
            { v: 'hflip', l: 'Горизонтальный переворот' }, { v: 'vflip', l: 'Вертикальный переворот' },
          ] },
        { key: 'scaling', label: 'Масштабирование — разрешение выхода', type: 'select', apply: 'param',
          paramKey: 'resolution',
          options: SCALING_OPTIONS.map((v) => ({ v, l: v === 'bypass' ? 'Bypass' : v })) },
        { key: 'showId', label: 'Отображение ID на видеовыходе', type: 'select', apply: 'store', options: onOff },
        { key: 'outputMode', label: 'Режим видеовыхода', type: 'select', apply: 'store',
          options: [{ v: 'matrix', l: 'Матрица' }, { v: 'wall', l: 'Видео стена' }] },
      ],
    },
    {
      title: 'Блокировка маршрутизации сигналов',
      fields: [
        routeField('routeVideo', 'Видео', 'video'),
        routeField('routeAudio', 'Аудио', 'audio'),
        routeField('routeIr', 'ИК', 'ir'),
        routeField('routeUsb', 'USB', 'usb'),
        { key: 'usbData', label: 'USB Data', type: 'select', apply: 'store', options: onOff },
        routeField('routeRs232', 'RS-232', 'rs232'),
        routeField('routeCec', 'CEC', 'cec'),
      ],
    },
    NETWORK_SECTION,
    {
      title: 'Аппаратные настройки',
      fields: [
        { key: 'arcMode', label: 'Возврат аудио-сигнала', type: 'select', apply: 'store',
          options: [{ v: 'arc', l: 'ARC' }, { v: 'spdif', l: 'SPDIF' }] },
        { key: 'fcMode', label: 'Тип сетевого порта', type: 'select', apply: 'param', paramKey: 'fcMode',
          options: [{ v: 'fiber', l: 'Оптоволоконный (SFP)' }, { v: 'copper', l: 'Медный (RJ-45)' }] },
      ],
    },
    RS232_SECTION,
    PORTS_SECTION,
  ];
}
