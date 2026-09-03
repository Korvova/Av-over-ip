// Страница «Видео-стена» (ТЗ разд. V). Максимум 9 видеостен.
// Стена «подготовлена» (создана, декодеры привязаны) и «включена» (active): только
// включённая стена переводит свои декодеры в режим стены и забирает их из матрицы.
const express = require('express');
const prisma = require('../db');
const driver = require('../drivers');
const { broadcast } = require('../ws');
const { requireAuth, requireAdmin } = require('../auth');
const { withFreshIp } = require('../devicesync');

const router = express.Router();
const MAX_WALLS = 9;
const WALL_INCLUDE = { panels: true, presets: true };

const allWalls = () => prisma.videoWall.findMany({ include: WALL_INCLUDE });
async function pushWalls() { broadcast('walls', await allWalls()); }
async function pushRouting() { broadcast('routing', await prisma.route.findMany()); }
const wallWithDecoders = (id) => prisma.videoWall.findUnique({
  where: { id: Number(id) },
  include: { panels: { include: { decoder: true } } },
});

/** Отметить режим видеовыхода в настройках декодера — панель настроек его показывает */
async function markMode(decoder, mode) {
  await prisma.device.update({
    where: { id: decoder.id },
    data: { settings: { ...(decoder.settings || {}), outputMode: mode } },
  });
}

async function saveRoute(decoderId, encoderId) {
  await prisma.route.upsert({
    where: { signal_decoderId: { signal: 'video', decoderId } },
    update: { encoderId, follow: false },
    create: { signal: 'video', decoderId, encoderId, follow: false },
  });
}

/** Панель в режим стены: коммутация на общий источник стены (если задан) + вырез своей области */
async function panelToWall(wall, panel) {
  if (!panel.decoder) return;
  if (wall.spanEncoderId != null) {
    const enc = await prisma.device.findUnique({ where: { id: wall.spanEncoderId } });
    if (enc) {
      await withFreshIp(panel.decoder, (dec) => driver.route('video', enc, dec));
      await saveRoute(panel.decoder.id, enc.id);
    }
  }
  await withFreshIp(panel.decoder, (dec) => driver.wallApply(dec, {
    rows: wall.rows, cols: wall.cols, row: panel.row, col: panel.col, bezel: wall.bezel,
  }));
  await markMode(panel.decoder, 'wall');
}

/** Панель в режим «Матрица»: полный кадр того источника, что подан */
async function panelToMatrix(panel) {
  if (!panel.decoder) return;
  await withFreshIp(panel.decoder, (dec) => driver.wallDisable(dec));
  await markMode(panel.decoder, 'matrix');
}

/** Включить/выключить стену: все её декодеры — в режим стены или обратно в матрицу */
async function setWallActive(wallDbId, active) {
  const wall = await wallWithDecoders(wallDbId);
  if (!wall) return { status: 404, body: { error: 'Видеостена не найдена' } };
  const errors = [];
  for (const panel of wall.panels) {
    try {
      if (active) await panelToWall(wall, panel);
      else await panelToMatrix(panel);
    } catch (e) {
      errors.push(`${panel.decoder ? panel.decoder.name : 'панель'}: ${e.message || e}`);
    }
  }
  await prisma.videoWall.update({ where: { id: wall.id }, data: { active: Boolean(active) } });
  await pushRouting();
  await pushWalls();
  if (errors.length) return { status: 502, body: { error: errors.join('; ') } };
  return { status: 200, body: { ok: true, active: Boolean(active) } };
}

/** Включённая стена, в которой занят декодер (null — декодер свободен для матрицы) */
async function activeWallOf(decoderId) {
  const panel = await prisma.videoWallPanel.findFirst({
    where: { decoderId: Number(decoderId), wall: { active: true } },
    include: { wall: true },
  });
  return panel ? panel.wall : null;
}

/**
 * Подать источник на всю стену (или убрать: encoderId = null): каждой привязанной панели —
 * коммутация видео на энкодер + вырез своей области (Video Wall API v2).
 * Подача источника включает стену — раз ей дали картинку, она используется.
 */
async function applySourceToWall(wallDbId, encoderId) {
  let wall = await wallWithDecoders(wallDbId);
  if (!wall) return { status: 404, body: { error: 'Видеостена не найдена' } };
  const encoder = encoderId == null ? null : await prisma.device.findUnique({ where: { id: Number(encoderId) } });
  if (encoderId != null && (!encoder || encoder.type !== 'ENCODER')) {
    return { status: 400, body: { error: 'Энкодер не найден' } };
  }
  wall = await prisma.videoWall.update({
    where: { id: wall.id },
    data: { spanEncoderId: encoder ? encoder.id : null, active: true },
    include: { panels: { include: { decoder: true } } },
  });

  const errors = [];
  for (const panel of wall.panels) {
    if (!panel.decoder) continue;
    try {
      if (encoder) {
        await panelToWall(wall, panel);
      } else {
        await withFreshIp(panel.decoder, (dec) => driver.route('video', null, dec));
        await saveRoute(panel.decoder.id, null);
      }
    } catch (e) {
      errors.push(`${panel.decoder.name}: ${e.message || e}`);
    }
  }
  await pushRouting();
  await pushWalls();
  if (errors.length) return { status: 502, body: { error: errors.join('; ') } };
  return { status: 200, body: { ok: true, panels: wall.panels.filter((p) => p.decoder).length } };
}

// GET /api/walls
router.get('/', requireAuth, async (_req, res) => {
  res.json(await allWalls());
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
  await pushWalls();
  res.json(wall);
});

// PATCH /api/walls/:id — имя, мониторинг, компенсация рамок
// (новые рамки у включённой стены сразу пересчитываются на декодерах)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, monitoring, bezel } = req.body || {};
  const data = {};
  if (name !== undefined) data.name = name;
  if (monitoring !== undefined) data.monitoring = Boolean(monitoring);
  if (bezel !== undefined) data.bezel = bezel;
  const wall = await prisma.videoWall.update({ where: { id: Number(req.params.id) }, data });
  if (bezel !== undefined && wall.active) {
    const full = await wallWithDecoders(wall.id);
    for (const panel of full.panels) {
      try { await panelToWall(full, panel); }
      catch (e) { console.warn('пересчёт рамок:', e.message); }
    }
  }
  await pushWalls();
  res.json(wall);
});

// DELETE /api/walls/:id — «Удалить видеостену»
// Перед удалением возвращаем все привязанные декодеры в режим «Матрица» (полный кадр),
// иначе они продолжат показывать свой вырез.
router.delete('/:id', requireAdmin, async (req, res) => {
  const wall = await wallWithDecoders(req.params.id);
  if (wall) {
    for (const panel of wall.panels) {
      try { await panelToMatrix(panel); }
      catch (e) { console.warn('wallDisable при удалении стены:', e.message); }
    }
  }
  await prisma.videoWall.delete({ where: { id: Number(req.params.id) } });
  await pushRouting();
  await pushWalls();
  res.json({ ok: true });
});

// POST /api/walls/:id/panel { row, col, decoderId } — привязка декодера к позиции.
// Один декодер МОЖНО привязать к нескольким панелям (решение заказчика):
// физически он покажет команду последней применённой панели, ячейки в UI зеркалятся.
// У включённой стены новый декодер сразу переходит в режим стены, снятый — в матрицу.
router.post('/:id/panel', requireAdmin, async (req, res) => {
  const { row, col, decoderId } = req.body || {};
  const where = { wallId_row_col: { wallId: Number(req.params.id), row: Number(row), col: Number(col) } };
  const before = await prisma.videoWallPanel.findUnique({ where, include: { decoder: true, wall: true } });
  const panel = await prisma.videoWallPanel.update({
    where,
    data: { decoderId: decoderId == null ? null : Number(decoderId) },
    include: { decoder: true, wall: true },
  });
  if (before && before.wall.active && before.decoderId !== panel.decoderId) {
    try {
      if (before.decoder) await panelToMatrix(before);
      if (panel.decoder) await panelToWall(panel.wall, panel);
    } catch (e) {
      console.warn('перепривязка панели:', e.message);
    }
    await pushRouting();
  }
  await pushWalls();
  res.json(panel);
});

// POST /api/walls/:id/activate { active } — «Использовать видеостену» / вернуть декодеры в матрицу
router.post('/:id/activate', requireAuth, async (req, res) => {
  const r = await setWallActive(req.params.id, Boolean(req.body && req.body.active));
  res.status(r.status).json(r.body);
});

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
    await panelToMatrix(panel);
    await withFreshIp(panel.decoder, (dec) => driver.route('video', encoder, dec));
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }
  await saveRoute(panel.decoder.id, encoder ? encoder.id : null);
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
  await pushRouting();
  await pushWalls();
  res.json({ ok: true });
});

// POST /api/walls/:id/apply { encoderId|null } — подать источник на всю стену (drag&drop, рис.3)
router.post('/:id/apply', requireAuth, async (req, res) => {
  const r = await applySourceToWall(req.params.id, (req.body || {}).encoderId);
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
  await pushWalls();
  res.json(preset);
});

// DELETE /api/walls/presets/:pid
router.delete('/presets/:pid', requireAuth, async (req, res) => {
  await prisma.wallPreset.delete({ where: { id: Number(req.params.pid) } }).catch(() => {});
  await pushWalls();
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

// POST /api/walls/:id/disable — вернуть все декодеры стены в режим «Матрица» (то же, что выключить)
router.post('/:id/disable', requireAdmin, async (req, res) => {
  const r = await setWallActive(req.params.id, false);
  res.status(r.status).json(r.body);
});

router.helpers = { activeWallOf, panelToWall, panelToMatrix, setWallActive };
module.exports = router;
