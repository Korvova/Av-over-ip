// Платформа управления AV-over-IP — точка входа бэкенда
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const prisma = require('./db');
const ws = require('./ws');
const { seed } = require('./seed');

const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, driver: require('./drivers').name }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/control', require('./routes/control'));
app.use('/api/routing', require('./routes/routing'));
app.use('/api/walls', require('./routes/videowalls'));
app.use('/api/users', require('./routes/users'));
app.use('/api/platform', require('./routes/platform'));
app.use('/api/preview', require('./routes/preview'));

// Production: раздаём собранный фронтенд (web/dist) — один порт на всё.
// В разработке фронт крутится отдельно на Vite (5173) и папки dist может не быть.
const path = require('path');
const fs = require('fs');
const distDir = path.join(__dirname, '..', '..', 'web', 'dist');
if (fs.existsSync(distDir)) {
  const express2 = require('express');
  app.use(express2.static(distDir));
  // SPA-fallback: все не-API запросы отдают index.html
  app.get(/^\/(?!api\/|ws).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Единый обработчик ошибок
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const server = http.createServer(app);
ws.init(server);

seed()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`ПУ AV-over-IP: http://localhost:${PORT} (драйвер: ${require('./drivers').name})`);
    });
  })
  .catch((e) => {
    console.error('Ошибка инициализации:', e);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
