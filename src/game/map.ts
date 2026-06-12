import type { Platform, MapId } from './types';
import { Monster, MONSTER_DEFS } from './entities';

export const MAP_IDS: MapId[] = ['dungeon', 'subway'];
export const MAP_NAMES: Record<MapId, string> = {
  dungeon: '🌙 던전',
  subway: '🚇 지하철',
};

export const WORLD_W = 3200;
export const WORLD_H = 640;
export const GROUND_Y = 560;

export function buildPlatforms(): Platform[] {
  const ground: Platform = { x: 0, y: GROUND_Y, w: WORLD_W, h: 80, color: '#2d5a27' };

  const floaters: Platform[] = [
    // zone 1
    { x: 150,  y: 440, w: 200, h: 20, color: '#5d4037' },
    { x: 420,  y: 360, w: 160, h: 20, color: '#5d4037' },
    { x: 640,  y: 280, w: 200, h: 20, color: '#5d4037' },
    // zone 2
    { x: 900,  y: 460, w: 220, h: 20, color: '#4a3728' },
    { x: 1150, y: 370, w: 180, h: 20, color: '#4a3728' },
    { x: 1370, y: 290, w: 240, h: 20, color: '#4a3728' },
    { x: 1660, y: 410, w: 180, h: 20, color: '#4a3728' },
    // zone 3
    { x: 1900, y: 340, w: 200, h: 20, color: '#3e2723' },
    { x: 2150, y: 260, w: 160, h: 20, color: '#3e2723' },
    { x: 2380, y: 180, w: 220, h: 20, color: '#3e2723' },
    { x: 2650, y: 300, w: 200, h: 20, color: '#3e2723' },
    { x: 2900, y: 400, w: 180, h: 20, color: '#3e2723' },
  ];

  return [ground, ...floaters];
}

export function buildMonsters(platforms: Platform[]): Monster[] {
  const monsters: Monster[] = [];

  const spawns: Array<{ px: number; py: number; def: number; count: number }> = [
    // ground zone 1
    { px: 200,  py: GROUND_Y, def: 0, count: 3 },
    { px: 600,  py: GROUND_Y, def: 0, count: 2 },
    // platforms zone 1
    { px: 150,  py: 440, def: 0, count: 1 },
    { px: 420,  py: 360, def: 1, count: 1 },
    { px: 640,  py: 280, def: 1, count: 1 },
    // ground zone 2
    { px: 950,  py: GROUND_Y, def: 1, count: 3 },
    { px: 1200, py: GROUND_Y, def: 2, count: 2 },
    { px: 1500, py: GROUND_Y, def: 2, count: 2 },
    // platforms zone 2
    { px: 900,  py: 460, def: 1, count: 1 },
    { px: 1150, py: 370, def: 2, count: 1 },
    { px: 1370, py: 290, def: 2, count: 2 },
    { px: 1660, py: 410, def: 2, count: 1 },
    // ground zone 3
    { px: 1950, py: GROUND_Y, def: 3, count: 3 },
    { px: 2300, py: GROUND_Y, def: 3, count: 2 },
    { px: 2600, py: GROUND_Y, def: 4, count: 2 },
    { px: 2900, py: GROUND_Y, def: 4, count: 3 },
    // platforms zone 3
    { px: 1900, py: 340, def: 3, count: 1 },
    { px: 2150, py: 260, def: 3, count: 1 },
    { px: 2380, py: 180, def: 4, count: 2 },
    { px: 2650, py: 300, def: 4, count: 1 },
  ];

  for (const s of spawns) {
    const def = MONSTER_DEFS[Math.min(s.def, MONSTER_DEFS.length - 1)];
    for (let i = 0; i < s.count; i++) {
      const spawnX = s.px + i * 80;
      const plat = platforms.find(p =>
        p.y === s.py && spawnX >= p.x && spawnX <= p.x + p.w
      );
      const patrolLeft  = plat ? plat.x : s.px - 100;
      const patrolRight = plat ? plat.x + plat.w : s.px + 200;
      monsters.push(new Monster(spawnX, s.py - def.hp / def.hp * 44 - 1, def, patrolLeft, patrolRight));
    }
  }

  return monsters;
}
