export interface Rect { x: number; y: number; w: number; h: number; }

export interface Platform extends Rect {
  color?: string;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  life: number;    // frames remaining
  maxLife: number;
  isPlayer: boolean;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  color: string;
  size: number;
}

export type PlayerState = 'idle' | 'walk' | 'jump' | 'attack' | 'hit' | 'dead';
export type MonsterState = 'patrol' | 'hit' | 'dead';

export interface GameStats {
  level: number;
  exp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  gold: number;
  totalKills: number;
}
