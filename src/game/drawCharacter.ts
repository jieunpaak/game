import type { PlayerState } from './types';

// 흰 배경 제거 후 offscreen canvas에 캐싱
const processedCanvases = new Map<string, HTMLCanvasElement>();

function getImagePath(nickname?: string): string {
  if (nickname === '진영킹') return 'jin.png';
  return 'player.png';
}

function getProcessedImage(nickname?: string): HTMLCanvasElement | null {
  const path = getImagePath(nickname);
  if (processedCanvases.has(path)) return processedCanvases.get(path)!;

  const imgId = `__img_${path.replace('.', '_')}__`;
  const img = document.getElementById(imgId) as HTMLImageElement | null;
  if (!img || !img.complete || img.naturalWidth === 0) {
    ensureImageLoader(path);
    return null;
  }

  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cx = c.getContext('2d')!;
  cx.drawImage(img, 0, 0);

  const id = cx.getImageData(0, 0, c.width, c.height);
  const data = id.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 230 && g > 230 && b > 230) data[i + 3] = 0;
  }
  cx.putImageData(id, 0, 0);
  processedCanvases.set(path, c);
  return c;
}

// DOM에 숨겨진 img 태그로 이미지 로드
function ensureImageLoader(path: string) {
  const imgId = `__img_${path.replace('.', '_')}__`;
  if (document.getElementById(imgId)) return;
  const img = document.createElement('img');
  img.id = imgId;
  img.src = `${import.meta.env.BASE_URL}${path}`;
  img.style.display = 'none';
  img.onload = () => { 
    processedCanvases.delete(path); // 로드 완료 시 캐시 강제 갱신 유도
  }; 
  document.body.appendChild(img);
}

// 기본 이미지들 미리 로드 시도
ensureImageLoader('player.png');
ensureImageLoader('jin.png');

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  facing: 1 | -1,
  state: PlayerState,
  animFrame: number,
  hitFlash: number,
  speechBubbleTimer: number,
  nickname?: string,
) {
  const source = getProcessedImage(nickname);
  if (!source) return;

  if (hitFlash > 0 && Math.floor(hitFlash / 2) % 2 === 1) ctx.globalAlpha = 0.3;

  const t = animFrame;
  const DISPLAY = 120;
  const cx = px + 18;
  const cy = py + 48 - DISPLAY / 2; // 이미지 바닥 = 히트박스 바닥

  // ── 말풍선 (공격 후 speechBubbleTimer 동안 유지) ──────────
  if (speechBubbleTimer > 0) {
    const alpha = Math.min(1, speechBubbleTimer / 15); // 마지막 15프레임 페이드아웃
    const text = '꾸짖을 갈';
    const bx = cx + (facing === 1 ? 18 : -80);
    const by = cy - DISPLAY / 2 - 10;
    const bw = 74, bh = 28, br = 10;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 말풍선 배경
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(bx, by - bh, bw, bh, br);
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 꼬리 (삼각형)
    const tailX = facing === 1 ? bx + 16 : bx + bw - 16;
    ctx.beginPath();
    ctx.moveTo(tailX - 6, by);
    ctx.lineTo(tailX + 6, by);
    ctx.lineTo(tailX, by + 10);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tailX - 6, by);
    ctx.lineTo(tailX, by + 10);
    ctx.lineTo(tailX + 6, by);
    ctx.stroke();

    // 텍스트
    ctx.fillStyle = '#111';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by - bh / 2);

    ctx.restore();
  }

  // ── 공격 이펙트 (캐릭터보다 먼저 그려서 뒤에 깔림) ─────────
  if (state === 'attack') {
    const p = (t % 20) / 20; // 0→1 주기

    // 1) 충격파 원
    const shockR = p * 55;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.6;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + (facing === 1 ? 28 : -28), cy, shockR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2) 속도선 (방향쪽으로 방사)
    const lineCount = 7;
    const spreadAngle = Math.PI * 0.55;
    const baseAngle = facing === 1 ? 0 : Math.PI;
    ctx.save();
    ctx.globalAlpha = (1 - p) * 0.85;
    for (let i = 0; i < lineCount; i++) {
      const angle = baseAngle - spreadAngle / 2 + (spreadAngle / (lineCount - 1)) * i;
      const len = (30 + Math.random() * 25) * (1 - p * 0.4);
      const startR = 20 + p * 10;
      ctx.strokeStyle = i % 2 === 0 ? '#FFD700' : '#FFF';
      ctx.lineWidth = i === Math.floor(lineCount / 2) ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
      ctx.lineTo(cx + Math.cos(angle) * (startR + len), cy + Math.sin(angle) * (startR + len));
      ctx.stroke();
    }
    ctx.restore();

    // 3) 글로우 (캐릭터 주변 후광)
    const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 50 * (1 - p * 0.5));
    glow.addColorStop(0, `rgba(255,220,50,${0.35 * (1 - p)})`);
    glow.addColorStop(1, 'rgba(255,220,50,0)');
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── 캐릭터 이미지 ─────────────────────────────────────────
  let offsetY = 0;
  let scale = 1;

  if (state === 'idle') {
    offsetY = Math.sin(t * 0.06) * 1.5;
  } else if (state === 'walk') {
    offsetY = Math.abs(Math.sin(t * 0.22)) * -2;
  } else if (state === 'jump') {
    offsetY = -4;
  } else if (state === 'attack') {
    const p = (t % 20) / 20;
    scale = 1 + Math.sin(p * Math.PI) * 0.18; // 순간 커졌다 돌아옴
  } else if (state === 'hit') {
    offsetY = -3;
    ctx.globalAlpha = Math.max(ctx.globalAlpha * 0.5, 0.3);
  }

  ctx.save();
  ctx.translate(cx, cy + offsetY);
  if (facing === -1) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.drawImage(source, -DISPLAY / 2, -DISPLAY / 2, DISPLAY, DISPLAY);
  ctx.restore();

  ctx.globalAlpha = 1;
}
