// Страница «Пользователи» (ТЗ разд. VI): пароли, пресеты
const express = require('express');
const prisma = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();

// GET /api/users — список (без паролей)
router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, login: true, role: true, displayName: true },
  });
  res.json(users);
});

// POST /api/users/:id/password { password } — установка входного пароля
router.post('/:id/password', requireAdmin, async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'Пароль не короче 4 символов' });
  }
  await prisma.user.update({
    where: { id: Number(req.params.id) },
    data: { password: String(password) },
  });
  res.json({ ok: true });
});

// GET /api/users/presets — пресеты текущего пользователя
router.get('/presets', requireAuth, async (req, res) => {
  res.json(await prisma.preset.findMany({ where: { userId: req.session.userId } }));
});

// POST /api/users/presets { name, routes } — сохранить пресет
router.post('/presets', requireAuth, async (req, res) => {
  const { name, routes } = req.body || {};
  const preset = await prisma.preset.create({
    data: { userId: req.session.userId, name: String(name || 'Пресет'), routes: routes || [] },
  });
  res.json(preset);
});

// DELETE /api/users/presets/:id
router.delete('/presets/:id', requireAuth, async (req, res) => {
  await prisma.preset.deleteMany({
    where: { id: Number(req.params.id), userId: req.session.userId },
  });
  res.json({ ok: true });
});

// GET /api/users/all-presets — все пресеты всех пользователей (ТЗ разд. VI, только админ)
router.get('/all-presets', requireAdmin, async (_req, res) => {
  res.json(await prisma.preset.findMany({ include: { user: { select: { displayName: true } } } }));
});

// GET /api/users/ui-layout — раскладка «Интерфейса пользователя» текущего пользователя
router.get('/ui-layout', requireAuth, async (req, res) => {
  const layout = await prisma.uiLayout.findUnique({ where: { userId: req.session.userId } });
  res.json(layout ? layout.pages : []);
});

// PUT /api/users/ui-layout { pages } — сохранить раскладку (только Админ; ТЗ п. 1.13)
router.put('/ui-layout', requireAdmin, async (req, res) => {
  const pages = req.body && req.body.pages;
  if (!Array.isArray(pages)) return res.status(400).json({ error: 'Ожидается { pages: [...] }' });
  // Админ может сохранить раскладку конкретному пользователю (?userId=), иначе — себе
  let targetId = req.session.userId;
  if (req.query.userId) targetId = Number(req.query.userId);
  const layout = await prisma.uiLayout.upsert({
    where: { userId: targetId },
    update: { pages },
    create: { userId: targetId, pages },
  });
  res.json(layout);
});

module.exports = router;
