import type { Player } from '../game/entities';

interface Props {
  stats: Player['stats'];
  levelUpFlash: boolean;
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="hud-bar-wrap">
      <span className="hud-bar-label">{label}</span>
      <div className="hud-bar-bg">
        <div className="hud-bar-fill" style={{ width: `${pct}%`, background: color }} />
        <span className="hud-bar-text">{value}/{max}</span>
      </div>
    </div>
  );
}

export function HUD({ stats, levelUpFlash }: Props) {
  return (
    <div className="hud">
      <div className={`hud-left ${levelUpFlash ? 'levelup-flash' : ''}`}>
        <div className="hud-level">Lv.{stats.level}</div>
        <Bar value={stats.hp}  max={stats.maxHp}     color="#e74c3c" label="HP" />
        <Bar value={stats.exp} max={stats.expToNext}  color="#9b59b6" label="EXP" />
      </div>

      <div className="hud-right">
        <span className="hud-stat">⚔️ {stats.atk}</span>
        <span className="hud-stat">🛡️ {stats.def}</span>
        <span className="hud-stat">💰 {stats.gold}</span>
        <span className="hud-stat">🗡️ {stats.totalKills}</span>
      </div>

      <div className="hud-controls">
        <kbd>←→</kbd> 이동 &nbsp;
        <kbd>↑/Space</kbd> 점프 &nbsp;
        <kbd>Z</kbd> 공격
      </div>
    </div>
  );
}
