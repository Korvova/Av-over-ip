// Периодический опрос устройств: «Статус» (в сети / не в сети) и «Активность» (аптайм, ТЗ)
// показывают реальное состояние, а не то, что было при последнем поиске.
const prisma = require('./db');
const driver = require('./drivers');
const { broadcast } = require('./ws');
const { refreshIps } = require('./devicesync');

const PERIOD_MS = 30000;        // раз в полминуты
const REFRESH_EVERY_MS = 120000; // молчащие устройства переискиваем по MAC не чаще раза в 2 минуты
let lastRefresh = 0;
let running = false;

async function pollOnce() {
  const devices = await prisma.device.findMany();
  if (!devices.length) return;

  // быстрая параллельная проверка связи
  let alive = await Promise.all(devices.map((d) => driver.probe(d).catch(() => false)));

  // кто-то молчит: адрес мог смениться (autoip) — один общий перепоиск и повторная проверка
  if (alive.some((a) => !a) && Date.now() - lastRefresh > REFRESH_EVERY_MS) {
    lastRefresh = Date.now();
    try { await refreshIps(); } catch { /* сеть недоступна — просто отметим «не в сети» */ }
    const fresh = await prisma.device.findMany();
    for (let i = 0; i < devices.length; i++) {
      const f = fresh.find((x) => x.id === devices[i].id);
      if (f) devices[i] = f;
    }
    alive = await Promise.all(devices.map((d, i) => (alive[i] ? true : driver.probe(d).catch(() => false))));
  }

  let changed = false;
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    let online = alive[i];
    let uptimeSec = 0;
    if (online) {
      try {
        const st = await driver.getStatus(d);
        online = st.online;
        uptimeSec = st.uptimeSec || 0;
      } catch { online = false; }
    }
    if (d.online !== online || Math.abs((d.uptimeSec || 0) - uptimeSec) >= 60) {
      await prisma.device.update({ where: { id: d.id }, data: { online, uptimeSec } });
      changed = true;
    }
  }
  if (changed) broadcast('devices', await prisma.device.findMany());
}

function start() {
  const tick = async () => {
    if (running) return;
    running = true;
    try { await pollOnce(); }
    catch (e) { console.warn('опрос устройств:', e.message); }
    finally { running = false; }
  };
  setTimeout(tick, 5000);
  setInterval(tick, PERIOD_MS);
}

module.exports = { start, pollOnce };
