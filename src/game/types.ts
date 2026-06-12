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

export interface MonsterSnapshot {
  x: number; y: number; w: number; h: number;
  facing: 1 | -1;
  state: MonsterState;
  hp: number; maxHp: number;
  defIdx: number;
  hitTimer: number;
}

export interface GameStateSnapshot {
  player: {
    x: number; y: number; w: number; h: number;
    facing: 1 | -1; state: PlayerState; animFrame: number;
    hitFlash: number; speechBubbleTimer: number;
    stats: GameStats;
  };
  monsters: MonsterSnapshot[];
  cameraX: number;
  particles: Particle[];
  damageNums: DamageNumber[];
  canvasW: number;
  canvasH: number;
}

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
