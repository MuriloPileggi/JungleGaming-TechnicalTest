import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameConfig } from '../config/gameConfig';
import { loadOptions, saveOptions, type SavedOptions } from '../persistence/storage';
import { hintStyle, labelStyle, linkButtonStyle, screenStyle, titleStyle } from './Styles';

export function OptionsScreen() {
  const [options, setOptions] = useState<SavedOptions>(() => loadOptions());

  const update = (patch: Partial<SavedOptions>) => {
    const next = { ...options, ...patch };
    setOptions(next);
    saveOptions(next); // persist immediately; loadOptions() re-validates on read
  };

  return (
    <div style={screenStyle}>
      <h1 style={titleStyle}>OPTIONS</h1>

      <label style={labelStyle}>
        Match length
        <select
          value={options.matchDuration}
          onChange={(e) => update({ matchDuration: Number(e.target.value) })}
        >
          {GameConfig.match.durationOptions.map((s) => (
            <option key={s} value={s}>
              {Math.floor(s / 60)} min{s % 60 ? ` ${s % 60}s` : ''}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        Enemy spawn interval
        <select
          value={options.spawnInterval}
          onChange={(e) => update({ spawnInterval: Number(e.target.value) })}
        >
          {GameConfig.match.spawnIntervalOptions.map((s) => (
            <option key={s} value={s}>
              {s}s
            </option>
          ))}
        </select>
      </label>

      <p style={hintStyle}>Changes save automatically and apply to the next match.</p>
      <Link to="/" style={linkButtonStyle}>
        Back to menu
      </Link>
    </div>
  );
}
