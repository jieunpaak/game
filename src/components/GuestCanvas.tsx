import { useEffect, useRef } from 'react';
import { Player } from '../game/entities';
import { InputManager } from '../game/input';
import { buildPlatforms, WORLD_W, GROUND_Y } from '../game/map';
import { render } from '../game/renderer';
import { MONSTER_DEFS } from '../game/entities';
import { wsManager } from '../game/wsManager';
import type { GameStateSnapshot, GameStats, RemotePlayerState } from '../game/types';

interface Props {
  username: string;
  onStatsChange: (stats: GameStats) => void;
  onLevelUp: () => void;
}

export function GuestCanvas({ username, onStatsChange, onLevelUp }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // ── 로컬 플레이어 시뮬레이션 ──
    const platforms = buildPlatforms();
    const input     = new InputManager();
    const player    = new Player(200, GROUND_Y - 48); // 방장과 겹치지 않게 200부터 시작
    let   cameraX   = 0;
    let   rafId     = 0;

    // 호스트에서 받은 최신 게임 상태 (몬스터, 다른 플레이어)
    let hostSnap: GameStateSnapshot | null = null;

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width  = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── 저장된 스탯 불러오기 ──
    const unsubLoad = wsManager.on<GameStats>('load_stats', stats => {
      Object.assign(player.stats, stats);
      onStatsChange({ ...player.stats });
    });

    // ── 킬 보상 수신 (호스트가 몬스터 처리 후 전달) ──
    const unsubKill = wsManager.on<{ exp: number; gold: number }>('mob_kill', ({ exp, gold }) => {
      player.stats.gold += gold;
      const leveled = player.addExp(exp);
      player.stats.totalKills++;
      if (leveled) onLevelUp();
      onStatsChange({ ...player.stats });
      // 킬 보상도 자동 저장
      wsManager.send('save_stats', { ...player.stats });
    });

    // ── 호스트 게임 상태 수신 ──
    const unsubSnap = wsManager.on<GameStateSnapshot>('game_state', snap => {
      hostSnap = snap;
    });

    const loop = () => {
      rafId = requestAnimationFrame(loop);

      // 플레이어 업데이트
      const inp = input.snapshot();
      player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
      player.update(inp, platforms);

      // 카메라: 내 플레이어 따라가기
      const targetCam = player.centerX - canvas.width / 2;
      cameraX += (Math.max(0, Math.min(WORLD_W - canvas.width, targetCam)) - cameraX) * 0.1;

      // 스탯 변경 알림
      onStatsChange({ ...player.stats });

      // ── 원격 플레이어 상태 전송 (공격 중이면 atkRect 포함) ──
      const atkRect = player.isAttacking() ? player.attackRect() : null;
      const myState: RemotePlayerState = {
        id:               username,
        x:                player.x,
        y:                player.y,
        w:                player.w,
        h:                player.h,
        facing:           player.facing,
        state:            player.state,
        animFrame:        player.animFrame,
        hitFlash:         player.hitFlash,
        speechBubbleTimer: player.speechBubbleTimer,
        atk:              player.stats.atk,
        atkRect,
      };
      wsManager.send('remote_player', myState);

      // ── 렌더링 ──
      if (!hostSnap) {
        // 호스트 대기 중
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#555';
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('방장 접속을 기다리는 중...', canvas.width / 2, canvas.height / 2);
        return;
      }

      // 호스트 몬스터 데이터 변환
      const monsters = hostSnap.monsters.map(m => ({
        ...m,
        def: MONSTER_DEFS[m.defIdx] ?? MONSTER_DEFS[0],
      }));

      // 호스트 플레이어를 otherPlayers로 표시
      const hostAsRemote: RemotePlayerState = {
        id:               '방장',
        x:                hostSnap.player.x,
        y:                hostSnap.player.y,
        w:                hostSnap.player.w,
        h:                hostSnap.player.h,
        facing:           hostSnap.player.facing,
        state:            hostSnap.player.state,
        animFrame:        hostSnap.player.animFrame,
        hitFlash:         hostSnap.player.hitFlash,
        speechBubbleTimer: hostSnap.player.speechBubbleTimer,
        atk:              hostSnap.player.stats.atk,
        atkRect:          null,
      };

      // 나 자신을 제외한 다른 게스트들도 표시
      const otherGuests = (hostSnap.otherPlayers ?? []).filter(p => p.id !== username);
      const otherPlayers = [hostAsRemote, ...otherGuests];

      render(
        ctx,
        canvas.width, canvas.height,
        player,         // 내 캐릭터 (로컬, 부드럽게)
        monsters,       // 호스트 기준 몬스터
        platforms,
        [],             // damageNums: 생략
        [],             // particles:  생략
        cameraX,
        hostSnap.mapId ?? 'dungeon',
        otherPlayers,
      );
    };

    loop();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      unsubLoad();
      unsubKill();
      unsubSnap();
    };
  }, [username, onStatsChange, onLevelUp]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
