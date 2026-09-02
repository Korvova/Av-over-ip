// Сессии по токену. Хранятся в БД — переживают перезапуск и обновление платформы,
// в памяти только кэш, чтобы не ходить в базу на каждый запрос. Плюс проверка ролей.
const crypto = require('crypto');
const prisma = require('./db');

const cache = new Map(); // token -> { userId, login, role, checkedAt }
const IDLE_DAYS = 30;            // неактивная сессия живёт месяц
const RECHECK_MS = 60 * 60 * 1000; // раз в час сверяем с БД и продлеваем

async function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  await prisma.session.create({ data: { token, userId: user.id } });
  cache.set(token, { userId: user.id, login: user.login, role: user.role, checkedAt: Date.now() });
  return token;
}

async function destroySession(token) {
  cache.delete(token);
  await prisma.session.deleteMany({ where: { token } });
}

/** Сессия по токену: из кэша, иначе из БД (после перезапуска платформы) */
async function findSession(token) {
  if (!token) return null;
  const cached = cache.get(token);
  if (cached && Date.now() - cached.checkedAt < RECHECK_MS) return cached;
  const row = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!row || !row.user) { cache.delete(token); return null; }
  if (Date.now() - row.lastSeen.getTime() > IDLE_DAYS * 86400e3) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    cache.delete(token);
    return null;
  }
  prisma.session.update({ where: { token }, data: { lastSeen: new Date() } }).catch(() => {});
  const session = { userId: row.user.id, login: row.user.login, role: row.user.role, checkedAt: Date.now() };
  cache.set(token, session);
  return session;
}

/** Middleware: требуется любой вошедший пользователь.
 *  Токен — в заголовке Authorization или в ?token= (для <img> с MJPEG-превью). */
function requireAuth(req, res, next) {
  const token =
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
    String(req.query.token || '');
  findSession(token)
    .then((session) => {
      if (!session) return res.status(401).json({ error: 'Требуется вход в систему' });
      req.session = session;
      next();
    })
    .catch(next);
}

/** Middleware: требуется уровень «Администратор» */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.session.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Доступно только Администратору' });
    }
    next();
  });
}

module.exports = { createSession, destroySession, requireAuth, requireAdmin };
