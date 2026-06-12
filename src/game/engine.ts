import { Player, Monster, MONSTER_DEFS } from './entities';
import { InputManager } from './input';
import type { DamageNumber, Particle, GameStateSnapshot } from './types';
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
  private callbacks: EngineCallbacks;
  private frameCount = 0;

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

  stop() {
    this.running = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    cancelAnimationFrame(this.rafId);
    this.worker?.terminate();
    this.worker = null;
  }

  // 화면이 보일 때: rAF (update+draw 한 번에, 60fps 스무스)
  private startForeground() {
    this.worker?.terminate();
    this.worker = null;
    this.rafLoop();
  }

  // 화면이 숨겨질 때: Worker (update만, throttle 없음)
  private startBackground() {
    cancelAnimationFrame(this.rafId);
    this.worker = new TimerWorker();
    this.worker.onmessage = () => { if (this.running) this.update(); };
  }

  private onVisibility = () => {
    if (document.hidden) {
      this.startBackground();
    } else {
      this.startForeground();
    }
  };

  private rafLoop = () => {
    if (!this.running) return;
    this.update();
    this.draw();
    this.rafId = requestAnimationFrame(this.rafLoop);
  };

  private update() {
    const input = this.input.snapshot();
    const { player, platforms, monsters } = this;

    // Player clamp to world
    player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));

    player.update(input, platforms);
    this.callbacks.onStatsChange({ ...player.stats });

    // Monsters
    for (const m of monsters) {
      m.update(platforms);

      if (m.state === 'dead') continue;

      // Player attacks monster
      if (player.isAttacking()) {
        const ar = player.attackRect();
        if (rectsOverlap(ar, { x: m.x, y: m.y, w: m.w, h: m.h })) {
          m.takeDamage(player.stats.atk, this.damageNums, this.particles, player.facing);
          if (m.hp <= 0) {
            player.stats.gold += m.def.gold;
            const leveled = player.addExp(m.def.exp);
            player.stats.totalKills++;
            if (leveled) this.callbacks.onLevelUp();
            this.deadMonsters.push({ m, timer: 300 }); // 5s respawn
          }
        }
      }

      // Monster attacks player (disabled)
    }

    // Respawn dead monsters
    for (const entry of this.deadMonsters) {
      entry.timer--;
      if (entry.timer <= 0) {
        entry.m.hp = entry.m.maxHp;
        entry.m.state = 'patrol';
        entry.m.invincible = 60;
      }
    }
    this.deadMonsters = this.deadMonsters.filter(e => e.timer > 0);

    // Update damage numbers
    for (const dn of this.damageNums) dn.life--;
    this.damageNums = this.damageNums.filter(d => d.life > 0);

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.2;
      p.life--;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Camera: follow player
    const cw = this.canvas.width;
    const target = player.centerX - cw / 2;
    this.cameraX += (target - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(WORLD_W - cw, this.cameraX));

    // Broadcast game state every 3 frames (~20fps)
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
        particles: this.particles.map(p => ({ ...p })),
        damageNums: this.damageNums.map(d => ({ ...d })),
        canvasW: this.canvas.width,
        canvasH: this.canvas.height,
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
    );
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
  }
}
