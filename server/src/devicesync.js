// Синхронизация списка устройств с сетью: занести найденные, обновить адреса.
// В автоматическом режиме (169.254.x.x) устройство после перезагрузки, как правило,
// получает ДРУГОЙ адрес — платформа находит его заново по MAC и продолжает работать.
const prisma = require('./db');
const driver = require('./drivers');
const { broadcast } = require('./ws');

/** Занести найденные устройства в БД: автоназначение ID и имён TX-NNN / RX-NNN (ТЗ) */
async function saveFound(found) {
  let added = 0;
  for (const d of found) {
    const exists = await prisma.device.findUnique({ where: { mac: d.mac } });
    if (exists) {
      // устройство знакомо, но могло сменить адрес — обновляем
      if (exists.ip !== d.ip) {
        await prisma.device.update({ where: { id: exists.id }, data: { ip: d.ip, online: true } });
      }
      continue;
    }
    const count = await prisma.device.count({ where: { type: d.type } });
    const num = count + 1;
    await prisma.device.create({
      data: {
        type: d.type,
        deviceId: num,
        name: (d.type === 'ENCODER' ? 'TX' : 'RX') + num,
        mac: d.mac,
        ip: d.ip,
        firmware: d.firmware || null,
        online: true,
        inSystem: false,
      },
    });
    added++;
  }
  broadcast('devices', await prisma.device.findMany());
  return added;
}

let inflight = null;
let lastDone = 0;
const REUSE_MS = 20000; // свежий результат поиска не повторяем

/** Найти устройства заново и обновить их адреса по MAC. Параллельные вызовы делят один поиск. */
function refreshIps() {
  if (inflight) return inflight;
  if (Date.now() - lastDone < REUSE_MS) return Promise.resolve([]);
  inflight = (async () => {
    const known = await prisma.device.findMany({ select: { ip: true } });
    const found = await driver.discover(known.map((d) => d.ip));
    await saveFound(found);
    lastDone = Date.now();
    return found;
  })().finally(() => { inflight = null; });
  return inflight;
}

const UNREACHABLE = /EHOSTUNREACH|ENETUNREACH|ETIMEDOUT|ECONNREFUSED|таймаут/i;

/**
 * Выполнить операцию с устройством. Если оно не отвечает по своему адресу —
 * переискать его по MAC и повторить с новым адресом.
 */
async function withFreshIp(device, fn) {
  try {
    return await fn(device);
  } catch (e) {
    if (!UNREACHABLE.test(String((e && e.message) || e))) throw e;
    try { await refreshIps(); } catch { throw e; }
    const fresh = await prisma.device.findUnique({ where: { id: device.id } });
    if (!fresh || fresh.ip === device.ip) throw e;
    return fn(fresh);
  }
}

/**
 * Список устройств с актуальными адресами: быстро проверяем все параллельно,
 * и если хоть одно молчит — один общий перепоиск, а не по три секунды на каждое.
 */
async function freshDevices(where = {}) {
  let devices = await prisma.device.findMany({ where });
  const alive = await Promise.all(devices.map((d) => driver.probe(d).catch(() => false)));
  if (alive.every(Boolean)) return devices;
  try { await refreshIps(); } catch (e) { console.warn('refreshIps:', e.message); }
  devices = await prisma.device.findMany({ where });
  return devices;
}

module.exports = { saveFound, refreshIps, withFreshIp, freshDevices };
