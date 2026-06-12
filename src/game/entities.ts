import type { InputState } from './input';
import { resolveVertical } from './physics';
import type { DamageNumber, GameStats, MonsterState, Particle, Platform, PlayerState } from './types';

const GRAVITY = 0.6;
const JUMP_FORCE = -14;
const MOVE_SPEED = 4;
const ATK_DURATION = 16; // frames
const ATK_COOLDOWN = 24;
const INVINCIBLE_DUR = 45;

export class Player {
  x: number; y: number;
  w = 36; h = 48;
  vx = 0; vy = 0;
  onGround = false;
  facing: 1 | -1 = 1; // 1 = right, -1 = left
  state: PlayerState = 'idle';

  atkTimer = 0;
  atkCooldown = 0;
  invincible = 0;
  hitFlash = 0;
  animFrame = 0;
  speechBubbleTimer = 0;

  stats: GameStats;

  constructor(x: number, y: number) {
    this.x = x; this.y = y;
    this.stats = {
      level: 1, exp: 0, expToNext: 20,
      hp: 100, maxHp: 100,
      atk: 12, def: 3,
      gold: 0, totalKills: 0,
    };
  }

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  attackRect() {
    const reach = 90;
    return this.facing === 1
      ? { x: this.x + this.w, y: this.y + 8, w: reach, h: this.h - 16 }
      : { x: this.x - reach, y: this.y + 8, w: reach, h: this.h - 16 };
  }

  isAttacking() { return this.atkTimer > 0; }

  takeDamage(dmg: number, nums: DamageNumber[], particles: Particle[]) {
    if (this.invincible > 0) return;
    const actual = Math.max(1, dmg - this.stats.def);
    this.stats.hp = Math.max(0, this.stats.hp - actual);
    this.invincible = INVINCIBLE_DUR;
    this.hitFlash = 8;
    nums.push({ x: this.centerX, y: this.y, value: actual, life: 50, maxLife: 50, isPlayer: true });
    spawnParticles(particles, this.centerX, this.centerY, '#e74c3c', 6);
  }

  addExp(amount: number): boolean {
    this.stats.exp += amount;
    if (this.stats.exp >= this.stats.expToNext) {
      this.stats.exp -= this.stats.expToNext;
      this.stats.level++;
      this.stats.expToNext = Math.floor(20 * Math.pow(1.3, this.stats.level - 1));
      this.stats.maxHp += 10;
      this.stats.hp = this.stats.maxHp;
      this.stats.atk += 2;
      this.stats.def += 1;
      return true;
    }
    return false;
  }

  update(input: InputState, platforms: Platform[]) {
    this.animFrame++;
    if (this.atkCooldown > 0) this.atkCooldown--;
    if (this.atkTimer > 0) this.atkTimer--;
    if (this.invincible > 0) this.invincible--;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.speechBubbleTimer > 0) this.speechBubbleTimer--;

    // Attack
    if (input.attackPressed && this.atkCooldown === 0) {
      this.atkTimer = ATK_DURATION;
      this.atkCooldown = ATK_COOLDOWN;
      this.speechBubbleTimer = 50;
      this.state = 'attack';
    }

    if (this.stats.hp <= 0) { this.state = 'dead'; return; }

    // Horizontal movement
    if (!this.isAttacking() || !this.onGround) {
      if (input.left) { this.vx = -MOVE_SPEED; this.facing = -1; }
      else if (input.right) { this.vx = MOVE_SPEED; this.facing = 1; }
      else this.vx = 0;
    } else {
      this.vx = 0;
    }

    this.x += this.vx;

    // Vertical
    if (input.jumpPressed && this.onGround) this.vy = JUMP_FORCE;

    const res = resolveVertical(this, platforms, GRAVITY);
    this.y = res.y; this.vy = res.vy; this.onGround = res.onGround;

    // State
    if (this.isAttacking()) this.state = 'attack';
    else if (!this.onGround) this.state = 'jump';
    else if (this.vx !== 0) this.state = 'walk';
    else this.state = 'idle';
  }
}

// ── Monster ──────────────────────────────────────────────────────────────────

export interface MonsterDef {
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  def: number;
  gold: number;
  exp: number;
  speed: number;
}

export const MONSTER_DEFS: MonsterDef[] = [
  { name: '슬라임', emoji: '🟢', hp: 30, atk: 5, def: 0, gold: 3, exp: 4, speed: 1.0 },
  { name: '버섯', emoji: '🍄', hp: 50, atk: 8, def: 1, gold: 5, exp: 7, speed: 1.2 },
  { name: '고블린', emoji: '👺', hp: 70, atk: 12, def: 2, gold: 8, exp: 10, speed: 1.5 },
  { name: '스켈레톤', emoji: '💀', hp: 100, atk: 16, def: 3, gold: 12, exp: 15, speed: 1.3 },
  { name: '오크', emoji: '🧌', hp: 150, atk: 20, def: 5, gold: 18, exp: 22, speed: 1.0 },
];

const HIT_DURATION = 12;
const MONSTER_INVINCIBLE = 20;

export class Monster {
  x: number; y: number;
  w = 36; h = 44;
  vx = 0; vy = 0;
  onGround = false;
  facing: 1 | -1 = 1;
  state: MonsterState = 'patrol';

  hp: number;
  maxHp: number;
  def: MonsterDef;

  hitTimer = 0;
  invincible = 0;
  knockVx = 0;

  patrolLeft: number;
  patrolRight: number;

  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }

  constructor(x: number, y: number, def: MonsterDef, patrolLeft: number, patrolRight: number) {
    this.x = x; this.y = y;
    this.def = def;
    this.hp = def.hp; this.maxHp = def.hp;
    this.patrolLeft = patrolLeft;
    this.patrolRight = patrolRight;
  }

  takeDamage(dmg: number, nums: DamageNumber[], particles: Particle[], knockDir: 1 | -1) {
    if (this.invincible > 0) return;
    const actual = Math.max(1, dmg - this.def.def);
    this.hp -= actual;
    this.hitTimer = HIT_DURATION;
    this.invincible = MONSTER_INVINCIBLE;
    this.knockVx = knockDir * 5;
    nums.push({ x: this.centerX, y: this.y - 10, value: actual, life: 60, maxLife: 60, isPlayer: false });
    spawnParticles(particles, this.centerX, this.centerY, '#f39c12', 5);
  }

  update(platforms: Platform[]) {
    if (this.state === 'dead') return;
    if (this.hp <= 0) { this.state = 'dead'; return; }

    if (this.hitTimer > 0) this.hitTimer--;
    if (this.invincible > 0) this.invincible--;

    // Knockback
    if (this.knockVx !== 0) {
      this.x += this.knockVx;
      this.knockVx *= 0.7;
      if (Math.abs(this.knockVx) < 0.3) this.knockVx = 0;
    }

    // Patrol
    if (Math.abs(this.knockVx) < 0.5) {
      this.vx = this.facing * this.def.speed;
      if (this.x <= this.patrolLeft) { this.facing = 1; this.x = this.patrolLeft; }
      if (this.x + this.w >= this.patrolRight) { this.facing = -1; this.x = this.patrolRight - this.w; }
    }

    this.x += this.vx;
    const res = resolveVertical(this, platforms, GRAVITY);
    this.y = res.y; this.vy = res.vy; this.onGround = res.onGround;

    this.state = this.hitTimer > 0 ? 'hit' : 'patrol';
  }
}

function spawnParticles(particles: Particle[], x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 20 + Math.random() * 20,
      color,
      size: 3 + Math.random() * 3,
    });
  }
}
