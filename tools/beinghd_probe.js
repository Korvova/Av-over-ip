// Разведчик устройств BeingHD (серия IPX): снимаем реальные форматы ответов,
// которых нет в документации завода.
//
// Протокол (из «JSON Control Protocol BeingHD.xlsx» + писем завода):
//   multicast 239.1.0.1:8804 — общая шина, устройства сами шлют туда трафик
//   UDP 6004 — unicast-команды конкретному устройству
//   TCP 6006 — тот же JSON, но с 20-байтовым заголовком
//
// Запуск (Node.js 18+, зависимостей нет):
//   node beinghd_probe.js listen [iface-ip]          — пассивно слушать шину
//   node beinghd_probe.js discover [iface-ip]        — послать discovery и слушать ответы
//   node beinghd_probe.js ask <ip> <json>            — unicast-команда на IP:6004
//   node beinghd_probe.js scan <ip> [iface-ip]       — снять полный портрет устройства
//
// iface-ip — адрес сетевой карты, смотрящей в видео-сеть (важно на машинах
// с несколькими интерфейсами: на мини-ПК это 169.254.99.20).
const dgram = require('dgram');
const os = require('os');

const GROUP = '239.1.0.1';
const MCAST_PORT = 8804;
const UNICAST_PORT = 6004;

const stamp = () => new Date().toISOString().slice(11, 23);

/** Красивый вывод пакета: JSON разбираем, иначе показываем как есть */
function dump(from, buf) {
  const text = buf.toString('utf8').trim();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* не JSON */ }
  console.log(`\n[${stamp()}] ← ${from.address}:${from.port} (${buf.length} байт)`);
  if (parsed) {
    console.log(JSON.stringify(parsed, null, 2));
  } else {
    console.log(text || buf.toString('hex'));
  }
}

/** Открыть сокет на multicast-группе */
function openGroup(ifaceIp) {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  sock.on('error', (e) => { console.error('Ошибка сокета:', e.message); sock.close(); });
  sock.on('message', dump);
  sock.bind(MCAST_PORT, () => {
    try {
      sock.addMembership(GROUP, ifaceIp);
      sock.setMulticastTTL(4);
      if (ifaceIp) sock.setMulticastInterface(ifaceIp);
      console.log(`Слушаю ${GROUP}:${MCAST_PORT}${ifaceIp ? ` через ${ifaceIp}` : ''}`);
    } catch (e) {
      console.error('Не удалось войти в группу:', e.message);
      console.error('Укажите IP нужного интерфейса вторым аргументом. Доступны:');
      for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
        for (const a of addrs) {
          if (a.family === 'IPv4' && !a.internal) console.error(`  ${a.address}  (${name})`);
        }
      }
      process.exit(1);
    }
  });
  return sock;
}

function cmdListen(ifaceIp) {
  openGroup(ifaceIp);
  console.log('Ждём анонсы устройств. Ctrl+C для выхода.');
}

function cmdDiscover(ifaceIp) {
  const sock = openGroup(ifaceIp);
  const payload = Buffer.from(JSON.stringify({ cmd: 'discovery', msgtype: 0 }));
  const send = () => {
    sock.send(payload, MCAST_PORT, GROUP, (e) => {
      console.log(`[${stamp()}] → discovery на ${GROUP}:${MCAST_PORT}${e ? ' ОШИБКА: ' + e.message : ''}`);
    });
  };
  setTimeout(send, 500);
  setTimeout(send, 3000); // повтор: первый пакет часто теряется при входе в группу
  console.log('Ждём ответы 30 секунд…');
  setTimeout(() => { sock.close(); process.exit(0); }, 30000);
}

/** Unicast-команда на IP:6004, ждём ответ */
function ask(ip, json, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    const payload = Buffer.from(typeof json === 'string' ? json : JSON.stringify(json));
    let answered = false;
    const timer = setTimeout(() => {
      if (!answered) console.log(`[${stamp()}] нет ответа на ${payload}`);
      sock.close();
      resolve(null);
    }, timeoutMs);
    sock.on('message', (buf, from) => {
      answered = true;
      clearTimeout(timer);
      dump(from, buf);
      sock.close();
      let parsed = null;
      try { parsed = JSON.parse(buf.toString('utf8')); } catch { /* не JSON */ }
      resolve(parsed);
    });
    sock.on('error', (e) => { console.error('Ошибка:', e.message); clearTimeout(timer); resolve(null); });
    sock.send(payload, UNICAST_PORT, ip, () => {
      console.log(`[${stamp()}] → ${ip}:${UNICAST_PORT} ${payload}`);
    });
  });
}

/** Полный портрет устройства: чем является и что умеет */
async function cmdScan(ip) {
  console.log(`\n=== Опрос ${ip} ===`);
  const probes = [
    ['версия ПО', { cmd: 'getsoftversion' }],
    ['ID устройства', { cmd: 'getid' }],
    ['сеть', { cmd: 'getnet' }],
    ['MAC', { cmd: 'getmac' }],
    ['вход HDMI (признак энкодера)', { cmd: 'getviinfo' }],
    ['параметры кодирования (признак энкодера)', { cmd: 'getvencattr' }],
    ['открытые окна (признак декодера)', { cmd: 'getwindowinfo' }],
    ['видеостены', { cmd: 'getwall' }],
    ['протокол потока', { cmd: 'getprotocol' }],
    ['аптайм', { cmd: 'getruntime' }],
    ['нагрузка', { cmd: 'getdevops' }],
    ['пользовательское имя', { cmd: 'getuserboardinfo' }],
  ];
  for (const [label, json] of probes) {
    console.log(`\n--- ${label}`);
    await ask(ip, json);
  }
  console.log('\n=== Опрос завершён ===');
  console.log('Роль устройства определяем по: наличию сигнала getviinfo / параметрам кодера / окнам декодера.');
}

const [, , mode, arg1, ...rest] = process.argv;
switch (mode) {
  case 'listen':
    cmdListen(arg1);
    break;
  case 'discover':
    cmdDiscover(arg1);
    break;
  case 'ask':
    if (!arg1 || !rest.length) {
      console.error('Использование: node beinghd_probe.js ask <ip> \'{"cmd":"getsoftversion"}\'');
      process.exit(1);
    }
    ask(arg1, rest.join(' ')).then(() => process.exit(0));
    break;
  case 'scan':
    if (!arg1) {
      console.error('Использование: node beinghd_probe.js scan <ip>');
      process.exit(1);
    }
    cmdScan(arg1).then(() => process.exit(0));
    break;
  default:
    console.log(`Разведчик устройств BeingHD (IPX)

  node beinghd_probe.js listen [iface-ip]     слушать шину ${GROUP}:${MCAST_PORT}
  node beinghd_probe.js discover [iface-ip]   послать discovery и собрать ответы
  node beinghd_probe.js ask <ip> <json>       unicast-команда на IP:${UNICAST_PORT}
  node beinghd_probe.js scan <ip>             полный портрет устройства

Пример: node beinghd_probe.js discover 169.254.99.20`);
}
