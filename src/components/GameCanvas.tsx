import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/engine';
import type { Player } from '../game/entities';
import type { GameStateSnapshot, MapId, GameStats, RemotePlayerState } from '../game/types';
import { MAP_IDS, MAP_NAMES } from '../game/map';
import { wsManager } from '../game/wsManager';

const SAVE_INTERVAL_MS = 10_000; // 10초마다 자동 저장

interface Props {
  onStatsChange: (stats: Player['stats']) => void;
  onLevelUp: () => void;
}

export function GameCanvas({ onStatsChange, onLevelUp }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const engineRef    = useRef<GameEngine | null>(null);
  const lastSaveRef  = useRef<number>(Date.now());
  const [mapId,    setMapId]    = useState<MapId>('dungeon');
  const [autoMode, setAutoMode] = useState(false);

  const switchMap = useCallback(() => {
    const next = MAP_IDS[(MAP_IDS.indexOf(mapId) + 1) % MAP_IDS.length];
    setMapId(next);
    engineRef.current?.setMap(next);
  }, [mapId]);

  const toggleAuto = useCallback(() => {
    const next = engineRef.current?.toggleAuto() ?? false;
    setAutoMode(next);
  }, []);

  // load_stats 수신 → 엔진에 적용
  useEffect(() => {
    const unsub = wsManager.on<GameStats>('load_stats', stats => {
      engineRef.current?.loadStats(stats);
    });
    return () => { unsub(); };
  }, []);

  // 게스트 위치 수신 → 엔진에 전달
  useEffect(() => {
    const unsub = wsManager.on<RemotePlayerState>('remote_player', state => {
      engineRef.current?.updateRemotePlayer(state);
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onGameState = (snap: GameStateSnapshot) => {
      wsManager.send('game_state', snap);
    };

    const handleStatsChange = (stats: Player['stats']) => {
      onStatsChange(stats);
      // 10초 throttle 자동 저장
      const now = Date.now();
      if (now - lastSaveRef.current >= SAVE_INTERVAL_MS) {
        lastSaveRef.current = now;
        wsManager.send('save_stats', stats);
      }
    };

    const handleLevelUp = () => {
      onLevelUp();
      // 레벨업은 즉시 저장
      const stats = engineRef.current?.getStats();
      if (stats) wsManager.send('save_stats', stats);
      lastSaveRef.current = Date.now();
    };

    const engine = new GameEngine(canvas, {
      onStatsChange: handleStatsChange,
      onLevelUp: handleLevelUp,
      onGameState,
      onRemoteKill: (targetId, exp, gold) => {
        wsManager.send('mob_kill', { targetId, exp, gold });
      },
    });

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      engine.resize(rect.width, rect.height);
    };

    resize();
    engine.start();
    engineRef.current = engine;

    window.addEventListener('resize', resize);
    return () => {
      engine.stop();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <div className="host-controls">
        <button className="host-btn" onClick={switchMap}>
          {MAP_NAMES[mapId]}
        </button>
        <button className={`host-btn${autoMode ? ' auto-active' : ''}`} onClick={toggleAuto}>
          ⚔️ 자동사냥 {autoMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </>
  );
}
