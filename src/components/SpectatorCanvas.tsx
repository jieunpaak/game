import { useEffect, useRef } from 'react';
import type { GameStateSnapshot } from '../game/types';
import type { GameStats } from '../game/types';
import { MONSTER_DEFS } from '../game/entities';
import { buildPlatforms, WORLD_W } from '../game/map';
import { render } from '../game/renderer';
import { wsManager } from '../game/wsManager';

interface Props {
  onStatsChange: (stats: GameStats) => void;
}

export function SpectatorCanvas({ onStatsChange }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const snapRef    = useRef<GameStateSnapshot | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const platforms = buildPlatforms();
    let rafId = 0;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const snap = snapRef.current;

      if (!snap) {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#555';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('방장 접속을 기다리는 중...', canvas.width / 2, canvas.height / 2);
        return;
      }

      const monsters = snap.monsters.map(m => ({
        ...m,
        def: MONSTER_DEFS[m.defIdx] ?? MONSTER_DEFS[0],
      }));

      // 게스트 화면 너비 기준으로 카메라 재계산 (방장과 해상도가 달라도 캐릭터 중앙 유지)
      const playerCenterX = snap.player.x + snap.player.w / 2;
      const localCameraX = Math.max(0, Math.min(WORLD_W - canvas.width, playerCenterX - canvas.width / 2));

      render(ctx, canvas.width, canvas.height, snap.player, monsters, platforms, snap.damageNums, snap.particles, localCameraX);
    };

    loop();

    const unsub = wsManager.on<GameStateSnapshot>('game_state', snap => {
      snapRef.current = snap;
      onStatsChange({ ...snap.player.stats });
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      unsub();
    };
  }, [onStatsChange]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
