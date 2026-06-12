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

const wss         = new WebSocketServer({ server, path: '/ws/chat' });
const clients     = new Set();
const clientNames = new Map(); // ws → username

function broadcast(msg, exclude) {
  const str = typeof msg === 'string' ? msg : JSON.stringify(msg);
  for (const c of clients) {
    if (c !== exclude && c.readyState === 1) c.send(str);
  }
}

function sysMsg(text) {
  return {
    type: 'chat',
    payload: {
      id:     Math.random().toString(36).slice(2),
      user:   'SYSTEM',
      text,
      ts:     Date.now(),
      system: true,
    },
  };
}

wss.on('connection', ws => {
  clients.add(ws);

  ws.on('message', raw => {
    const msg = raw.toString();
    let parsed = {};
    try { parsed = JSON.parse(msg); } catch { /* ignore */ }

    if (parsed.type === 'join') {
      const user = parsed.payload?.user ?? '알 수 없음';
      clientNames.set(ws, user);
      broadcast(sysMsg(`${user}님이 입장했습니다 👋`));
    } else if (parsed.type === 'game_state') {
      broadcast(msg, ws); // 발신자 제외
    } else {
      broadcast(msg);     // 채팅 등 전체
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    const user = clientNames.get(ws);
    clientNames.delete(ws);
    if (user) broadcast(sysMsg(`${user}님이 퇴장했습니다`));
  });
});

server.listen(PORT, () => console.log(`Game server on :${PORT}`));
