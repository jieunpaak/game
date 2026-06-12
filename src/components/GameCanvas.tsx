import { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';
import type { Player } from '../game/entities';

interface Props {
  onStatsChange: (stats: Player['stats']) => void;
  onLevelUp: () => void;
}

export function GameCanvas({ onStatsChange, onLevelUp }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, { onStatsChange, onLevelUp });

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
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
