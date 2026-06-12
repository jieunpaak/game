import { useState, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { Chat } from './components/Chat';
import type { Player } from './game/entities';

const INITIAL_STATS: Player['stats'] = {
  level: 1, exp: 0, expToNext: 20,
  hp: 100, maxHp: 100,
  atk: 12, def: 3,
  gold: 0, totalKills: 0,
};

function App() {
  const [stats, setStats] = useState<Player['stats']>(INITIAL_STATS);
  const [levelUpFlash, setLevelUpFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStatsChange = useCallback((s: Player['stats']) => {
    setStats(s);
  }, []);

  const handleLevelUp = useCallback(() => {
    setLevelUpFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setLevelUpFlash(false), 1500);
  }, []);

  return (
    <div className="app">
      <div className="canvas-wrap">
        <GameCanvas onStatsChange={handleStatsChange} onLevelUp={handleLevelUp} />
        <HUD stats={stats} levelUpFlash={levelUpFlash} />
        <Chat />
      </div>
    </div>
  );
}

export default App;
