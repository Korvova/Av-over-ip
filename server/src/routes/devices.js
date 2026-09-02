// Страница «Элементы системы»: списки, поиск, добавление в систему (ТЗ разд. III)
const express = require('express');
const prisma = require('../db');
const driver = require('../drivers');
const { broadcast } = require('../ws');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/devices — все устройства (добавленные и найденные)
router.get('/', requireAuth, async (_req, res) => {
  const devices = await prisma.device.findMany({
    orderBy: [{ type: 'asc' }, { deviceId: 'asc' }],
    include: { routesAsDecoder: true },
  });
  res.json(devices);
});

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

// POST /api/devices/discover — «Поиск новых устройств»
router.post('/discover', requireAdmin, async (_req, res) => {
  // известные IP как seed: hdn900-драйвер запускает node_query через любое живое устройство
  const known = await prisma.device.findMany({ select: { ip: true } });
  let found;
  try {
    found = await driver.discover(known.map((d) => d.ip));
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
  const added = await saveFound(found);
  res.json({ found: found.length, added });
});

// POST /api/devices/add-by-ip { ip } — ручное добавление по известному адресу.
// Достаточно одного устройства: через него опрашивается вся сеть.
router.post('/add-by-ip', requireAdmin, async (req, res) => {
  const ip = String((req.body && req.body.ip) || '').trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    return res.status(400).json({ error: 'Укажите корректный IP-адрес устройства' });
  }
  let found;
  try {
    found = await driver.probeByIp(ip);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
  const added = await saveFound(found);
  res.json({ found: found.length, added });
});

// POST /api/devices/add-all — «Добавить все найденные устройства в систему»
router.post('/add-all', requireAdmin, async (_req, res) => {
  const pending = await prisma.device.findMany({ where: { inSystem: false } });
  await prisma.device.updateMany({ where: { inSystem: false }, data: { inSystem: true } });
  // каналы всем новым энкодерам
  for (const d of pending.filter((d) => d.type === 'ENCODER')) {
    try { await driver.assignChannel(d); }
    catch (e) { console.warn('assignChannel:', e.message); }
  }
  const devices = await prisma.device.findMany();
  broadcast('devices', devices);
  res.json({ ok: true });
});

// GET /api/devices/multicast — в каком режиме вещания устройства системы.
// Без многоадресного режима энкодер отдаёт поток лишь ОДНОМУ декодеру: на стене
// картинку видит только один экран, остальные перехватывают её друг у друга.
router.get('/multicast', requireAdmin, async (_req, res) => {
  const devices = await prisma.device.findMany({ where: { inSystem: true } });
  const items = [];
  for (const d of devices) {
    let on = null; // null — устройство не ответило
    try { on = await driver.getMulticast(d); } catch { /* недоступно */ }
    items.push({ id: d.id, name: d.name, ip: d.ip, multicast: on });
  }
  res.json({
    total: items.length,
    off: items.filter((i) => i.multicast === false).length,
    items,
  });
});

// POST /api/devices/multicast — включить многоадресный режим на всех устройствах.
// Устройства при этом перезагружаются — иначе режим не применяется.
router.post('/multicast', requireAdmin, async (_req, res) => {
  const devices = await prisma.device.findMany({ where: { inSystem: true } });
  const errors = [];
  let changed = 0;
  for (const d of devices) {
    try {
      if (await driver.getMulticast(d)) continue; // уже включён
      await driver.enableMulticast(d);
      changed++;
    } catch (e) {
      errors.push(`${d.name}: ${e.message || e}`);
    }
  }
  res.json({ changed, total: devices.length, errors });
});

// POST /api/devices/:id/add — добавить одно устройство в систему (галка)
router.post('/:id/add', requireAdmin, async (req, res) => {
  const device = await prisma.device.update({
    where: { id: Number(req.params.id) },
    data: { inSystem: true },
  });
  // энкодеру назначаем канал = его deviceId (ch_select у HDN-EA900)
  if (device.type === 'ENCODER') {
    try { await driver.assignChannel(device); }
    catch (e) { console.warn('assignChannel:', e.message); }
  }
  broadcast('devices', await prisma.device.findMany());
  res.json(device);
});

// PATCH /api/devices/:id — имя (<=16 симв.), ID, настройки
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, deviceId, settings } = req.body || {};
  const data = {};
  if (name !== undefined) {
    if (!/^[A-Za-zА-Яа-я0-9]{1,16}$/.test(name)) {
      return res.status(400).json({ error: 'Имя: до 16 символов, буквы и цифры' });
    }
    data.name = name;
  }
  if (deviceId !== undefined) data.deviceId = Number(deviceId);
  if (settings !== undefined) data.settings = settings;
  try {
    const device = await prisma.device.update({ where: { id: Number(req.params.id) }, data });
    broadcast('devices', await prisma.device.findMany());
    res.json(device);
  } catch (e) {
    res.status(400).json({ error: 'Не удалось обновить (ID занят?)' });
  }
});

// DELETE /api/devices/:id — удаление устройства из системы
router.delete('/:id', requireAdmin, async (req, res) => {
  await prisma.device.delete({ where: { id: Number(req.params.id) } });
  broadcast('devices', await prisma.device.findMany());
  res.json({ ok: true });
});

// DELETE /api/devices?type=ENCODER — удаление всех энкодеров/декодеров
router.delete('/', requireAdmin, async (req, res) => {
  const type = req.query.type;
  if (type !== 'ENCODER' && type !== 'DECODER') {
    return res.status(400).json({ error: 'Укажите type=ENCODER или type=DECODER' });
  }
  await prisma.device.deleteMany({ where: { type } });
  broadcast('devices', await prisma.device.findMany());
  res.json({ ok: true });
});

module.exports = router;
