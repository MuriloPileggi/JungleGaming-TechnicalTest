import { useEffect, useRef, useState } from 'react';
import { Game } from '../game/Game';

type LoadState =
  | { phase: 'loading'; progress: number }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [state, setState] = useState<LoadState>({ phase: 'loading', progress: 0 });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    const game = new Game(host, (p) => {
      if (cancelled) return;
      setState(p >= 1 ? { phase: 'ready' } : { phase: 'loading', progress: p });
    });
    gameRef.current = game;
    game.onPauseChanged = setPaused;
    game.init().catch((err) => {
      if (!cancelled) setState({ phase: 'error', message: String(err) });
    });

    // Strict Mode runs this cleanup immediately in dev — Game.init() guards
    // against the "destroyed during async init" race, and init must be idempotent.
    return () => {
      cancelled = true;
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />

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

      {state.phase === 'ready' && paused && (
        <div style={overlayStyle} role="status" aria-live="polite">
          <h2>PAUSED</h2>
          <p>Press Enter, Space, Esc, or click to resume</p>
        </div>
      )}

      {state.phase === 'error' && (
        <div role="alert" style={overlayStyle}>
          <p>Failed to load assets.</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(4, 20, 34, 0.85)',
  color: '#e8dcc0',
  flexDirection: 'column',
};
