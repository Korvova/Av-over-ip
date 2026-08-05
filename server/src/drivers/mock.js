// Эмулятор устройств HDN-EA900 — разработка без железа.
// Реализует тот же интерфейс, что и drivers/hdn900.js.

// Виртуальный парк устройств «в сети»
const fleet = [
  { type: 'ENCODER', mac: '6C:DF:FD:01:1F:10', ip: '169.254.10.1', firmware: '3.01.04' },
  { type: 'ENCODER', mac: '6C:DF:FD:01:1F:22', ip: '169.254.10.2', firmware: '3.01.04' },
  { type: 'ENCODER', mac: '6C:DF:FD:01:1F:31', ip: '169.254.10.3', firmware: '3.01.04' },
  { type: 'ENCODER', mac: '6C:DF:FD:01:1F:44', ip: '169.254.10.4', firmware: '3.01.04' },
  { type: 'DECODER', mac: '6C:DF:FD:02:2A:11', ip: '169.254.22.1', firmware: '3.01.04' },
  { type: 'DECODER', mac: '6C:DF:FD:02:2A:25', ip: '169.254.22.2', firmware: '3.01.04' },
  { type: 'DECODER', mac: '6C:DF:FD:02:2A:38', ip: '169.254.22.3', firmware: '3.01.04' },
  { type: 'DECODER', mac: '6C:DF:FD:02:2A:4C', ip: '169.254.22.4', firmware: '3.01.04' },
];

const bootTime = Date.now();
const log = (...a) => console.log('[mock-driver]', ...a);

module.exports = {
  name: 'mock',

  /** Поиск всех устройств в видео LAN (seedIps игнорируются) */
  async discover(_seedIps = []) {
    log('discover: найдено', fleet.length, 'устройств');
    return fleet.map((d) => ({ ...d, online: true }));
  },

  /** Статус устройства (онлайн/аптайм) */
  async getStatus(_device) {
    return {
      online: true,
      uptimeSec: Math.floor((Date.now() - bootTime) / 1000),
    };
  },

  /** Применить параметр (LED, EDID, IO, реле, audioInput, videoOutput...) */
  async setParam(device, key, value) {
    log(`setParam ${device.ip}: ${key} = ${JSON.stringify(value)}`);
    return { ok: true };
  },

  /** Назначить энкодеру канал = deviceId */
  async assignChannel(encoder) {
    const ch = String(encoder.deviceId).padStart(4, '0');
    log(`assignChannel ${encoder.ip}: канал ${ch}`);
    return { ok: true, channel: ch };
  },

  /** Multicast-режим (для один-ко-многим) */
  async enableMulticast(device) {
    log(`enableMulticast ${device.ip}`);
    return { ok: true, reboot: true };
  },

  /** Коммутация: подать encoder на decoder по типу сигнала (null = стоп) */
  async route(signal, encoder, decoder) {
    log(`route ${signal}: ${encoder ? encoder.ip : 'стоп'} -> ${decoder.ip}`);
    return { ok: true };
  },

  /** Видеостена: вырез области для панели */
  async wallApply(decoder, { rows, cols, row, col }) {
    log(`wallApply ${decoder.ip}: панель [${row},${col}] из ${rows}x${cols}`);
    return { ok: true };
  },

  async wallDisable(decoder) {
    log(`wallDisable ${decoder.ip}`);
    return { ok: true };
  },

  /** Заглушки превью: плейсхолдер-картинки (реальный MJPEG только на железе) */
  previewUrl(device) {
    return `https://placehold.co/320x180?text=${encodeURIComponent(device.mac.slice(-5))}`;
  },
  snapshotUrl(device) {
    return `https://placehold.co/640x360?text=${encodeURIComponent(device.mac.slice(-5))}`;
  },

  /** Установить сетевые настройки устройства */
  async setNetwork(device, { ip, dhcp }) {
    log(`setNetwork ${device.mac}: ip=${ip} dhcp=${dhcp}`);
    return { ok: true };
  },

  async reboot(device) {
    log(`reboot ${device.ip}`);
    return { ok: true };
  },

  async factoryReset(device) {
    log(`factoryReset ${device.ip}`);
    return { ok: true };
  },
};
