import { Player, Monster, MONSTER_DEFS } from './entities';
import { InputManager } from './input';
import type { InputState } from './input';
import type { DamageNumber, Particle, GameStateSnapshot, MapId } from './types';
import { buildPlatforms, buildMonsters, WORLD_W, GROUND_Y } from './map';
import { render } from './renderer';
import { rectsOverlap } from './physics';
import TimerWorker from './timerWorker?worker';

export interface EngineCallbacks {
  onStatsChange: (stats: import('./entities').Player['stats']) => void;
  onLevelUp: () => void;
  onGameState?: (snap: GameStateSnapshot) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input = new InputManager();
  private rafId = 0;
  private worker: InstanceType<typeof TimerWorker> | null = null;
  private running = false;

  private player: Player;
  private monsters: Monster[];
  private platforms = buildPlatforms();
  private damageNums: DamageNumber[] = [];
  private particles: Particle[] = [];
  private cameraX = 0;
  private mapId: MapId = 'dungeon';
  private callbacks: EngineCallbacks;
  private frameCount = 0;

  private autoMode = false;
  private autoStuckTimer = 0;
  private autoLastX = 0;

  // Monster respawn queue
  private deadMonsters: Array<{ m: Monster; timer: number }> = [];

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.player = new Player(100, GROUND_Y - 48);
    this.monsters = buildMonsters(this.platforms);
  }

  start() {
    this.running = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    this.startForeground();
  }

  setMap(id: MapId) { this.mapId = id; }

  toggleAuto(): boolean {
    this.autoMode = !this.autoMode;
    if (this.autoMode) {
      this.autoStuckTimer = 0;
      this.autoLastX = this.player.x;
    }
    return this.autoMode;
  }

  loadStats(stats: import('./types').GameStats) {
    Object.assign(this.player.stats, stats);
  }

  getStats(): import('./types').GameStats {
    return { ...this.player.stats };
  }

  stop() {
    this.running = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    cancelAnimationFrame(this.rafId);
    this.worker?.terminate();
    this.worker = null;
  }

  private startForeground() {
    this.worker?.terminate();
    this.worker = null;
    this.rafLoop();
  }

  private startBackground() {
    cancelAnimationFrame(this.rafId);
    this.worker = new TimerWorker();
    this.worker.onmessage = () => { if (this.running) this.update(); };
  }

  private onVisibility = () => {
    if (document.hidden) this.startBackground();
    else this.startForeground();
  };

  private rafLoop = () => {
    if (!this.running) return;
    this.update();
    this.draw();
    this.rafId = requestAnimationFrame(this.rafLoop);
  };

  // ── 자동사냥 AI 입력 계산 ──────────────────────────────────────────────────
  private computeAutoInput(): InputState {
    const alive = this.monsters.filter(m => m.state !== 'dead' && m.hp > 0);
    const p = this.player;

    const empty: InputState = {
      left: false, right: false, jump: false, attack: false,
      jumpPressed: false, attackPressed: false,
    };

    // 막힘 감지: 90프레임마다 위치 변화 확인 → 거의 안 움직였으면 점프로 탈출
    this.autoStuckTimer++;
    let forceJump = false;
    if (this.autoStuckTimer >= 90) {
      if (alive.length > 0 && p.onGround && Math.abs(p.x - this.autoLastX) < 6) {
        forceJump = true;
      }
      this.autoLastX = p.x;
      this.autoStuckTimer = 0;
    }

    if (alive.length === 0) return empty;

    const px = p.x + p.w / 2;

    // 가장 가까운 몬스터 (Y 거리 가중치 2배 → 같은 층 우선)
    const target = alive.reduce((best, m) => {
      const score = (e: Monster) =>
        Math.abs(e.x + e.w / 2 - px) + Math.abs(e.y - p.y) * 2;
      return score(m) < score(best) ? m : best;
    });

    const tx = target.x + target.w / 2;
    const dx = tx - px;
    const dy = target.y - p.y; // 음수 = 위쪽

    const ATTACK_RANGE = 85;
    const inRange = Math.abs(dx) < ATTACK_RANGE && Math.abs(dy) < 80;

    return {
      left:          !inRange && dx < -15,
      right:         !inRange && dx > 15,
      jump:          false,
      attack:        false,
      attackPressed: inRange,
      jumpPressed:   forceJump || (p.onGround && dy < -50),
    };
  }

  private update() {
    const input = this.autoMode ? this.computeAutoInput() : this.input.snapshot();
    const { player, platforms, monsters } = this;

    player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
    player.update(input, platforms);
    this.callbacks.onStatsChange({ ...player.stats });

    for (const m of monsters) {
      m.update(platforms);
      if (m.state === 'dead') continue;

      if (player.isAttacking()) {
        const ar = player.attackRect();
        if (rectsOverlap(ar, { x: m.x, y: m.y, w: m.w, h: m.h })) {
          m.takeDamage(player.stats.atk, this.damageNums, this.particles, player.facing);
          if (m.hp <= 0) {
            player.stats.gold += m.def.gold;
            const leveled = player.addExp(m.def.exp);
            player.stats.totalKills++;
            if (leveled) this.callbacks.onLevelUp();
            this.deadMonsters.push({ m, timer: 300 });
          }
        }
      }
    }

    for (const entry of this.deadMonsters) {
      entry.timer--;
      if (entry.timer <= 0) {
        entry.m.hp = entry.m.maxHp;
        entry.m.state = 'patrol';
        entry.m.invincible = 60;
      }
    }
    this.deadMonsters = this.deadMonsters.filter(e => e.timer > 0);

    for (const dn of this.damageNums) dn.life--;
    this.damageNums = this.damageNums.filter(d => d.life > 0);

    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.2;
      p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    const cw = this.canvas.width;
    const camTarget = player.centerX - cw / 2;
    this.cameraX += (camTarget - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(WORLD_W - cw, this.cameraX));

    this.frameCount++;
    if (this.callbacks.onGameState && this.frameCount % 3 === 0) {
      this.callbacks.onGameState({
        player: {
          x: player.x, y: player.y, w: player.w, h: player.h,
          facing: player.facing, state: player.state,
          animFrame: player.animFrame, hitFlash: player.hitFlash,
          speechBubbleTimer: player.speechBubbleTimer,
          stats: { ...player.stats },
        },
        monsters: this.monsters.map(m => ({
          x: m.x, y: m.y, w: m.w, h: m.h,
          facing: m.facing, state: m.state,
          hp: m.hp, maxHp: m.maxHp,
          defIdx: MONSTER_DEFS.indexOf(m.def),
          hitTimer: m.hitTimer,
        })),
        cameraX: this.cameraX,
        particles: [],
        damageNums: [],
        canvasW: this.canvas.width,
        canvasH: this.canvas.height,
        mapId: this.mapId,
        autoMode: this.autoMode,
      });
    }
  }

  private draw() {
    render(
      this.ctx,
      this.canvas.width, this.canvas.height,
      this.player,
      this.monsters,
      this.platforms,
      this.damageNums,
      this.particles,
      this.cameraX,
      this.mapId,
    );
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
  }
}
