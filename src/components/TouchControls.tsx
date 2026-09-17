import type { CSSProperties } from 'react';

interface TouchButton {
  code: string;
  label: string;
  testId: string;
}

const MOVE_BUTTONS: TouchButton[] = [
  { code: 'KeyA', label: '◀', testId: 'touch-left' },
  { code: 'KeyW', label: '▲', testId: 'touch-throttle' },
  { code: 'KeyD', label: '▶', testId: 'touch-right' },
];

const FIRE_BUTTONS: TouchButton[] = [
  { code: 'KeyQ', label: 'L', testId: 'touch-broadside-left' },
  { code: 'Space', label: 'FIRE', testId: 'touch-fire' },
  { code: 'KeyE', label: 'R', testId: 'touch-broadside-right' },
];

export function TouchControls({ onPress }: { onPress: (code: string, down: boolean) => void }) {
  return (
    <>
      <div style={clusterStyle('left')} aria-label="Movement controls">
        {MOVE_BUTTONS.map((b) => (
          <TouchBtn key={b.code} button={b} onPress={onPress} />
        ))}
      </div>
      <div style={clusterStyle('right')} aria-label="Firing controls">
        {FIRE_BUTTONS.map((b) => (
          <TouchBtn key={b.code} button={b} onPress={onPress} />
        ))}
      </div>
    </>
  );
}

function TouchBtn({
  button,
  onPress,
}: {
  button: TouchButton;
  onPress: (code: string, down: boolean) => void;
}) {
  const big = button.code === 'Space';
  return (
    <button
      data-testid={button.testId}
      aria-label={button.testId}
      style={{ ...btnStyle, ...(big ? fireBtnStyle : {}) }}
      onPointerDown={(e) => {
        e.preventDefault(); // stop double-fire emulation + text selection
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress(button.code, true);
      }}
      onPointerUp={() => onPress(button.code, false)}
      onPointerCancel={() => onPress(button.code, false)}
    >
      {button.label}
    </button>
  );
}

const clusterStyle = (side: 'left' | 'right'): CSSProperties => ({
  position: 'absolute',
  bottom: 16,
  [side]: 16,
  display: 'flex',
  gap: 10,
  zIndex: 25,
  touchAction: 'none',
});

const btnStyle: CSSProperties = {
  width: 60,
  height: 60,
  borderRadius: '50%',
  fontSize: 18,
  background: 'rgba(4, 20, 34, 0.6)',
  color: '#e8dcc0',
  border: '1px solid rgba(232,220,192,0.4)',
  touchAction: 'none',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
};

const fireBtnStyle: CSSProperties = {
  width: 84,
  height: 84,
  fontSize: 14,
  background: 'rgba(122, 27, 27, 0.65)',
};
