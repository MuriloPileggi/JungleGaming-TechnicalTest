import { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';
import { GameConfig } from '../config/gameConfig';
import { Hud } from './Hud';
import { formatTime } from '../utils/formatTime';
import { useHudStore } from '../hud/hudStore';
import { loadOptions, saveResult } from '../persistence/storage';
import type { MatchResult } from '../game/types';

type LoadState =
  | { phase: 'loading'; progress: number }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

/** Remounting the session = a fresh match. `key` is the reset button. */
export function GameCanvas() {
  const [session, setSession] = useState(0);
  return <GameSession key={session} onPlayAgain={() => setSession((s) => s + 1)} />;
}

function GameSession({ onPlayAgain }: { onPlayAgain: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>({ phase: 'loading', progress: 0 });
  const [result, setResult] = useState<MatchResult | null>(null);
  const paused = useHudStore((s) => s.paused);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const options = loadOptions();
    useHudStore.getState().reset(options.matchDuration, GameConfig.ship.maxHp);

    let cancelled = false;
    const game = new Game(
      host,
      (p) => {
        if (!cancelled) setState(p >= 1 ? { phase: 'ready' } : { phase: 'loading', progress: p });
      },
      options,
    );

    game.onHudSnapshot = (s) => {
      if (!cancelled) useHudStore.getState().apply(s);
    };
    game.onMatchEnd = (r) => {
      if (cancelled) return;
      saveResult(r);
      setResult(r);
    };

    game.init().catch((err) => {
      if (!cancelled) setState({ phase: 'error', message: String(err) });
    });

    return () => {
      cancelled = true;
      game.destroy();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />

      {state.phase === 'ready' && <Hud />}

      {state.phase === 'ready' && paused && !result && (
        <div style={overlayStyle} role="status" aria-live="polite">
          <h2>PAUSED</h2>
          <p>Press Enter, Space, Esc, or click to resume</p>
        </div>
      )}

      {state.phase === 'loading' && (
        <div
          role="progressbar"
          aria-valuenow={Math.round(state.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={overlayStyle}
        >
          <p>Loading… {Math.round(state.progress * 100)}%</p>
        </div>
      )}

      {state.phase === 'error' && (
        <div role="alert" style={overlayStyle}>
          <p>Failed to load assets.</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {result && (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Match result">
          <h2>{result.endReason === 'death' ? 'SHIP SUNK' : 'TIME UP'}</h2>
          <p>Score: {result.score}</p>
          <p>Enemies destroyed: {result.enemiesKilled}</p>
          <p>Time played: {formatTime(result.durationPlayed)}</p>
          <button onClick={onPlayAgain} style={buttonStyle}>
            Play again
          </button>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  background: 'rgba(4, 20, 34, 0.85)',
  color: '#e8dcc0',
  fontFamily: 'monospace',
};
const buttonStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 24px',
  fontSize: 16,
  background: '#c9a227',
  color: '#1a1a1a',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'monospace',
};
