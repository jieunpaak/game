import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/engine';
import type { Player } from '../game/entities';
import type { GameStateSnapshot, MapId } from '../game/types';
import { MAP_IDS, MAP_NAMES } from '../game/map';
import { wsManager } from '../game/wsManager';

interface Props {
  onStatsChange: (stats: Player['stats']) => void;
  onLevelUp: () => void;
}

export function GameCanvas({ onStatsChange, onLevelUp }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const engineRef  = useRef<GameEngine | null>(null);
  const [mapId, setMapId] = useState<MapId>('dungeon');

  const switchMap = useCallback(() => {
    const next = MAP_IDS[(MAP_IDS.indexOf(mapId) + 1) % MAP_IDS.length];
    setMapId(next);
    engineRef.current?.setMap(next);
  }, [mapId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onGameState = (snap: GameStateSnapshot) => {
      wsManager.send('game_state', snap);
    };

    const engine = new GameEngine(canvas, { onStatsChange, onLevelUp, onGameState });

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
      <button className="map-switch-btn" onClick={switchMap}>
        {MAP_NAMES[mapId]}
      </button>
    </>
  );
}
