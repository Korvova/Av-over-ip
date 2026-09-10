// Периодический опрос устройств — «Статус» и «Активность» (ТЗ) показывают реальное
// состояние, а список сам следит за сетью: новые устройства появляются в «Найденных»,
// пропавшие из «Найденных» уходят, устройства системы отмечаются «не в сети N мин».
const prisma = require('./db');
const driver = require('./drivers');
const { broadcast } = require('./ws');
const { refreshIps } = require('./devicesync');

const PERIOD_MS = 30000;          // опрос раз в полминуты
const DISCOVER_EVERY_MS = 300000; // полный поиск по сети раз в 5 минут (и сразу, если кто-то замолчал)
const FORGET_FOUND_MS = 600000;   // найденное, но не добавленное устройство, молчащее 10 минут — забываем
let lastDiscover = 0;
let running = false;

async function pollOnce({ discover = false } = {}) {
  let devices = await prisma.device.findMany();
  let alive = await Promise.all(devices.map((d) => driver.probe(d).catch(() => false)));

  // полный поиск: по расписанию, по запросу страницы или когда кто-то замолчал
  // (адрес autoip мог смениться — найдём по MAC; заодно подхватим новые устройства)
  const due = Date.now() - lastDiscover > DISCOVER_EVERY_MS;
  if (discover || due || alive.some((a) => !a)) {
    if (discover || due || Date.now() - lastDiscover > 120000) {
      lastDiscover = Date.now();
      try { await refreshIps(); } catch { /* сеть недоступна — отметим «не в сети» */ }
      devices = await prisma.device.findMany();
      alive = await Promise.all(devices.map((d) => driver.probe(d).catch(() => false)));
    }
  }

  let changed = false;
  const now = new Date();
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
    // найденное, но не добавленное устройство давно молчит — его уже нет, убираем из списка
    if (!online && !d.inSystem) {
      const seen = d.lastSeen || d.createdAt;
      if (now - seen > FORGET_FOUND_MS) {
        await prisma.device.delete({ where: { id: d.id } }).catch(() => {});
        changed = true;
        continue;
      }
    }
    const data = {};
    if (d.online !== online) data.online = online;
    if (Math.abs((d.uptimeSec || 0) - uptimeSec) >= 60) data.uptimeSec = uptimeSec;
    if (online && (!d.lastSeen || now - d.lastSeen > 60000)) data.lastSeen = now;
    if (Object.keys(data).length) {
      await prisma.device.update({ where: { id: d.id }, data });
      changed = true;
    }
  }
  if (changed) broadcast('devices', await prisma.device.findMany());
  return changed;
}

/** Внеочередной опрос (страница «Элементы системы» открыта/обновлена) */
async function pollNow(opts) {
  if (running) return false;
  running = true;
  try { return await pollOnce(opts); }
  catch (e) { console.warn('опрос устройств:', e.message); return false; }
  finally { running = false; }
}

function start() {
  setTimeout(() => pollNow({ discover: true }), 5000);
  setInterval(() => pollNow(), PERIOD_MS);
}

module.exports = { start, pollNow };
