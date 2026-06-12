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

## 배포

정적 파일 빌드 후 serve + ngrok으로 공개 URL 제공.

```bash
npm run build     # dist/ 갱신
```

> 코드 수정 시 `npm run build`만 실행하면 즉시 반영됩니다.  
> serve와 ngrok은 재시작 불필요.

### 서비스 관리 (launchd)

로그인 시 자동 시작되는 두 개의 서비스가 등록되어 있습니다.

| 서비스 | 역할 |
|--------|------|
| `com.jerry.game-serve` | `dist/` 폴더를 포트 3000으로 서빙 |
| `com.jerry.game-ngrok` | 포트 3000을 인터넷에 공개 (ngrok 터널) |

```bash
# 상태 확인
launchctl list | grep com.jerry.game

# 재시작
launchctl unload ~/Library/LaunchAgents/com.jerry.game-serve.plist
launchctl load   ~/Library/LaunchAgents/com.jerry.game-serve.plist

# 현재 공개 URL 확인
curl -s http://localhost:4040/api/tunnels | python3 -c \
  "import sys,json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])"
```

> ngrok 무료 플랜은 맥북 재시작 시 URL이 변경됩니다.

## 기술 스택

- React 19 + TypeScript
- Vite
- HTML5 Canvas (렌더링, 물리, 게임 루프)
- serve + ngrok (배포)
- launchd (자동 실행)
