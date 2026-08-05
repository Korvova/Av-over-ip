// Страница «Настройка платформы управления»: конфигурации, сеть ПУ, мастер (ТЗ разд. II.3, VIII)
const express = require('express');
const prisma = require('../db');
const { broadcast } = require('../ws');
const { requireAdmin } = require('../auth');

const router = express.Router();

const { versionInfo, checkUpdates, runUpdate, updateStatus } = require('../version');

// GET /api/platform — все настройки ПУ
router.get('/', requireAdmin, async (_req, res) => {
  const rows = await prisma.platformSetting.findMany();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

// GET /api/platform/version — текущая версия (сборка/коммит/дата)
router.get('/version', requireAdmin, (_req, res) => {
  res.json(versionInfo());
});

// GET /api/platform/update/check — есть ли новая версия в GitHub
router.get('/update/check', requireAdmin, (_req, res) => {
  try {
    res.json(checkUpdates());
  } catch (e) {
    res.status(502).json({ error: 'Не удалось проверить обновления: ' + (e.message || e) });
  }
});

// POST /api/platform/update — самообновление из git + перезапуск
router.post('/update', requireAdmin, (_req, res) => {
  try {
    res.json(runUpdate());
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// GET /api/platform/update/status — ход обновления (хвост лога)
router.get('/update/status', requireAdmin, (_req, res) => {
  res.json(updateStatus());
});

// PUT /api/platform/:key — установить настройку (videoLanMode, firstRun, masterSlave...)
// Тело: {"value": ...} — сохраняется value; иначе сохраняется всё тело.
router.put('/:key', requireAdmin, async (req, res) => {
  const value = req.body && Object.prototype.hasOwnProperty.call(req.body, 'value')
    ? req.body.value
    : req.body;
  const row = await prisma.platformSetting.upsert({
    where: { key: req.params.key },
    update: { value },
    create: { key: req.params.key, value },
  });
  broadcast('platform', { [row.key]: row.value });
  res.json(row);
});

// GET /api/platform/config/export — сохранить конфигурацию системы в файл
router.get('/config/export', requireAdmin, async (_req, res) => {
  const [devices, routes, walls, users, settings] = await Promise.all([
    prisma.device.findMany(),
    prisma.route.findMany(),
    prisma.videoWall.findMany({ include: { panels: true, presets: true } }),
    prisma.user.findMany(),
    prisma.platformSetting.findMany(),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="av-over-ip-config.json"');
  res.json({ version: 1, exportedAt: new Date().toISOString(), devices, routes, walls, users, settings });
});

// POST /api/platform/config/import — загрузить конфигурацию из файла
router.post('/config/import', requireAdmin, async (req, res) => {
  const cfg = req.body;
  if (!cfg || cfg.version !== 1) return res.status(400).json({ error: 'Неверный файл конфигурации' });
  // Полная замена состояния системы
  await prisma.$transaction([
    prisma.route.deleteMany(),
    prisma.videoWall.deleteMany(),
    prisma.device.deleteMany(),
  ]);
  for (const d of cfg.devices || []) {
    const { id, createdAt, updatedAt, ...data } = d;
    await prisma.device.create({ data });
  }
  // TODO: восстановление маршрутов/стен по новым id устройств (нужен маппинг по MAC)
  broadcast('platform', { imported: true });
  res.json({ ok: true, devices: (cfg.devices || []).length });
});

module.exports = router;
