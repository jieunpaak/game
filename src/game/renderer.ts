import type { Platform, DamageNumber, Particle, PlayerState, MonsterState, MapId, RemotePlayerState } from './types';
import { GROUND_Y } from './map';
import { drawCharacter } from './drawCharacter';

export interface PlayerRenderData {
  x: number; y: number; w: number; h: number;
  facing: 1 | -1; state: PlayerState; animFrame: number;
  hitFlash: number; speechBubbleTimer: number;
}

export interface MonsterRenderData {
  x: number; y: number; w: number; h: number;
  state: MonsterState; facing: 1 | -1;
  hitTimer: number; hp: number; maxHp: number;
  def: { emoji: string; name: string };
}

export function render(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number,
  player: PlayerRenderData,
  monsters: MonsterRenderData[],
  platforms: Platform[],
  damageNums: DamageNumber[],
  particles: Particle[],
  cameraX: number,
  mapId: MapId = 'dungeon',
  otherPlayers: RemotePlayerState[] = [],
  playerLabel?: { nickname: string; level: number },
) {
  ctx.clearRect(0, 0, cw, ch);

  if (mapId === 'subway') {
    drawSubwayBackground(ctx, cw, ch, cameraX);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, '#1a1a2e');
    sky.addColorStop(0.6, '#16213e');
    sky.addColorStop(1, '#0f3460');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, cw, ch);
    drawDungeonBackground(ctx, cw, ch, cameraX);
  }

  ctx.save();
  ctx.translate(-cameraX, 0);

  // Platforms
  for (const p of platforms) {
    if (p.x + p.w < cameraX || p.x > cameraX + cw) continue;
    if (mapId === 'subway') {
      // Metal/concrete style
      ctx.fillStyle = p.y === GROUND_Y ? '#9a9890' : '#8a8880';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = p.y === GROUND_Y ? '#b0adA4' : '#a8a59c';
      ctx.fillRect(p.x, p.y, p.w, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
    } else {
      // Grass/wood style (original)
      ctx.fillStyle = p.color ?? '#5d4037';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = p.y === GROUND_Y ? '#3a7d34' : '#7b5e3d';
      ctx.fillRect(p.x, p.y, p.w, 6);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(p.x, p.y + p.h - 4, p.w, 4);
    }
  }

  // Monsters
  for (const m of monsters) {
    if (m.state === 'dead') continue;
    if (m.x + m.w < cameraX || m.x > cameraX + cw) continue;
    drawMonster(ctx, m);
  }

  // 다른 플레이어 (게스트)
  for (const rp of otherPlayers) {
    drawOtherPlayer(ctx, rp);
  }

  // Player (내 캐릭터)
  drawPlayer(ctx, player, playerLabel);


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

function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerRenderData, label?: { nickname: string; level: number }) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + p.h + 2, p.w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  drawCharacter(ctx, p.x, p.y, p.facing, p.state, p.animFrame, p.hitFlash, p.speechBubbleTimer);

  if (!label) return;
  const text = `${label.nickname} Lv.${label.level}`;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width;
  const bx = p.x + p.w / 2 - tw / 2 - 5;
  const by = p.y - 26;
  ctx.fillStyle = 'rgba(20,80,40,0.8)';
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + 10, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#86efac';
  ctx.fillText(text, p.x + p.w / 2, by + 12);
  ctx.textAlign = 'left';
}

function drawOtherPlayer(ctx: CanvasRenderingContext2D, rp: RemotePlayerState) {
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(rp.x + rp.w / 2, rp.y + rp.h + 2, rp.w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 캐릭터 (보라빛 오버레이로 구분)
  drawCharacter(ctx, rp.x, rp.y, rp.facing, rp.state, rp.animFrame, rp.hitFlash, rp.speechBubbleTimer);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#a855f7'; // 보라색 틴트
  ctx.fillRect(rp.x, rp.y, rp.w, rp.h);
  ctx.globalAlpha = 1;

  // 닉네임 배지
  const label = rp.id;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  const tw = ctx.measureText(label).width;
  const bx = rp.x + rp.w / 2 - tw / 2 - 5;
  const by = rp.y - 26;
  ctx.fillStyle = 'rgba(80,20,120,0.75)';
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + 10, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#e9d5ff';
  ctx.fillText(label, rp.x + rp.w / 2, by + 12);
  ctx.textAlign = 'left';
}

function drawMonster(ctx: CanvasRenderingContext2D, m: MonsterRenderData) {
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

function drawDungeonBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number, cameraX: number) {
  ctx.fillStyle = 'rgba(255,255,200,0.8)';
  ctx.beginPath();
  ctx.arc(cw - 80, 60, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 30; i++) {
    const sx = ((i * 137 + 50) % cw);
    const sy = ((i * 97 + 20) % (ch * 0.5));
    ctx.fillRect(sx, sy, 2, 2);
  }

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

function drawSubwayBackground(ctx: CanvasRenderingContext2D, cw: number, ch: number, cameraX: number) {
  // ── 벽 (크림 화이트) ──
  ctx.fillStyle = '#e0ddd5';
  ctx.fillRect(0, 0, cw, ch);

  // ── 바닥 ──
  ctx.fillStyle = '#bab8b0';
  ctx.fillRect(0, GROUND_Y, cw, ch - GROUND_Y);
  // 타일 줄눈
  ctx.strokeStyle = '#a8a59c';
  ctx.lineWidth = 1;
  const tileW = 64;
  const tileOff = -(cameraX % tileW);
  for (let x = tileOff - tileW; x < cw + tileW; x += tileW) {
    ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x, ch); ctx.stroke();
  }
  // 바닥 가로 줄
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 30); ctx.lineTo(cw, GROUND_Y + 30); ctx.stroke();

  // ── 천장 패널 ──
  ctx.fillStyle = '#d0cec6';
  ctx.fillRect(0, 0, cw, 52);
  ctx.fillStyle = '#c0beb6';
  ctx.fillRect(0, 52, cw, 7);

  // ── 형광등 (parallax 0.98x) ──
  const lightSpacing = 320;
  const lightOff = -(cameraX * 0.98 % lightSpacing);
  for (let lx = lightOff - lightSpacing; lx < cw + lightSpacing; lx += lightSpacing) {
    ctx.fillStyle = '#b8b5ac';
    ctx.fillRect(lx + 30, 6, 200, 22);
    ctx.fillStyle = '#f8f8ec';
    ctx.fillRect(lx + 35, 9, 190, 14);
    // 빛 번짐
    const grd = ctx.createLinearGradient(0, 0, 0, 130);
    grd.addColorStop(0, 'rgba(255,255,230,0.45)');
    grd.addColorStop(0.4, 'rgba(255,255,230,0.1)');
    grd.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(lx + 35, 0, 190, 130);
  }

  // ── 창문 + 광고판 (parallax 0.15x = 터널이 천천히 흘러감) ──
  const winSpacing = 380;
  const winOff = -(cameraX * 0.15 % winSpacing);
  for (let wx = winOff - winSpacing; wx < cw + winSpacing; wx += winSpacing) {
    // 창문 프레임
    ctx.fillStyle = '#9a9890';
    ctx.fillRect(wx + 10, 59, 210, 145);
    // 유리 (어두운 터널)
    ctx.fillStyle = '#0d0e1c';
    ctx.fillRect(wx + 16, 65, 198, 133);
    // 터널 불빛 줄기
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(100,110,160,${0.06 + i * 0.03})`;
      ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(wx + 16, 75 + i * 28);
      ctx.lineTo(wx + 214, 78 + i * 28);
      ctx.stroke();
    }
    // 터널 주황 등불
    const gOrange = ctx.createRadialGradient(wx + 115, 80, 2, wx + 115, 80, 28);
    gOrange.addColorStop(0, 'rgba(255,150,30,0.35)');
    gOrange.addColorStop(1, 'rgba(255,150,30,0)');
    ctx.fillStyle = gOrange;
    ctx.fillRect(wx + 87, 62, 56, 50);
    // 유리 반사
    const refl = ctx.createLinearGradient(wx + 16, 65, wx + 214, 65);
    refl.addColorStop(0, 'rgba(255,255,255,0.06)');
    refl.addColorStop(0.4, 'rgba(255,255,255,0.02)');
    refl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(wx + 16, 65, 198, 133);

    // 광고판 (창문 옆)
    const ax = wx + 240;
    ctx.fillStyle = '#ece9e0';
    ctx.fillRect(ax, 63, 110, 141);
    ctx.fillStyle = '#3a80c8';
    ctx.fillRect(ax + 6, 69, 98, 45);
    ctx.fillStyle = '#c8c5bc';
    ctx.fillRect(ax + 6, 122, 98, 8);
    ctx.fillRect(ax + 6, 136, 75, 7);
    ctx.fillRect(ax + 6, 149, 88, 7);
    ctx.fillRect(ax + 6, 162, 55, 7);
    ctx.fillStyle = '#b0ada4';
    ctx.fillRect(ax + 6, 176, 70, 7);
  }

  // ── 손잡이 가로 봉 ──
  const railY = 248;
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, railY + 18, cw, 4);
  ctx.fillStyle = '#c8c5bc';
  ctx.fillRect(0, railY, cw, 3);
  ctx.fillStyle = '#dcdad2';
  ctx.fillRect(0, railY + 3, cw, 14);
  ctx.fillStyle = '#b0ada4';
  ctx.fillRect(0, railY + 17, cw, 3);

  // ── 세로 기둥 (parallax 1.0x) ──
  const poleSpacing = 300;
  const poleOff = -(cameraX % poleSpacing);
  for (let px = poleOff - poleSpacing; px < cw + poleSpacing; px += poleSpacing) {
    const cx = px + 55;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(cx + 14, railY, 5, GROUND_Y - railY);
    ctx.fillStyle = '#c8c5bc';
    ctx.fillRect(cx, railY, 14, GROUND_Y - railY);
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillRect(cx + 2, railY, 4, GROUND_Y - railY);
  }
}
