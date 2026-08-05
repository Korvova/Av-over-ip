// Страница «Видео-стена» (ТЗ разд. V). Максимум 9 видеостен.
const express = require('express');
const prisma = require('../db');
const driver = require('../drivers');
const { broadcast } = require('../ws');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
const MAX_WALLS = 9;

// GET /api/walls
router.get('/', requireAuth, async (_req, res) => {
  res.json(await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
});

// POST /api/walls { wallId, name, rows, cols }
router.post('/', requireAdmin, async (req, res) => {
  const count = await prisma.videoWall.count();
  if (count >= MAX_WALLS) return res.status(400).json({ error: 'Максимум 9 видеостен (ТЗ)' });
  const { wallId, name, rows, cols } = req.body || {};
  const wall = await prisma.videoWall.create({
    data: {
      wallId: Number(wallId),
      name: String(name || `Видеостена ${wallId}`),
      rows: Number(rows),
      cols: Number(cols),
      // пустые панели под каждую позицию
      panels: {
        create: Array.from({ length: Number(rows) * Number(cols) }, (_, i) => ({
          row: Math.floor(i / Number(cols)),
          col: i % Number(cols),
        })),
      },
    },
    include: { panels: true },
  });
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json(wall);
});

// PATCH /api/walls/:id — имя, мониторинг, компенсация рамок
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, monitoring, bezel } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = name;
  if (monitoring !== undefined) data.monitoring = Boolean(monitoring);
  if (bezel !== undefined) data.bezel = bezel;
  const wall = await prisma.videoWall.update({ where: { id: Number(req.params.id) }, data });
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json(wall);
});

// DELETE /api/walls/:id — «Удалить видеостену»
// Перед удалением возвращаем все привязанные декодеры в режим «Матрица» (полный кадр),
// иначе они продолжат показывать свой вырез.
router.delete('/:id', requireAdmin, async (req, res) => {
  const wall = await prisma.videoWall.findUnique({
    where: { id: Number(req.params.id) },
    include: { panels: { include: { decoder: true } } },
  });
  if (wall) {
    for (const panel of wall.panels) {
      if (!panel.decoder) continue;
      try { await driver.wallDisable(panel.decoder); }
      catch (e) { console.warn('wallDisable при удалении стены:', e.message); }
    }
  }
  await prisma.videoWall.delete({ where: { id: Number(req.params.id) } });
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json({ ok: true });
});

// POST /api/walls/:id/panel { row, col, decoderId } — привязка декодера к позиции.
// Один декодер = один физический экран, поэтому при привязке к новой панели
// он автоматически отвязывается от всех остальных панелей (любых стен).
router.post('/:id/panel', requireAdmin, async (req, res) => {
  const { row, col, decoderId } = req.body || {};
  if (decoderId != null) {
    await prisma.videoWallPanel.updateMany({
      where: { decoderId: Number(decoderId) },
      data: { decoderId: null },
    });
  }
  const panel = await prisma.videoWallPanel.update({
    where: {
      wallId_row_col: { wallId: Number(req.params.id), row: Number(row), col: Number(col) },
    },
    data: { decoderId: decoderId == null ? null : Number(decoderId) },
  });
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json(panel);
});

/** Подать источник на всю стену: каждой привязанной панели — коммутация видео
 *  на энкодер + вырез своей области (Video Wall API v2). */
async function applySourceToWall(wallDbId, encoderId) {
  const wall = await prisma.videoWall.findUnique({
    where: { id: Number(wallDbId) },
    include: { panels: { include: { decoder: true } } },
  });
  if (!wall) return { status: 404, body: { error: 'Видеостена не найдена' } };
  const encoder = await prisma.device.findUnique({ where: { id: Number(encoderId) } });
  if (!encoder || encoder.type !== 'ENCODER') {
    return { status: 400, body: { error: 'Энкодер не найден' } };
  }

  const errors = [];
  for (const panel of wall.panels) {
    if (!panel.decoder) continue;
    try {
      await driver.route('video', encoder, panel.decoder);
      await driver.wallApply(panel.decoder, {
        rows: wall.rows,
        cols: wall.cols,
        row: panel.row,
        col: panel.col,
        bezel: wall.bezel,
      });
      await prisma.route.upsert({
        where: { signal_decoderId: { signal: 'video', decoderId: panel.decoder.id } },
        update: { encoderId: encoder.id, follow: false },
        create: { signal: 'video', decoderId: panel.decoder.id, encoderId: encoder.id, follow: false },
      });
    } catch (e) {
      errors.push(`${panel.decoder.name}: ${e.message || e}`);
    }
  }
  await prisma.videoWall.update({ where: { id: wall.id }, data: { spanEncoderId: encoder.id } });
  broadcast('routing', await prisma.route.findMany());
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  if (errors.length) return { status: 502, body: { error: errors.join('; ') } };
  return { status: 200, body: { ok: true, panels: wall.panels.filter((p) => p.decoder).length } };
}

// POST /api/walls/:id/panel-source { row, col, encoderId|null } —
// источник на ОДНУ панель (полный кадр на её декодере) или очистка панели (encoderId=null).
router.post('/:id/panel-source', requireAuth, async (req, res) => {
  const { row, col, encoderId } = req.body || {};
  const panel = await prisma.videoWallPanel.findUnique({
    where: { wallId_row_col: { wallId: Number(req.params.id), row: Number(row), col: Number(col) } },
    include: { decoder: true },
  });
  if (!panel) return res.status(404).json({ error: 'Панель не найдена' });
  if (!panel.decoder) return res.status(400).json({ error: 'К панели не привязан декодер' });

  const encoder = encoderId == null
    ? null
    : await prisma.device.findUnique({ where: { id: Number(encoderId) } });
  if (encoderId != null && (!encoder || encoder.type !== 'ENCODER')) {
    return res.status(400).json({ error: 'Энкодер не найден' });
  }

  try {
    // панель выходит из режима «кусок стены»: полный кадр нового источника или пусто
    await driver.wallDisable(panel.decoder);
    await driver.route('video', encoder, panel.decoder);
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
  await prisma.route.upsert({
    where: { signal_decoderId: { signal: 'video', decoderId: panel.decoder.id } },
    update: { encoderId: encoder ? encoder.id : null, follow: false },
    create: { signal: 'video', decoderId: panel.decoder.id, encoderId: encoder ? encoder.id : null, follow: false },
  });
  // если span-источник больше не растянут ни на одну панель — сбрасываем его у стены
  const wall = await prisma.videoWall.findUnique({
    where: { id: panel.wallId },
    include: { panels: true },
  });
  if (wall && wall.spanEncoderId != null) {
    const routes = await prisma.route.findMany({ where: { signal: 'video' } });
    const stillSpan = wall.panels.some((p) =>
      p.decoderId != null && p.id !== panel.id &&
      routes.some((r) => r.decoderId === p.decoderId && r.encoderId === wall.spanEncoderId));
    if (!stillSpan) {
      await prisma.videoWall.update({ where: { id: wall.id }, data: { spanEncoderId: null } });
    }
  }
  broadcast('routing', await prisma.route.findMany());
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json({ ok: true });
});

// POST /api/walls/:id/apply { encoderId } — подать источник на всю стену (drag&drop, рис.3)
router.post('/:id/apply', requireAuth, async (req, res) => {
  const r = await applySourceToWall(req.params.id, req.body.encoderId);
  res.status(r.status).json(r.body);
});

// POST /api/walls/:id/presets { name, class, encoderId } — сохранить пресет стены (ТЗ: таблица пресетов)
router.post('/:id/presets', requireAuth, async (req, res) => {
  const { name, class: cls, encoderId } = req.body || {};
  const preset = await prisma.wallPreset.create({
    data: {
      wallId: Number(req.params.id),
      name: String(name || 'Пресет'),
      class: String(cls || 'A'),
      layout: { encoderId: encoderId ?? null },
    },
  });
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json(preset);
});

// DELETE /api/walls/presets/:pid
router.delete('/presets/:pid', requireAuth, async (req, res) => {
  await prisma.wallPreset.delete({ where: { id: Number(req.params.pid) } }).catch(() => {});
  broadcast('walls', await prisma.videoWall.findMany({ include: { panels: true, presets: true } }));
  res.json({ ok: true });
});

// POST /api/walls/presets/:pid/apply — вызвать пресет (подать сохранённый источник на стену)
router.post('/presets/:pid/apply', requireAuth, async (req, res) => {
  const preset = await prisma.wallPreset.findUnique({ where: { id: Number(req.params.pid) } });
  if (!preset) return res.status(404).json({ error: 'Пресет не найден' });
  const encoderId = preset.layout && preset.layout.encoderId;
  if (encoderId == null) return res.status(400).json({ error: 'В пресете нет источника' });
  const r = await applySourceToWall(preset.wallId, encoderId);
  res.status(r.status).json(r.body);
});

// POST /api/walls/:id/disable — вернуть все декодеры стены в режим «Матрица»
router.post('/:id/disable', requireAdmin, async (req, res) => {
  const wall = await prisma.videoWall.findUnique({
    where: { id: Number(req.params.id) },
    include: { panels: { include: { decoder: true } } },
  });
  if (!wall) return res.status(404).json({ error: 'Видеостена не найдена' });
  for (const panel of wall.panels) {
    if (!panel.decoder) continue;
    try { await driver.wallDisable(panel.decoder); }
    catch (e) { console.warn('wallDisable:', e.message); }
  }
  res.json({ ok: true });
});

module.exports = router;
