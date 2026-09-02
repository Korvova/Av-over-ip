// Страница «Коммутация»: матрицы Видео/Аудио/USB + независимые ИК/RS-232/CEC (ТЗ разд. IV)
const express = require('express');
const prisma = require('../db');
const driver = require('../drivers');
const { broadcast } = require('../ws');
const { requireAuth } = require('../auth');
const { withFreshIp } = require('../devicesync');

const router = express.Router();

const SIGNALS = ['video', 'audio', 'usb', 'ir', 'rs232', 'cec'];

// GET /api/routing — все маршруты
router.get('/', requireAuth, async (_req, res) => {
  res.json(await prisma.route.findMany());
});

// POST /api/routing { signal, decoderId, encoderId|null }
router.post('/', requireAuth, async (req, res) => {
  const { signal, decoderId, encoderId } = req.body || {};
  if (!SIGNALS.includes(signal)) return res.status(400).json({ error: 'Неверный тип сигнала' });

  const decoder = await prisma.device.findUnique({ where: { id: Number(decoderId) } });
  const encoder = encoderId != null
    ? await prisma.device.findUnique({ where: { id: Number(encoderId) } })
    : null;
  if (!decoder || decoder.type !== 'DECODER') return res.status(400).json({ error: 'Декодер не найден' });
  if (encoderId != null && (!encoder || encoder.type !== 'ENCODER')) {
    return res.status(400).json({ error: 'Энкодер не найден' });
  }

  try {
    await withFreshIp(decoder, (dec) => driver.route(signal, encoder, dec));
  } catch (e) {
    return res.status(502).json({ error: String(e.message || e) });
  }

  // ТЗ: USB — только точка-точка. Отбираем энкодер у других декодеров.
  if (signal === 'usb' && encoder) {
    const others = await prisma.route.findMany({
      where: { signal: 'usb', encoderId: encoder.id, NOT: { decoderId: decoder.id } },
      include: { decoder: true },
    });
    for (const r of others) {
      try { await withFreshIp(r.decoder, (dec) => driver.route('usb', null, dec)); }
      catch (e) { console.warn('usb unroute:', e.message); }
    }
    await prisma.route.deleteMany({
      where: { signal: 'usb', encoderId: encoder.id, NOT: { decoderId: decoder.id } },
    });
  }

  const route = await prisma.route.upsert({
    where: { signal_decoderId: { signal, decoderId: decoder.id } },
    update: { encoderId: encoder ? encoder.id : null, follow: false },
    create: { signal, decoderId: decoder.id, encoderId: encoder ? encoder.id : null, follow: false },
  });
  broadcast('routing', await prisma.route.findMany());
  res.json(route);
});

// POST /api/routing/all-decoders { signal, encoderId } — «На все декодеры»
router.post('/all-decoders', requireAuth, async (req, res) => {
  const { signal, encoderId } = req.body || {};
  if (!['video', 'audio'].includes(signal)) {
    return res.status(400).json({ error: 'USB — только точка-точка (ТЗ)' });
  }
  const encoder = await prisma.device.findUnique({ where: { id: Number(encoderId) } });
  if (!encoder || encoder.type !== 'ENCODER') return res.status(400).json({ error: 'Энкодер не найден' });

  const decoders = await prisma.device.findMany({ where: { type: 'DECODER', inSystem: true } });
  for (const decoder of decoders) {
    try {
      await withFreshIp(decoder, (dec) => driver.route(signal, encoder, dec));
      await prisma.route.upsert({
        where: { signal_decoderId: { signal, decoderId: decoder.id } },
        update: { encoderId: encoder.id, follow: false },
        create: { signal, decoderId: decoder.id, encoderId: encoder.id, follow: false },
      });
    } catch (e) {
      return res.status(502).json({ error: `${decoder.name}: ${e.message || e}` });
    }
  }
  broadcast('routing', await prisma.route.findMany());
  res.json({ ok: true, count: decoders.length });
});

module.exports = router;
