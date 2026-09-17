import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainMenuScreen } from './screens/MainMenu';
import { OptionsScreen } from './screens/Options';
import { screenStyle } from './screens/Styles';

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
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<MainMenuScreen />} />
        <Route path="/options" element={<OptionsScreen />} />
        <Route path="/game" element={<GameScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
