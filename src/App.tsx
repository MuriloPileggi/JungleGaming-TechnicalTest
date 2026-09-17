import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainMenuScreen } from './screens/MainMenu';
import { OptionsScreen } from './screens/Options';
import { HistoryScreen } from './screens/History';
import { screenStyle } from './screens/Styles';
import { flushPending } from './api/pendingQueue';
import { queryClient } from './api/queryClient';

// PixiJS lives only behind this import: menu/options never download the engine.
const GameScreen = lazy(() => import('./screens/Game'));

function RouteFallback() {
  return (
    <div style={screenStyle}>
      <p>Loading…</p>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    void flushPending().then((n) => {
      if (n > 0) {
        void queryClient.invalidateQueries({ queryKey: ['history'] });
        void queryClient.invalidateQueries({ queryKey: ['ranking'] });
      }
    });
  }, []);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<MainMenuScreen />} />
        <Route path="/options" element={<OptionsScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
