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
  // Параметры RS-232 одной строкой: «115200-8n1» = скорость-биты·чётность·стоп-биты
  // (документация «How to Use Serial over IP»); требует перезагрузки устройства
  serial: (v) => {
    const parity = { none: 'n', even: 'e', odd: 'o' }[v.parity] || 'n';
    return [
      `astparam s s0_baudrate ${v.baudRate || 115200}-${v.dataBits || 8}${parity}${v.stopBits || 1}`,
      `astparam s no_soip ${v.enabled === false ? 'y' : 'n'}`,
      'astparam save',
    ];
  },
};


// Устройство хранит EDID и разрешение номерами, интерфейс — именами.
// Порядок строго как в документации ASPEED (00..23 и 00..13).
const EDID_BY_INDEX = [
  '1080PPCM20SDR', '1080PDTS51SDR', '1080PHD71SDR',
  '1080IPCM20SDR', '1080IDTS51SDR', '1080IHD71SDR',
  '3DPCM20SDR', '3DDTS51SDR', '3DHD71SDR',
  '4K30444PCM20SDR', '4K30444DTS51SDR', '4K30444HD71SDR',
  '4K60420PCM20SDR', '4K60420DTS51SDR', '4K60420HD71SDR',
  '4K60444PCM20SDR', '4K60444DTS51SDR', '4K60444HD71SDR',
  '4K60444PCM20HDR', '4K60444DTS51HDR', '4K60444HD71HDR',
  'DVI1280X1024', 'DVI1920X1080', 'DVI1920X1200',
].reduce((m, name, i) => { m[String(i).padStart(2, '0')] = name; m[String(i)] = name; return m; }, {});

const SCALING_BY_INDEX = [
  'bypass', '1080P50', '1080P60', '720P50', '720P60',
  '2160P24', '2160P30', '2160P50', '2160P60',
  '1280x1024', '1360x768', '1440x900', '1680x1050', '1920x1200',
].reduce((m, name, i) => { m[String(i).padStart(2, '0')] = name; m[String(i)] = name; return m; }, {});

// Заводские значения параметров: устройство хранит только то, что меняли,
// на остальное «astparam g» отвечает «not defined». Значения — из документации ASPEED.
const DEFAULT_PARAMS = {
  irmode: '12v',            // ИК-порт: 12 В
  fcmode: 'copper',         // сетевой порт: медь
  iolevel: '12v',           // порты Digital IO: 12 В
  io1mode: 'out', io2mode: 'out',
  io1status: 'n', io2status: 'n',   // низкий уровень
  relay1status: 'n', relay2status: 'n',
  edid: '15',               // 4K60444PCM20SDR
  resolution: '00',         // Bypass
  hdmiouthdcp: 'hdcp_snk',  // как у дисплея
  a_io_select: 'hdmi',
  no_soip: 'n',             // пересылка RS-232 включена
  s0_baudrate: '115200-8n1',
  led_on: 'y', led_timer: 't0',
  multicast_on: 'n',
};

/**
 * Значение параметра из телнет-вывода. Устройство печатает его БЕЗ перевода строки,
 * и сразу следом идёт приглашение «/ # » — отрезаем его, иначе «y» читается как «y/ #».
 */
function paramValue(text) {
  const line = String(text || '').split(/\r?\n/).map((l) => l.trim()).find(Boolean) || '';
  return line.replace(/\s*\/\s*#.*$/, '').trim();
}

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
   * Поиск устройств. Результат — объединение двух источников по MAC:
   *  • node_query --dump --json на любом живом устройстве (seed из БД, соседи по ARP);
   *  • arp-scan подсети видео-порта — устройства, которых node_query не видит
   *    (на объекте из 8 устройств он показывал 5), опрашиваются по одному.
   * После перезагрузки устройства в автоматическом режиме получают ДРУГИЕ адреса,
   * поэтому поиск всегда идёт до конца, а не до первого ответа.
   */
  async discover(seedIps = []) {
    const byMac = new Map();
    const queried = new Set();
    const add = (list) => {
      for (const d of list) if (d.mac && !byMac.has(d.mac)) byMac.set(d.mac, d);
    };
    const knownIp = (ip) => [...byMac.values()].some((d) => d.ip === ip);
    // node_query на устройстве: вернёт всё, что оно видит в сети
    const query = async (ip) => {
      if (queried.has(ip)) return false;
      queried.add(ip);
      try {
        add(parseNodeQuery(await telnetExec(ip, 'node_query --dump --json')));
        return true;
      } catch { return false; }
    };
    // одиночное устройство — если node_query на нём не отработал
    const single = async (ip) => {
      try { add(await module.exports.probeByIp(ip)); } catch { /* не устройство */ }
    };

    for (const ip of seedIps) {
      if (await query(ip)) break;
    }
    // Соседи по L2: мгновенно, устройства оседают в таблице ARP от своего трафика.
    // Сначала быстрая проверка порта — иначе каждый посторонний сосед (роутер, принтер)
    // съедал бы полный таймаут Telnet.
    if (!byMac.size) {
      const neighbours = await neighbourCandidates();
      const alive = (await Promise.all(
        neighbours.map(async (ip) => ((await probeTelnet(ip)) ? ip : null)),
      )).filter(Boolean);
      for (const ip of alive) {
        if (await query(ip)) break;
      }
    }
    // Обход подсети видео-порта через arp-scan — всегда, даже если node_query что-то дал:
    // устройства ASPEED молчат в эфир, и часть из них node_query может не показать.
    for (const iface of localNetworks()) {
      const hits = await arpScan(iface.name);
      const fresh = hits.filter((ip) => !knownIp(ip));
      const alive = (await Promise.all(
        fresh.map(async (ip) => ((await probeTelnet(ip)) ? ip : null)),
      )).filter(Boolean);
      for (const ip of alive) {
        if (knownIp(ip)) continue;
        await query(ip);
        if (!knownIp(ip)) await single(ip);
      }
    }
    if (byMac.size) return [...byMac.values()];

    // Если arp-scan недоступен — перебираем подсеть подключениями (медленнее и на сети /16
    // может упереться в предел таблицы соседей ядра, поэтому только как запасной путь)
    const scanned = await scanForDevice();
    if (scanned) {
      await query(scanned);
      if (!knownIp(scanned)) await single(scanned);
      if (byMac.size) return [...byMac.values()];
    }
    // mDNS — в последнюю очередь: оборудование других производителей себя анонсирует,
    // но ждать ответов дольше, чем просканировать подсеть
    for (const ifaceIp of localIPv4()) {
      for (const ip of await mdnsFindAstDevices(2000, ifaceIp)) {
        await query(ip);
        if (byMac.size) return [...byMac.values()];
      }
    }
    throw new Error(
      'Устройства не найдены: ни mDNS, ни таблица соседей, ни сканирование подсети ' +
      'ничего не дали. Проверьте, что кабель видео-сети подключён, устройства включены ' +
      'и находятся в той же подсети, что и видео-порт платформы. ' +
      'Либо укажите IP-адрес любого энкодера или декодера вручную — остальные найдутся ' +
      'автоматически (адрес виден на передней панели устройства: удерживать кнопку ▲ CH SELECT 5 секунд).'
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

  /**
   * Прочитать текущие настройки устройства — чтобы в интерфейсе были видны реальные
   * значения, а не пустые поля. Все параметры читаются одним сеансом Telnet:
   * перед каждым значением печатаем метку, по ней и разбираем ответ.
   */
  async readParams(device) {
    const keys = [
      'multicast_on', 'edid', 'irmode', 'fcmode', 'iolevel',
      'io1mode', 'io2mode', 'io1status', 'io2status',
      'relay1status', 'relay2status', 'led_on', 'led_timer',
      'resolution', 'a_io_select', 'hdmiouthdcp',
      'no_soip', 's0_baudrate', 'ip_mode', 'ipaddr', 'netmask', 'gatewayip',
    ];
    const cmds = keys.map((k) => `echo "<<${k}"; astparam g ${k}`);
    const out = await telnetExec(device.ip, cmds);
    const defaults = []; // параметры, которые устройство не хранит — действует заводское значение

    const raw = {};
    for (const key of keys) {
      // значение — первая непустая строка после метки, «not defined» считаем отсутствием
      const m = out.match(new RegExp(`<<${key}\\s*\\r?\\n([^\\r\\n]*)`));
      let v = m ? paramValue(m[1]) : '';
      if (!v || /not defined/i.test(v) || v.startsWith('echo ') || v.startsWith('astparam')) v = '';
      // «не определено» значит, что действует заводское значение — подставляем его,
      // иначе поля в интерфейсе остаются пустыми, хотя устройство работает
      raw[key] = v || DEFAULT_PARAMS[key] || '';
      if (!v) defaults.push(key);
    }

    // приводим к значениям, которыми оперирует интерфейс
    const s = {};
    if (raw.led_on) s.led = raw.led_on === 'n' ? 'off' : (raw.led_timer && raw.led_timer !== 't0' ? 'on60' : 'on');
    if (raw.edid) s.edid = EDID_BY_INDEX[raw.edid] || raw.edid;
    if (raw.irmode) s.irMode = raw.irmode;
    if (raw.fcmode) s.fcMode = raw.fcmode;
    if (raw.iolevel) s.ioLevel = raw.iolevel;
    if (raw.io1mode) s.io1mode = raw.io1mode;
    if (raw.io2mode) s.io2mode = raw.io2mode;
    if (raw.io1status) s.io1level = raw.io1status === 'y' ? 'high' : 'low';
    if (raw.io2status) s.io2level = raw.io2status === 'y' ? 'high' : 'low';
    if (raw.resolution) s.scaling = SCALING_BY_INDEX[raw.resolution] || raw.resolution;
    if (raw.a_io_select) s.audioInput = raw.a_io_select;
    if (raw.hdmiouthdcp) s.hdcp = raw.hdmiouthdcp;
    if (raw.no_soip) s.rs232Relay = raw.no_soip === 'n';
    // строка вида «115200-8n1»: скорость, биты данных, чётность, стоповые биты
    const b = (raw.s0_baudrate || '').match(/^(\d+)-([5-8])([neo])([12])$/i);
    if (b) {
      s.baudRate = Number(b[1]);
      s.dataBits = Number(b[2]);
      s.parity = { n: 'none', e: 'even', o: 'odd' }[b[3].toLowerCase()];
      s.stopBits = Number(b[4]);
    }
    return {
      settings: s,
      network: {
        // автоматический режим (169.254.x.x) — заводской у этих устройств
        mode: raw.ip_mode === 'dhcp' ? 'dhcp' : (raw.ip_mode === 'static' ? 'static' : 'auto'),
        dhcp: raw.ip_mode === 'dhcp',
        ip: raw.ipaddr || device.ip,
        netmask: raw.netmask || '255.255.0.0',
        gateway: raw.gatewayip || '',
      },
      multicast: raw.multicast_on === 'y',
      defaults, // что показано заводским значением, а не считано
      raw,
    };
  },

  /**
   * Многоадресный режим включён?
   * Без него энкодер отдаёт поток только ОДНОМУ декодеру: на стене картинку видит
   * лишь один экран, а остальные перехватывают её друг у друга.
   */
  async getMulticast(device) {
    const out = await telnetExec(device.ip, 'astparam g multicast_on');
    if (/not defined/i.test(out)) return false;
    return /(^|\n)\s*y\s*(\r?\n|$)/.test(out.replace(/astparam g multicast_on/g, ''));
  },

  /** Включить многоадресный режим (нужен для «один энкодер → много декодеров»). Перезагружает устройство! */
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

/** Сетевые карты с адресом и маской — по ним строим диапазоны сканирования */
function localNetworks() {
  const os = require('os');
  const nets = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const prefix = a.cidr ? Number(a.cidr.split('/')[1]) : 24;
      nets.push({ name, address: a.address, prefix });
    }
  }
  return nets;
}

const ipToInt = (ip) => ip.split('.').reduce((n, o) => (n << 8 >>> 0) + Number(o), 0) >>> 0;
const intToIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');

/**
 * Адреса подсети по порядку. Устройства ASPEED разбросаны по всей автоматической
 * сети 169.254.x.x, поэтому обходим её последовательно — первое живое находится
 * обычно за пару секунд.
 * Диапазон шире /16 не сканируем: это уже не локальная сеть.
 */
function* subnetHosts(address, prefix) {
  const p = Math.max(prefix, 16);
  const size = 2 ** (32 - p);
  const base = (ipToInt(address) & (0xffffffff << (32 - p))) >>> 0;
  const self = ipToInt(address);
  for (let i = 1; i < size - 1; i++) {
    const n = (base + i) >>> 0;
    if (n !== self) yield intToIp(n);
  }
}

/**
 * Обход подсети через arp-scan: рассылает ARP-запросы напрямую и потому не забивает
 * таблицу соседей ядра — в отличие от перебора TCP-подключениями, который на сети /16
 * упирается в предел таблицы и начинает терять живые устройства.
 * Возвращает адреса всех откликнувшихся соседей (пусто, если arp-scan не установлен).
 */
function arpScan(iface, timeoutMs = 40000) {
  const { execFile } = require('child_process');
  const args = ['-I', iface, '--localnet', '--bandwidth=8M', '--retry=2'];
  const run = (cmd, cmdArgs) =>
    new Promise((resolve) => {
      execFile(cmd, cmdArgs, { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 << 20 },
        (err, stdout) => resolve(String(stdout || '')));
    });
  return (async () => {
    // при установке arp-scan выдаются права на сырые сокеты (setcap), но если их нет —
    // пробуем через sudo, он настроен на боевом контроллере
    let out = await run('arp-scan', args);
    if (!/^\d{1,3}(\.\d{1,3}){3}\s/m.test(out)) out = await run('sudo', ['-n', 'arp-scan', ...args]);
    const ips = [];
    for (const line of out.split('\n')) {
      const m = line.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+[0-9a-f]{2}(?::[0-9a-f]{2}){5}/i);
      if (m && !ips.includes(m[1])) ips.push(m[1]);
    }
    return ips;
  })();
}

/** Отвечает ли адрес на Telnet-порт устройства */
function probeTelnet(ip, timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(TELNET_PORT, ip);
  });
}

/**
 * Обойти подсети сетевых карт и вернуть первый адрес, отозвавшийся на Telnet.
 * Достаточно одного устройства: node_query на нём отдаст всю сеть целиком.
 */
async function scanForDevice(deadlineMs = 20000, concurrency = 384) {
  const until = Date.now() + deadlineMs;
  for (const net_ of localNetworks()) {
    const hosts = subnetHosts(net_.address, net_.prefix);
    let found = null;
    let exhausted = false;
    while (!found && !exhausted && Date.now() < until) {
      const batch = [];
      for (let i = 0; i < concurrency; i++) {
        const next = hosts.next();
        if (next.done) { exhausted = true; break; }
        batch.push(next.value);
      }
      if (!batch.length) break;
      const results = await Promise.all(batch.map(async (ip) => ((await probeTelnet(ip)) ? ip : null)));
      found = results.find(Boolean) || null;
    }
    if (found) return found;
  }
  return null;
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
