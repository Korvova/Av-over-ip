// MJPEG-превью и снапшоты устройств (ТЗ п. 1.10, рис.1 и рис.3).
// Браузер клиента живёт в сети управления и НЕ видит видео LAN,
// поэтому ПУ проксирует потоки: <img src="/api/preview/:id/stream?token=...">
const express = require('express');
const http = require('http');
const prisma = require('../db');
const driver = require('../drivers');
const { requireAuth } = require('../auth');

const router = express.Router();

function proxy(url, res) {
  const req = http.get(url, { timeout: 5000 }, (upstream) => {
    res.status(upstream.statusCode || 200);
    if (upstream.headers['content-type']) {
      res.setHeader('Content-Type', upstream.headers['content-type']);
    }
    upstream.pipe(res);
  });
  req.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'Устройство недоступно' });
  });
  req.on('timeout', () => req.destroy());
  // клиент закрыл вкладку — рвём соединение с устройством
  res.on('close', () => req.destroy());
}

// GET /api/preview/:id/stream — живой MJPEG (для иконок источников/потребителей)
router.get('/:id/stream', requireAuth, async (req, res) => {
  const device = await prisma.device.findUnique({ where: { id: Number(req.params.id) } });
  if (!device) return res.status(404).json({ error: 'Устройство не найдено' });
  const url = driver.previewUrl(device, {
    w: Number(req.query.w) || 320,
    h: Number(req.query.h) || 180,
    fps: Number(req.query.fps) || 10,
  });
  if (url.startsWith('https://')) return res.redirect(url); // mock-плейсхолдер
  proxy(url, res);
});

// GET /api/preview/:id/snapshot — один кадр JPEG
router.get('/:id/snapshot', requireAuth, async (req, res) => {
  const device = await prisma.device.findUnique({ where: { id: Number(req.params.id) } });
  if (!device) return res.status(404).json({ error: 'Устройство не найдено' });
  const url = driver.snapshotUrl(device, {
    w: Number(req.query.w) || 640,
    h: Number(req.query.h) || 360,
    q: Number(req.query.q) || 60,
  });
  if (url.startsWith('https://')) return res.redirect(url);
  proxy(url, res);
});

module.exports = router;
