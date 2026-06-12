const http = require('http');
const path = require('path');
const fs   = require('fs');
const { WebSocketServer } = require('ws');

const PORT      = 3000;
const DIST      = path.resolve(__dirname, '../dist');
const SAVES_DIR = path.resolve(__dirname, '../data');
const SAVES_FILE = path.join(SAVES_DIR, 'saves.json');

function loadSaves() {
  try { return JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8')); }
  catch { return {}; }
}

function writeSaves(saves) {
  fs.mkdirSync(SAVES_DIR, { recursive: true });
  fs.writeFileSync(SAVES_FILE, JSON.stringify(saves, null, 2));
}

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
const clientInfo  = new Map(); // ws → { user, role }
const guestStates = new Map(); // username → last remote_player state

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
      id: Math.random().toString(36).slice(2),
      user: 'SYSTEM', text, ts: Date.now(), system: true,
    },
  };
}

function broadcastUserList() {
  const list = [...clientInfo.values()];
  broadcast({ type: 'user_list', payload: list });
}

wss.on('connection', ws => {
  clients.add(ws);

  ws.on('message', raw => {
    const msg = raw.toString();
    let parsed = {};
    try { parsed = JSON.parse(msg); } catch { /* ignore */ }

    if (parsed.type === 'join') {
      const user = parsed.payload?.user ?? '알 수 없음';
      const role = parsed.payload?.role ?? 'guest';
      // 중복 닉네임 차단
      const duplicate = [...clientInfo.values()].some(info => info.user === user);
      if (duplicate) {
        ws.send(JSON.stringify({ type: 'join_error', payload: { message: '이미 접속 중인 닉네임이에요' } }));
        ws.close();
        return;
      }
      clientInfo.set(ws, { user, role });
      broadcast(sysMsg(`${user}님이 입장했습니다 👋`));
      broadcastUserList();
      // 모든 유저에게 저장된 스탯 전송
      const saves = loadSaves();
      if (saves[user]) {
        ws.send(JSON.stringify({ type: 'load_stats', payload: saves[user] }));
      }
      // 방장 재접속 시 캐시된 게스트 상태 즉시 전송
      if (role === 'host') {
        for (const state of guestStates.values()) {
          ws.send(JSON.stringify({ type: 'remote_player', payload: state }));
        }
      }
    } else if (parsed.type === 'save_stats') {
      const info = clientInfo.get(ws);
      if (info) {
        const saves = loadSaves();
        saves[info.user] = parsed.payload;
        writeSaves(saves);
      }
    } else if (parsed.type === 'remote_player') {
      // 게스트 상태 캐시 + 호스트로 중계
      const info = clientInfo.get(ws);
      if (info) {
        const state = { ...parsed.payload, id: info.user };
        guestStates.set(info.user, state);
        const hostEntry = [...clientInfo.entries()].find(([, v]) => v.role === 'host');
        if (hostEntry) {
          const [hostWs] = hostEntry;
          if (hostWs.readyState === 1) {
            hostWs.send(JSON.stringify({ type: 'remote_player', payload: state }));
          }
        }
      }
    } else if (parsed.type === 'mob_kill') {
      // 호스트 → 특정 게스트에게 킬 보상 전달
      const { targetId, exp, gold } = parsed.payload ?? {};
      for (const [c, info] of clientInfo.entries()) {
        if (info.user === targetId && c.readyState === 1) {
          c.send(JSON.stringify({ type: 'mob_kill', payload: { exp, gold } }));
          break;
        }
      }
    } else if (parsed.type === 'game_state') {
      broadcast(msg, ws);
    } else {
      broadcast(msg);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    const info = clientInfo.get(ws);
    clientInfo.delete(ws);
    if (info) {
      if (info.role === 'guest') guestStates.delete(info.user);
      broadcast(sysMsg(`${info.user}님이 퇴장했습니다`));
      broadcastUserList();
    }
  });
});

server.listen(PORT, () => console.log(`Game server on :${PORT}`));
