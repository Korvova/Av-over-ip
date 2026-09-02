// Вход/выход, уровни доступа (ТЗ п. II.1)
const express = require('express');
const prisma = require('../db');
const { createSession, destroySession, requireAuth } = require('../auth');

const router = express.Router();

// POST /api/auth/login { login, password }
router.post('/login', async (req, res) => {
  const { login, password } = req.body || {};
  const user = await prisma.user.findUnique({ where: { login: String(login || '') } });
  if (!user || user.password !== String(password || '')) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  const firstRunRow = await prisma.platformSetting.findUnique({ where: { key: 'firstRun' } });
  const firstRun = firstRunRow ? firstRunRow.value === true : true;
  // ТЗ п. II.3: при первом запуске вход только для Администратора
  if (firstRun && user.role !== 'ADMIN') {
    return res.status(403).json({
      error: 'Первый запуск: вход доступен только Администратору. Выполните первичную настройку.',
    });
  }
  const token = await createSession(user);
  res.json({
    token,
    user: { id: user.id, login: user.login, role: user.role, displayName: user.displayName },
    firstRun,
  });
});

// POST /api/auth/password { password } — смена собственного пароля (мастер первого запуска)
router.post('/password', requireAuth, async (req, res) => {
  const { password } = req.body || {};
  if (!password || String(password).length < 4) {
    return res.status(400).json({ error: 'Пароль не короче 4 символов' });
  }
  await prisma.user.update({
    where: { id: req.session.userId },
    data: { password: String(password) },
  });
  res.json({ ok: true });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  await destroySession(token);
  res.json({ ok: true });
});

// GET /api/auth/me — кто вошёл (восстановление сессии после перезагрузки страницы)
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.session.userId } });
  if (!user) return res.status(401).json({ error: 'Требуется вход в систему' });
  const firstRunRow = await prisma.platformSetting.findUnique({ where: { key: 'firstRun' } });
  res.json({
    user: { id: user.id, login: user.login, role: user.role, displayName: user.displayName },
    firstRun: firstRunRow ? firstRunRow.value === true : true,
  });
});

module.exports = router;
