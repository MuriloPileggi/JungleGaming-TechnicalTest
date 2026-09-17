import { Link, useNavigate } from 'react-router-dom';
import { loadLastResult, loadOptions } from '../persistence/storage';
import { formatTime } from '../utils/formatTime';
import {
  headingStyle,
  hintStyle,
  linkButtonStyle,
  menuStyle,
  panelStyle,
  primaryButtonStyle,
  screenStyle,
  subtitleStyle,
  titleStyle,
} from './Styles';

export function MainMenuScreen() {
  const navigate = useNavigate();
  const options = loadOptions();
  const lastResult = loadLastResult();

  return (
    <div style={screenStyle}>
      <h1 style={titleStyle}>PIRATE BATTLE</h1>
      <p style={subtitleStyle}>Hold the sea for as long as you can.</p>

      <div style={panelStyle} aria-label="Current settings">
        <p style={{ margin: 4 }}>Match length: {formatTime(options.matchDuration)}</p>
        <p style={{ margin: 4 }}>Enemy spawn interval: {options.spawnInterval}s</p>
      </div>

      {lastResult && (
        <div style={panelStyle} aria-label="Last match result">
          <h2 style={headingStyle}>Last voyage</h2>
          <p style={{ margin: 4 }}>
            Score {lastResult.score} · {lastResult.enemiesKilled} kills ·{' '}
            {formatTime(lastResult.durationPlayed)} · {lastResult.endReason}
          </p>
        </div>
      )}

      <nav style={menuStyle} aria-label="Main menu">
        <button style={primaryButtonStyle} onClick={() => navigate('/game')} autoFocus>
          Set sail
        </button>
        <Link to="/history" style={linkButtonStyle}>
          History & ranking
        </Link>
        <Link to="/options" style={linkButtonStyle}>
          Options
        </Link>
      </nav>

      <p style={hintStyle}>WASD / arrows to sail · Space frontal cannon · Q/E broadsides</p>
    </div>
  );
}
