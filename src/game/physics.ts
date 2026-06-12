import type { Rect, Platform } from './types';

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface CollisionResult {
  onGround: boolean;
  vy: number;
  y: number;
}

export function resolveVertical(
  entity: { x: number; y: number; w: number; h: number; vy: number },
  platforms: Platform[],
  gravity: number,
): CollisionResult {
  let { y, vy } = entity;
  vy += gravity;
  y += vy;

  let onGround = false;

  for (const p of platforms) {
    const prevBottom = y - vy + entity.h;
    const curBottom  = y + entity.h;
    const horizontalOverlap = entity.x + entity.w > p.x && entity.x < p.x + p.w;

    // landing on top
    if (horizontalOverlap && prevBottom <= p.y + 2 && curBottom >= p.y && vy >= 0) {
      y = p.y - entity.h;
      vy = 0;
      onGround = true;
    }
    // hitting ceiling
    if (horizontalOverlap && entity.y >= p.y + p.h && y < p.y + p.h && vy < 0) {
      y = p.y + p.h;
      vy = 0;
    }
  }

  return { onGround, vy, y };
}
