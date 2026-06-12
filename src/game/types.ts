export type MapId = 'dungeon' | 'subway';

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

// 다른 플레이어(게스트)의 상태 — 호스트가 수신·방송
export interface RemotePlayerState {
  id: string;           // username
  x: number; y: number; w: number; h: number;
  facing: 1 | -1;
  state: PlayerState;
  animFrame: number;
  hitFlash: number;
  speechBubbleTimer: number;
  level: number;
  atk: number;          // 호스트가 몬스터 피해 계산에 사용
  atkRect: Rect | null; // 공격 중일 때만 존재
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
  mapId: MapId;
  autoMode: boolean;
  otherPlayers: RemotePlayerState[];
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
