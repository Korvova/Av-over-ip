// WebSocket-хаб: рассылка живых обновлений всем подключённым клиентам
const { WebSocketServer } = require('ws');

let wss = null;

function init(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'hello' }));
  });
}

/**
 * Разослать событие всем клиентам.
 * type: 'devices' | 'routing' | 'walls' | 'presets' | 'platform' ...
 */
function broadcast(type, payload) {
  if (!wss) return;
  const data = JSON.stringify({ type, payload });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

module.exports = { init, broadcast };
