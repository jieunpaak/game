import type { Platform, DamageNumber, Particle } from './types';
import type { Player } from './entities';
import type { Monster } from './entities';
import { GROUND_Y } from './map';

export function render(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  player: Player,
  monsters: Monster[],
  platforms: Platform[],
  damageNums: DamageNumber[],
  particles: Particle[],
  cameraX: number,
) {
  ctx.clearRect(0, 0, cw, ch);

  // Background sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, '#1a1a2e');
  sky.addColorStop(0.6, '#16213e');
  sky.addColorStop(1, '#0f3460');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cw, ch);

  // Parallax background trees (decorative)
  drawBackground(ctx, cw, ch, cameraX);

  ctx.save();
  ctx.translate(-cameraX, 0);

  // Platforms
  for (const p of platforms) {
    if (p.x + p.w < cameraX || p.x > cameraX + cw) continue;
    // Top grass/wood layer
    ctx.fillStyle = p.color ?? '#5d4037';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = p.y === GROUND_Y ? '#3a7d34' : '#7b5e3d';
    ctx.fillRect(p.x, p.y, p.w, 6);
    // Edge shading
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
  }

  // Monsters
  for (const m of monsters) {
    if (m.state === 'dead') continue;
    if (m.x + m.w < cameraX || m.x > cameraX + cw) continue;
    drawMonster(ctx, m);
  }

  // Player
  drawPlayer(ctx, player);

  // Attack effect
  if (player.isAttacking()) {
    const ar = player.attackRect();
    ctx.fillStyle = 'rgba(255, 220, 50, 0.25)';
    ctx.fillRect(ar.x, ar.y, ar.w, ar.h);
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ar.x, ar.y, ar.w, ar.h);
  }

  // Particles
  for (const p of particles) {
    ctx.globalAlpha = p.life / 40;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Damage numbers (screen-space after translate cancel)
  for (const dn of damageNums) {
    const sx = dn.x - cameraX;
    const progress = 1 - dn.life / dn.maxLife;
    const sy = dn.y - progress * 50;
    const alpha = dn.life / dn.maxLife;
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${dn.isPlayer ? 16 : 20}px sans-serif`;
    ctx.fillStyle = dn.isPlayer ? '#ff6b6b' : '#ffd700';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(`-${dn.value}`, sx, sy);
    ctx.fillText(`-${dn.value}`, sx, sy);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player) {
  const flash = p.hitFlash > 0 && Math.floor(p.hitFlash / 2) % 2 === 0;
  if (flash) ctx.globalAlpha = 0.3;

  ctx.save();
  if (p.facing === -1) {
    ctx.translate(p.x + p.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(p.x + p.w / 2), 0);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + p.h + 2, p.w / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.font = `${p.h}px serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(p.isAttacking() ? '🧙' : '🧙', p.x, p.y - 4);

  // Attack slash
  if (p.isAttacking()) {
    ctx.font = '32px serif';
    ctx.fillText('⚔️', p.x + p.w - 4, p.y + 4);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawMonster(ctx: CanvasRenderingContext2D, m: Monster) {
  const flash = m.hitTimer > 0 && Math.floor(m.hitTimer / 2) % 2 === 0;
  if (flash) ctx.globalAlpha = 0.4;

  ctx.save();
  if (m.facing === -1) {
    ctx.translate(m.x + m.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(m.x + m.w / 2), 0);
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(m.x + m.w / 2, m.y + m.h + 2, m.w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${m.h}px serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(m.def.emoji, m.x, m.y - 4);

  ctx.restore();
  ctx.globalAlpha = 1;

  // HP bar
  const barW = 40;
  const barH = 5;
  const bx = m.x + m.w / 2 - barW / 2;
  const by = m.y - 12;
  ctx.fillStyle = '#333';
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = m.hp / m.maxHp > 0.5 ? '#2ecc71' : m.hp / m.maxHp > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillRect(bx, by, barW * (m.hp / m.maxHp), barH);

  // Name
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'center';
  ctx.fillText(m.def.name, m.x + m.w / 2, m.y - 15);
  ctx.textAlign = 'left';
}

function drawBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number, cameraX: number) {
  // Simple moon
  ctx.fillStyle = 'rgba(255,255,200,0.8)';
  ctx.beginPath();
  ctx.arc(cw - 80, 60, 30, 0, Math.PI * 2);
  ctx.fill();

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137 + 50) % cw);
    const sy = ((i * 97 + 20) % (ch * 0.5));
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Distant mountains (parallax 0.1x)
  ctx.fillStyle = 'rgba(30,40,80,0.8)';
  const ox = cameraX * 0.1;
  for (let i = 0; i < 8; i++) {
    const mx = (i * 500 - ox % 500) % (cw + 200) - 100;
    ctx.beginPath();
    ctx.moveTo(mx, ch * 0.75);
    ctx.lineTo(mx + 200, ch * 0.35);
    ctx.lineTo(mx + 400, ch * 0.75);
    ctx.fill();
  }
}
