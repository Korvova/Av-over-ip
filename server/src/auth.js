// Простые сессии по токену (в памяти) + проверка ролей
const crypto = require('crypto');

const sessions = new Map(); // token -> { userId, login, role }

function createSession(user) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId: user.id, login: user.login, role: user.role });
  return token;
}

function destroySession(token) {
  sessions.delete(token);
}

/** Middleware: требуется любой вошедший пользователь.
 *  Токен — в заголовке Authorization или в ?token= (для <img> с MJPEG-превью). */
function requireAuth(req, res, next) {
  const token =
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
    String(req.query.token || '');
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ error: 'Требуется вход в систему' });
  req.session = session;
  next();
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
