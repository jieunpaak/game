import { useState, useCallback, useRef, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GuestCanvas } from './components/GuestCanvas';
import { HUD } from './components/HUD';
import { Chat } from './components/Chat';
import { Login, type Role } from './components/Login';
import { UserList } from './components/UserList';
import type { Player } from './game/entities';
import { wsManager } from './game/wsManager';

const STORAGE_USERNAME = 'chat_username';
const STORAGE_ROLE     = 'chat_role';
const storage = sessionStorage;

const INITIAL_STATS: Player['stats'] = {
  level: 1, exp: 0, expToNext: 20,
  hp: 100, maxHp: 100,
  atk: 12, def: 3,
  gold: 0, totalKills: 0,
};

function App() {
  const [username, setUsername] = useState(() => storage.getItem(STORAGE_USERNAME) ?? '');
  const [role,     setRole]     = useState<Role | null>(() => (storage.getItem(STORAGE_ROLE) as Role) ?? null);
  const [stats,       setStats]       = useState<Player['stats']>(INITIAL_STATS);
  const [levelUpFlash, setLevelUpFlash] = useState(false);
  const [joinError,    setJoinError]   = useState('');
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { wsManager.connect(); }, []);

  useEffect(() => {
    const unsub = wsManager.on<{ message: string }>('join_error', ({ message }) => {
      storage.removeItem(STORAGE_ROLE);
      storage.removeItem(STORAGE_USERNAME);
      setRole(null);
      setUsername('');
      setJoinError(message);
    });
    return () => { unsub(); };
  }, []);

  // 로그인 상태일 때 WS가 열리면 join 전송 (재연결 포함)
  useEffect(() => {
    if (!role || !username) return;
    const sendJoin = (s: string) => {
      if (s === 'open') wsManager.send('join', { user: username, role });
    };
    const unsub = wsManager.onConnState(sendJoin);
    if (wsManager.connState === 'open') wsManager.send('join', { user: username, role });
    return () => { unsub(); };
  }, [role, username]);

  const handleLogin = useCallback((name: string, r: Role) => {
    storage.setItem(STORAGE_USERNAME, name);
    storage.setItem(STORAGE_ROLE, r);
    setUsername(name);
    setRole(r);
  }, []);

  const handleLogout = useCallback(() => {
    wsManager.send('leave', { user: username });
    storage.removeItem(STORAGE_ROLE);
    setRole(null);
  }, [username]);

  const handleStatsChange = useCallback((s: Player['stats']) => setStats(s), []);

  const handleLevelUp = useCallback(() => {
    setLevelUpFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setLevelUpFlash(false), 1500);
  }, []);

  if (!role) {
    return <Login onLogin={handleLogin} initialError={joinError} />;
  }

  return (
    <div className="app">
      <div className="canvas-wrap">
        {role === 'host'
          ? <GameCanvas username={username} onStatsChange={handleStatsChange} onLevelUp={handleLevelUp} />
          : <GuestCanvas username={username} onStatsChange={handleStatsChange} onLevelUp={handleLevelUp} />
        }
        <HUD stats={stats} levelUpFlash={levelUpFlash} />
        <button className="logout-btn" onClick={handleLogout} title="로그아웃">
          {username} ✕
        </button>
        <UserList />
        <Chat username={username} />
      </div>
    </div>
  );
}

export default App;
