import { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Monster, MONSTER_DEFS } from '../game/entities';
import { InputManager } from '../game/input';
import type { InputState } from '../game/input';
import { buildPlatforms, buildMonsters, WORLD_W, GROUND_Y } from '../game/map';
import { render } from '../game/renderer';
import { rectsOverlap } from '../game/physics';
import { wsManager } from '../game/wsManager';
import type { GameStateSnapshot, GameStats, RemotePlayerState, DamageNumber, Particle } from '../game/types';

interface Props {
  username: string;
  onStatsChange: (stats: GameStats) => void;
  onLevelUp: () => void;
}

interface AutoTarget { x: number; y: number; w: number; h: number; state: string; hp: number; }

function computeAutoInput(
  player: Player,
  monsters: AutoTarget[],
  stuckRef: { timer: number; lastX: number },
): InputState {
  const empty: InputState = {
    left: false, right: false, jump: false, attack: false,
    jumpPressed: false, attackPressed: false,
  };

  const alive = monsters.filter(m => m.state !== 'dead' && m.hp > 0);

  stuckRef.timer++;
  let forceJump = false;
  if (stuckRef.timer >= 90) {
    if (alive.length > 0 && player.onGround && Math.abs(player.x - stuckRef.lastX) < 6) forceJump = true;
    stuckRef.lastX = player.x;
    stuckRef.timer = 0;
  }

  if (alive.length === 0) return empty;

  const px = player.x + player.w / 2;
  const target = alive.reduce((best, m) => {
    const score = (e: AutoTarget) => Math.abs(e.x + e.w / 2 - px) + Math.abs(e.y - player.y) * 2;
    return score(m) < score(best) ? m : best;
  });

  const dx = (target.x + target.w / 2) - px;
  const dy = target.y - player.y;
  const inRange = Math.abs(dx) < 85 && Math.abs(dy) < 80;

  return {
    left:          !inRange && dx < -15,
    right:         !inRange && dx > 15,
    jump:          false,
    attack:        false,
    attackPressed: inRange,
    jumpPressed:   forceJump || (player.onGround && dy < -50),
  };
}

const SAVE_INTERVAL_MS = 10_000;

export function GuestCanvas({ username, onStatsChange, onLevelUp }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const autoModeRef = useRef(false);
  const [autoMode, setAutoMode] = useState(false);

  const toggleAuto = useCallback(() => {
    autoModeRef.current = !autoModeRef.current;
    setAutoMode(autoModeRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const platforms     = buildPlatforms();
    const input         = new InputManager();
    const player        = new Player(200, GROUND_Y - 48);
    const stuckRef      = { timer: 0, lastX: 200 };
    let   cameraX       = 0;
    let   rafId         = 0;
    let   hostSnap: GameStateSnapshot | null = null;
    let   lastSaveTime  = Date.now();

    // 솔로 모드용 로컬 몬스터
    const localMonsters = buildMonsters(platforms);
    const deadQueue: { m: Monster; timer: number }[] = [];
    const damageNums: DamageNumber[] = [];
    const particles: Particle[] = [];

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    const unsubLoad = wsManager.on<GameStats>('load_stats', stats => {
      Object.assign(player.stats, stats);
      onStatsChange({ ...player.stats });
    });

    const unsubKill = wsManager.on<{ exp: number; gold: number }>('mob_kill', ({ exp, gold }) => {
      player.stats.gold += gold;
      const leveled = player.addExp(exp);
      player.stats.totalKills++;
      if (leveled) onLevelUp();
      onStatsChange({ ...player.stats });
      wsManager.send('save_stats', { ...player.stats });
    });

    const unsubSnap = wsManager.on<GameStateSnapshot>('game_state', snap => {
      hostSnap = snap;
    });

    const loop = () => {
      rafId = requestAnimationFrame(loop);

      const monsters: AutoTarget[] = hostSnap ? hostSnap.monsters : localMonsters;
      const inp = autoModeRef.current
        ? computeAutoInput(player, monsters, stuckRef)
        : input.snapshot();

      player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
      player.update(inp, platforms);

      const targetCam = player.centerX - canvas.width / 2;
      cameraX += (Math.max(0, Math.min(WORLD_W - canvas.width, targetCam)) - cameraX) * 0.1;

      const atkRect = player.isAttacking() ? player.attackRect() : null;

      wsManager.send('remote_player', {
        id: username,
        x: player.x, y: player.y, w: player.w, h: player.h,
        facing: player.facing,
        state: player.state,
        animFrame: player.animFrame,
        hitFlash: player.hitFlash,
        speechBubbleTimer: player.speechBubbleTimer,
        atk: player.stats.atk,
        atkRect,
      } satisfies RemotePlayerState);

      if (!hostSnap) {
        // ── 솔로 모드 ──
        for (const m of localMonsters) {
          m.update(platforms);
          if (m.state === 'dead') continue;
          if (atkRect && rectsOverlap(atkRect, { x: m.x, y: m.y, w: m.w, h: m.h })) {
            m.takeDamage(player.stats.atk, damageNums, particles, player.facing);
            if (m.hp <= 0) {
              player.stats.gold += m.def.gold;
              const leveled = player.addExp(m.def.exp);
              player.stats.totalKills++;
              if (leveled) onLevelUp();
              deadQueue.push({ m, timer: 300 });
            }
          }
        }

        for (const entry of deadQueue) entry.timer--;
        const done = deadQueue.filter(e => e.timer <= 0);
        for (const { m } of done) { m.hp = m.maxHp; m.state = 'patrol'; m.invincible = 60; }
        deadQueue.splice(0, deadQueue.length, ...deadQueue.filter(e => e.timer > 0));

        for (const dn of damageNums) dn.life--;
        damageNums.splice(0, damageNums.length, ...damageNums.filter(d => d.life > 0));
        for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; }
        particles.splice(0, particles.length, ...particles.filter(p => p.life > 0));

        const now = Date.now();
        if (now - lastSaveTime >= SAVE_INTERVAL_MS) {
          lastSaveTime = now;
          wsManager.send('save_stats', { ...player.stats });
        }

        onStatsChange({ ...player.stats });
        render(ctx, canvas.width, canvas.height, player, localMonsters, platforms, damageNums, particles, cameraX, 'dungeon', []);
      } else {
        // ── 멀티 모드 (방장 있음) ──
        onStatsChange({ ...player.stats });

        const renderMonsters = hostSnap.monsters.map(m => ({
          ...m,
          def: MONSTER_DEFS[m.defIdx] ?? MONSTER_DEFS[0],
        }));

        const hostAsRemote: RemotePlayerState = {
          id: '방장',
          x: hostSnap.player.x, y: hostSnap.player.y,
          w: hostSnap.player.w, h: hostSnap.player.h,
          facing: hostSnap.player.facing,
          state: hostSnap.player.state,
          animFrame: hostSnap.player.animFrame,
          hitFlash: hostSnap.player.hitFlash,
          speechBubbleTimer: hostSnap.player.speechBubbleTimer,
          atk: hostSnap.player.stats.atk,
          atkRect: null,
        };

        const otherGuests = (hostSnap.otherPlayers ?? []).filter(p => p.id !== username);

        render(
          ctx, canvas.width, canvas.height,
          player, renderMonsters, platforms,
          [], [],
          cameraX,
          hostSnap.mapId ?? 'dungeon',
          [hostAsRemote, ...otherGuests],
        );
      }
    };

    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      unsubLoad();
      unsubKill();
      unsubSnap();
    };
  }, [username, onStatsChange, onLevelUp]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      <div className="host-controls">
        <button
          className={`host-btn${autoMode ? ' auto-active' : ''}`}
          onClick={toggleAuto}
        >
          ⚔️ 자동사냥 {autoMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </>
  );
}
