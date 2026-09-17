import { useHudStore } from '../hud/hudStore';
import { formatTime } from '../utils/formatTime';

export function Hud() {
  const { score, hp, maxHp, timeRemaining, matchState } = useHudStore();
  if (matchState === 'ended') return null;

  return (
    <div data-testid="hud-bar" style={barStyle}>
      <div style={cellStyle}>
        <span style={labelStyle}>SCORE</span>
        <strong>{score}</strong>
      </div>
      <div style={cellStyle}>
        <span style={labelStyle}>TIME</span>
        <strong>{formatTime(timeRemaining)}</strong>
      </div>
      <div style={{ ...cellStyle, flexGrow: 1 }}>
        <span style={labelStyle}>HULL</span>
        <div
          style={hpTrackStyle}
          role="meter"
          aria-label="Hull integrity"
          aria-valuemin={0}
          aria-valuemax={maxHp}
          aria-valuenow={hp}
        >
          <div style={{ ...hpFillStyle, width: `${(hp / maxHp) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  gap: 24,
  alignItems: 'center',
  padding: '8px 16px',
  background: 'rgba(4, 20, 34, 0.7)',
  color: '#e8dcc0',
  fontFamily: 'monospace',
  fontSize: 16,
};

const cellStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8 };

const labelStyle: React.CSSProperties = { opacity: 0.7, fontSize: 12 };

const hpTrackStyle: React.CSSProperties = {
  width: 180,
  height: 10,
  background: '#3a0d0d',
  borderRadius: 4,
  overflow: 'hidden',
};

const hpFillStyle: React.CSSProperties = {
  height: '100%',
  background: '#37c24a',
  transition: 'width 120ms linear',
};
