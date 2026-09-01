// Драйвер реальных устройств HDN-EA900 (ASPEED ast1530/1535).
//
// Транспорт: Telnet, порт 24 (НЕ 23!), логин root (пароль 17909 — у HDCVT;
// у чистого ASPEED пароль не запрашивается — обрабатываем оба случая).
// Команды:
//   astparam s <key> <value>  — setup-time (требует astparam save + reboot -f)
//   astparam g <key>          — чтение параметра
//   e e_<команда>::аргументы  — runtime, действует сразу
//
// Коммутация (Console APIs v2):
//   канал 0000..9999; энкодер: e e_reconnect::{ch} — задать канал и запустить сервисы;
//   декодер: e e_reconnect::{ch}::{v|a|u|r|s|c} — подключить нужный сигнал к каналу,
//   e e_stop_link::{сигналы} — отключить. Для «один-ко-многим» нужен multicast_on=y.
//
// Discovery: node_query --dump --json (запускается НА любом известном устройстве
// через telnet — оно опрашивает всю сеть), плюс mDNS (hostname ast*-...).
//
// Видеостена (Video Wall API v2): e e_vw_enable_{X1}_{Y1}_{X2}_{Y2}_2,
// координаты в ‱ (0..10000) с учётом рамок (OW/VW/OH/VH), поворот e_vw_rotate_{3|6}.
//
// MJPEG-превью: http://<ip>:8080/?action=stream | ?action=snapshot (порт 8080).
//
// Источники: _docs/console_apis_v2.md, _docs/videowall_api_v2.md,
// _docs/howto_control.md, _docs/snapshot_substream.md, _api_ref.md
const net = require('net');

const TELNET_PORT = 24;
const LOGIN = 'root';
const PASSWORD = '17909';
const TIMEOUT_MS = 8000;
const PREVIEW_PORT = 8080;

/** Отправить команды по Telnet, вернуть весь вывод после логина */
function telnetExec(ip, commands) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = '';
    let output = '';
    let loggedIn = false;
    let sent = false;
    const cmds = Array.isArray(commands) ? commands : [commands];

    const timer = setTimeout(() => {
      socket.destroy();
      // отдаём то, что успели получить — node_query может быть медленным
      loggedIn && sent ? resolve(output) : reject(new Error(`Telnet ${ip}: таймаут`));
    }, TIMEOUT_MS);

    const finish = () => {
      clearTimeout(timer);
      resolve(output);
    };

    socket.connect(TELNET_PORT, ip);
    socket.on('data', (data) => {
      const text = data.toString('utf8');
      buffer += text;
      if (sent) output += text;
      if (!loggedIn && /login:/i.test(buffer)) {
        socket.write(LOGIN + '\n');
        buffer = '';
      } else if (!loggedIn && /password:/i.test(buffer)) {
        socket.write(PASSWORD + '\n');
        buffer = '';
      } else if (!sent && /[#$]\s*$/.test(buffer)) {
        loggedIn = true;
        sent = true;
        socket.write(cmds.join('\n') + '\nexit\n');
        buffer = '';
      }
    });
    socket.on('close', finish);
    socket.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Канал энкодера: deviceId -> '0001' (4 цифры, 0000..9999) */
function channelOf(encoder) {
  return String(encoder.deviceId).padStart(4, '0');
}

// Буквы сигналов для e_reconnect / e_stop_link (Console APIs v2 + howto)
const SIGNAL_LETTER = {
  video: 'v',
  audio: 'a',
  usb: 'u',
  ir: 'r',
  rs232: 's',
  cec: 'c',
};

// Настройки устройства -> runtime-команды (из API-дока V1.0)
const PARAM_COMMANDS = {
  // Светодиоды: {on: bool, timerSec: 0..90, lock: bool}
  led: (v) => [`e e_front_panel_status::${v.lock ? 'lock' : 'unlock'}::${v.on ? 'y' : 'n'}::t${v.timerSec ?? 0}`],
  // EDID энкодера: имя из списка (напр. '4K60444PCM20SDR')
  edid: (v) => [`e e_edid_select::${v}`],
  // Разрешение выхода декодера: 'bypass' | '1080P50' | ...
  resolution: (v) => [`e e_video_genlock_scaling::${v}`],
  // ИК порт: '5v' | '12v'
  irMode: (v) => [`e e_irmode::${v}`],
  // Сетевой порт: 'fiber' | 'copper'
  fcMode: (v) => [`e e_fc_mode_select::${v}`],
  // Реле: {relay: 1|2, closed: bool}
  relay: (v) => [`e e_relay_status::${v.relay}::${v.closed ? 'y' : 'n'}`],
  // Digital IO: {level:'5v'|'12v', port:1|2, mode:'in'|'out', high:bool}
  io: (v) => [
    v.mode === 'in'
      ? `e e_io_status::${v.level}::${v.port}::in`
      : `e e_io_status::${v.level}::${v.port}::out::${v.high ? 'y' : 'n'}`,
  ],
  // HDCP: 'hdcp_src'|'hdcp_snk'|'hdcp_off'|'hdcp_1p4'|'hdcp_2p2'
  hdcp: (v) => [`e e_hdmiout_hdcp_select::${v}`],
  // CEC-код на HDMI OUT энкодера: напр. '40_04'
  cecCode: (v) => [`e e_hdmiout_cec_code::${v}`],
  // Источник звука энкодера: 'hdmi' | 'analog' (howto_control)
  audioInput: (v) => [
    `astparam s a_io_select ${v}`,
    `echo ${v} > /sys/devices/platform/1500_i2s/io_select`,
    'astparam save',
  ],
  // Видеовыход декодера: {off: bool} (Console APIs: screen_off)
  videoOutput: (v) => [`echo ${v.off ? 1 : 0} > /sys/devices/platform/display/screen_off`],
  // Пауза/чёрный экран декодера: 0=играть, 1=пауза, 2=чёрный
  pause: (v) => [`echo ${v} > /sys/devices/platform/videoip/pause`],
};

/** Разбор JSON-вывода node_query из телнет-дампа */
function parseNodeQuery(raw) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end < 0) throw new Error('node_query: JSON не найден в ответе');
  const json = JSON.parse(raw.slice(start, end + 1));
  return (json.nodes || []).map((n) => ({
    type: n.IS_HOST === 'y' ? 'ENCODER' : 'DECODER',
    mac: (n.MY_MAC || '').replace(/(..)(?=.)/g, '$1:'),
    ip: n.MY_IP,
    hostname: n.HOSTNAME,
    channel: n.CH_SELECT,
    state: n.STATE,
    online: n.STATE === 's_srv_on' || n.STATE === 's_attaching',
  }));
}

module.exports = {
  name: 'hdn900',

  /**
   * Поиск устройств.
   * seedIps — известные IP (из БД): телнетимся к первому живому и запускаем
   * node_query --dump --json, который опрашивает ВСЮ сеть.
   * Без seed — mDNS-поиск хостов ast* (устройства анонсируют HTTP по mDNS).
   */
  async discover(seedIps = []) {
    // Достаточно достучаться до ОДНОГО устройства: node_query на нём вернёт всю сеть.
    for (const ip of seedIps) {
      try {
        const out = await telnetExec(ip, 'node_query --dump --json');
        return parseNodeQuery(out);
      } catch { /* пробуем следующий seed */ }
    }
    // mDNS: устройства анонсируют себя как ast*; спрашиваем через каждую сетевую карту
    const mdnsIps = [];
    for (const ifaceIp of localIPv4()) {
      for (const found of await mdnsFindAstDevices(3000, ifaceIp)) {
        if (!mdnsIps.includes(found)) mdnsIps.push(found);
      }
    }
    // Соседи по L2: устройства оседают в таблице ARP/neighbour от собственного трафика,
    // даже когда multicast режется коммутатором
    const arpIps = await neighbourCandidates();
    for (const ip of [...mdnsIps, ...arpIps]) {
      try {
        const out = await telnetExec(ip, 'node_query --dump --json');
        return parseNodeQuery(out);
      } catch { /* следующий */ }
    }
    throw new Error(
      'Устройства не найдены автоматически (mDNS и таблица соседей пусты). ' +
      'Укажите IP-адрес любого энкодера или декодера вручную — остальные найдутся автоматически. ' +
      'IP устройства можно посмотреть на его передней панели: удерживать кнопку ▲ (CH SELECT) 5 секунд.'
    );
  },

  /**
   * Опрос одного устройства по известному IP (ручное добавление).
   * Сначала пробуем node_query — он вернёт сразу все устройства сети;
   * если не вышло — собираем данные самого устройства через lmparam.
   */
  async probeByIp(ip) {
    try {
      const out = await telnetExec(ip, 'node_query --dump --json');
      const list = parseNodeQuery(out);
      if (list.length) return list;
    } catch { /* пробуем прочитать хотя бы само устройство */ }

    const out = await telnetExec(ip, [
      'lmparam g IS_HOST', 'lmparam g HOSTNAME', 'lmparam g CH_SELECT', 'lmparam g STATE',
      'cat /sys/class/net/eth0/address',
    ]);
    const macM = out.match(/([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i);
    const isHost = /(^|\n)\s*y\s*(\n|$)/.test(out) || /IS_HOST=y/.test(out);
    const hostM = out.match(/(ast\d?-\S+)/i);
    if (!macM && !hostM) {
      throw new Error(`Устройство ${ip} не отвечает по Telnet (порт ${TELNET_PORT}) или это не HDN-EA900`);
    }
    return [{
      type: isHost ? 'ENCODER' : 'DECODER',
      mac: (macM ? macM[1] : '00:00:00:00:00:00').toUpperCase(),
      ip,
      hostname: hostM ? hostM[1] : '',
      online: true,
    }];
  },

  async getStatus(device) {
    try {
      const out = await telnetExec(device.ip, 'cat /proc/uptime');
      const m = out.match(/([\d.]+)\s/);
      return { online: true, uptimeSec: m ? Math.floor(parseFloat(m[1])) : 0 };
    } catch {
      return { online: false, uptimeSec: 0 };
    }
  },

  async setParam(device, key, value) {
    const make = PARAM_COMMANDS[key];
    if (!make) throw new Error(`Неизвестный параметр устройства: ${key}`);
    const out = await telnetExec(device.ip, make(value));
    return { ok: true, out };
  },

  /**
   * Назначить энкодеру канал = его deviceId и запустить сервисы.
   * Вызывается при добавлении энкодера в систему.
   * reset_ch_on_boot=n — чтобы канал переживал перезагрузку.
   */
  async assignChannel(encoder) {
    const ch = channelOf(encoder);
    await telnetExec(encoder.ip, [
      'astparam s reset_ch_on_boot n',
      'astparam save',
      `e e_reconnect::${ch}`,
    ]);
    return { ok: true, channel: ch };
  },

  /** Включить multicast-режим (нужен для «один энкодер -> много декодеров»). Перезагружает устройство! */
  async enableMulticast(device) {
    await telnetExec(device.ip, ['astparam s multicast_on y', 'astparam save', 'reboot -f']);
    return { ok: true, reboot: true };
  },

  /**
   * Коммутация: подключить сигнал декодера к каналу энкодера.
   * encoder = null -> остановить сигнал (e_stop_link).
   */
  async route(signal, encoder, decoder) {
    const letter = SIGNAL_LETTER[signal];
    if (!letter) throw new Error(`Неизвестный сигнал: ${signal}`);
    if (!encoder) {
      await telnetExec(decoder.ip, `e e_stop_link::${letter}`);
      return { ok: true, stopped: true };
    }
    const ch = channelOf(encoder);
    await telnetExec(decoder.ip, `e e_reconnect::${ch}::${letter}`);
    return { ok: true, channel: ch };
  },

  /**
   * Видеостена (API v2): вырез области источника для панели (row, col)
   * из сетки rows x cols с учётом рамок.
   * bezel: {ow, vw, oh, vh} — внешняя ширина/видимая ширина/внешняя высота/видимая
   * высота панели в мм (OW>=VW, OH>=VH). Без рамок передать ow==vw, oh==vh.
   * rotate: 0 | 180 | 270 (поворот API v1: e_vw_rotate_3 / _6).
   */
  async wallApply(decoder, { rows, cols, row, col, bezel, rotate }) {
    const { ow = 1, vw = 1, oh = 1, vh = 1 } = bezel || {};
    const xTotal = (cols - 1) * ow + vw;
    const yTotal = (rows - 1) * oh + vh;
    const S = 10000;
    const x1 = Math.round((S * (col * ow)) / xTotal);
    const y1 = Math.round((S * (row * oh)) / yTotal);
    const x2 = Math.round((S * (col * ow + vw)) / xTotal);
    const y2 = Math.round((S * (row * oh + vh)) / yTotal);
    const cmds = [`e e_vw_enable_${x1}_${y1}_${x2}_${y2}_2`];
    if (rotate === 180) cmds.push('e e_vw_rotate_3');
    if (rotate === 270) cmds.push('e e_vw_rotate_6');
    await telnetExec(decoder.ip, cmds);
    return { ok: true, area: { x1, y1, x2, y2 } };
  },

  /** Выключить режим видеостены на декодере (вернуть в «Матрицу») */
  async wallDisable(decoder) {
    await telnetExec(decoder.ip, 'e e_vw_enable_0_0_0_0_2');
    return { ok: true };
  },

  /** URL живого MJPEG-превью и снапшота устройства (доступны ПУ из видео LAN) */
  previewUrl(device, opts = {}) {
    const { w = 320, h = 180, fps = 10 } = opts;
    return `http://${device.ip}:${PREVIEW_PORT}/?action=stream&w=${w}&h=${h}&fps=${fps}`;
  },
  snapshotUrl(device, opts = {}) {
    const { w = 640, h = 360, q = 60 } = opts;
    return `http://${device.ip}:${PREVIEW_PORT}/?action=snapshot&w=${w}&h=${h}&q=${q}`;
  },

  /**
   * Сетевые настройки через UDP-multicast 225.3.0.0:3335 (док [13]).
   * Пакет: 5 полей char[20]: mac (без ':'), ip_mode ('static'|'dhcp'), ip, netmask, gateway.
   * Устройство сверяет MAC, применяет и перезагружается (без подтверждения).
   */
  async setNetwork(device, { ip, netmask, gateway, dhcp }) {
    const dgram = require('dgram');
    const buf = Buffer.alloc(100);
    const put = (s, off) => buf.write(String(s || ''), off, 19, 'ascii');
    put(device.mac.replace(/:/g, ''), 0);
    put(dhcp ? 'dhcp' : 'static', 20);
    if (!dhcp) {
      put(ip, 40);
      put(netmask, 60);
      put(gateway, 80);
    }
    await new Promise((resolve, reject) => {
      const sock = dgram.createSocket('udp4');
      sock.send(buf, 3335, '225.3.0.0', (err) => {
        sock.close();
        err ? reject(err) : resolve();
      });
    });
    return { ok: true, reboot: true };
  },

  async reboot(device) {
    await telnetExec(device.ip, 'reboot -f');
    return { ok: true };
  },

  /** Заводские настройки (Console APIs: Reset Setting to Factory Default) */
  async factoryReset(device) {
    await telnetExec(device.ip, ['astparam dump', 'astparam erase_all', 'reboot -f']);
    return { ok: true };
  },
};

/**
 * Соседи по L2 из таблицы ARP/neighbour — кандидаты на опрос.
 * Linux: `ip neigh show` → "169.254.10.2 dev enp46s0 lladdr 6c:df:fb:01:4d:84 REACHABLE"
 * Windows: `arp -a`      → "  169.254.10.2   6c-df-fb-01-4d-84   dynamic"
 * Подсеть не фильтруем: на объектах устройства могут быть в любой сети.
 */
function neighbourCandidates() {
  const { exec } = require('child_process');
  const isWin = process.platform === 'win32';
  // на Ubuntu net-tools (arp) может быть не установлен — основной путь `ip neigh`
  const cmd = isWin ? 'arp -a' : 'ip neigh show || arp -an';
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true, shell: isWin ? undefined : '/bin/sh' }, (err, stdout) => {
      if (err && !stdout) return resolve([]);
      const ips = [];
      for (const line of String(stdout).split('\n')) {
        // «мёртвые» записи не опрашиваем
        if (/FAILED|INCOMPLETE|incomplete/i.test(line)) continue;
        // IP: либо первым словом (ip neigh), либо в скобках (arp -an), либо в колонке (Windows)
        const ipM = line.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        // MAC: с двоеточиями (Linux) или дефисами (Windows)
        const macM = line.match(/([0-9a-f]{2}(?:[:-][0-9a-f]{2}){5})/i);
        if (!ipM || !macM) continue;
        const ip = ipM[1];
        const mac = macM[1].toLowerCase().replace(/-/g, ':');
        // отбрасываем broadcast/multicast и собственные адреса
        if (mac.startsWith('ff:ff') || mac.startsWith('01:00:5e') || mac.startsWith('33:33')) continue;
        if (ip.endsWith('.255') || ip.startsWith('224.') || ip.startsWith('239.')) continue;
        if (!ips.includes(ip)) ips.push(ip);
      }
      resolve(ips);
    });
  });
}

/** Локальные IPv4-адреса машины (для привязки mDNS к нужной сетевой карте) */
function localIPv4() {
  const os = require('os');
  const out = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address);
    }
  }
  return out;
}

/**
 * mDNS-поиск устройств ast* (Bonjour): возвращает список IP.
 * ifaceIp — адрес сетевой карты, в которую смотрит видео-сеть. На машине с двумя
 * картами без явной привязки запрос уходит не в тот интерфейс и ответов нет.
 */
function mdnsFindAstDevices(waitMs, ifaceIp) {
  return new Promise((resolve) => {
    let mdns;
    try {
      mdns = require('multicast-dns')(ifaceIp ? { interface: ifaceIp } : undefined);
    } catch {
      return resolve([]);
    }
    const ips = new Set();
    mdns.on('response', (res) => {
      for (const a of [...(res.answers || []), ...(res.additionals || [])]) {
        if (a.type === 'A' && /^ast/i.test(a.name)) ips.add(a.data);
      }
    });
    mdns.query({ questions: [{ name: '_http._tcp.local', type: 'PTR' }] });
    setTimeout(() => {
      mdns.destroy();
      resolve([...ips]);
    }, waitMs);
  });
}
