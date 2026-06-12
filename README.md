# ⚔️ 던전 크롤러

메이플스토리 스타일 2D 사이드스크롤 액션 RPG.  
Canvas 기반으로 구현된 플랫포머로, 몬스터를 처치하며 레벨업하는 게임입니다.

## 플레이 방법

| 키 | 동작 |
|----|------|
| `←` `→` | 좌우 이동 |
| `↑` / `Space` | 점프 |
| `Z` | 공격 |

- 몬스터를 처치하면 골드와 경험치 획득
- 경험치가 쌓이면 레벨업 → 공격력·방어력·HP 증가
- 처치된 몬스터는 5초 후 리스폰
- 세계 너비 3200px, 3개 구역에 걸쳐 난이도 상승

## 로컬 개발

```bash
npm install
npm run dev       # http://localhost:5173
```

## 배포 구조

```
GitHub Pages                   회사 Mac (항상 켜둠)
┌─────────────────────┐        ┌──────────────────────────┐
│  프론트엔드 (React)  │  WSS   │  Node.js WebSocket 서버  │
│  jieunpaak.github   │ ─────► │  localhost:3000          │
│  .io/game           │        │  + cloudflared 터널      │
└─────────────────────┘        └──────────────────────────┘
  git push 시 자동 배포           항상 실행 중
```

### 프론트엔드 — GitHub Pages

`main` 브랜치에 푸시하면 GitHub Actions가 자동으로 빌드 후 배포합니다.

```bash
git push origin main   # 자동 배포 트리거
```

배포 URL: **https://jieunpaak.github.io/game**

### 백엔드 — 회사 Mac

#### 서버 실행 (launchd 자동 시작)

로그인 시 자동으로 Node.js 서버가 시작됩니다.

```bash
# 상태 확인
launchctl list | grep com.jerry.game

# 수동 재시작
launchctl unload ~/Library/LaunchAgents/com.jerry.game-serve.plist
launchctl load   ~/Library/LaunchAgents/com.jerry.game-serve.plist
```

#### cloudflared 터널

프론트엔드(GitHub Pages)와 백엔드를 연결하는 터널입니다.

```bash
# 터널 시작
cloudflared tunnel --url http://localhost:3000 --protocol http2
```

터미널에 출력된 URL을 `wss://`로 바꿔서 GitHub 시크릿에 등록합니다.

```
# GitHub 시크릿 등록 위치
github.com/jieunpaak/game → Settings → Secrets → VITE_WS_URL

# 등록 값 형식
wss://xxxx.trycloudflare.com/ws/chat
```

시크릿 등록 후 `git push`로 재배포하면 새 URL이 적용됩니다.

> **주의:** Mac 잠자기 모드 비활성화 필요
> ```bash
> sudo pmset -a sleep 0
> sudo pmset -a disksleep 0
> ```
> 잠금화면은 무관합니다.

### GitHub Actions 시크릿

| 시크릿 | 설명 |
|--------|------|
| `VITE_WS_URL` | cloudflared 터널 WebSocket URL (`wss://...trycloudflare.com/ws/chat`) |

## 기술 스택

- React 19 + TypeScript
- Vite
- HTML5 Canvas (렌더링, 물리, 게임 루프)
- Node.js + WebSocket (멀티플레이어 서버)
- GitHub Pages (프론트엔드 호스팅)
- cloudflared (WebSocket 터널)
- launchd (서버 자동 실행)
