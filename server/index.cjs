const http = require('http');
const path = require('path');
const fs   = require('fs');
const { WebSocketServer } = require('ws');

const PORT = 3000;
const DIST = path.resolve(__dirname, '../dist');

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.css':   'text/css',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
};

const server = http.createServer((req, res) => {
  const url      = req.url.split('?')[0];
  let   filePath = path.join(DIST, url);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const ct  = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
});

const wss     = new WebSocketServer({ server, path: '/ws/chat' });
const clients = new Set();

wss.on('connection', ws => {
  clients.add(ws);
  ws.on('message', raw => {
    const msg = raw.toString();
    let type = '';
    try { type = JSON.parse(msg).type; } catch { /* ignore */ }

    if (type === 'game_state') {
      // 방장 → 게스트에게만 전달 (발신자 제외)
      for (const c of clients) {
        if (c !== ws && c.readyState === 1) c.send(msg);
      }
    } else {
      // 채팅 등 → 전체 브로드캐스트
      for (const c of clients) {
        if (c.readyState === 1) c.send(msg);
      }
    }
  });
  ws.on('close', () => clients.delete(ws));
});

server.listen(PORT, () => console.log(`Game server on :${PORT}`));
