import { GameConfig } from '../config/gameConfig';
import type { MatchResult } from '../game/types';

export interface SavedOptions {
  matchDuration: number;
  spawnInterval: number;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // corrupted JSON or storage blocked → treat as absent
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded / private mode — non-fatal
  }
}

/** Options are validated against the allowed sets — a hand-edited
 *  localStorage can't put the game in an invalid configuration. */
export function loadOptions(): SavedOptions {
  let raw: Record<string, unknown> = {};
  try {
    const stored = localStorage.getItem(GameConfig.persistence.optionsKey);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      raw = parsed as Record<string, unknown>;
    }
  } catch {
    raw = {}; // corrupt JSON → treat as absent
  }

  const validMatchDuration =
    typeof raw.matchDuration === 'number' &&
    GameConfig.match.durationOptions.some((option) => option === raw.matchDuration);
  const validSpawnInterval =
    typeof raw.spawnInterval === 'number' &&
    GameConfig.match.spawnIntervalOptions.some((option) => option === raw.spawnInterval);

  return {
    matchDuration: validMatchDuration
      ? (raw.matchDuration as number)
      : GameConfig.match.defaultDuration,
    spawnInterval: validSpawnInterval
      ? (raw.spawnInterval as number)
      : GameConfig.match.defaultSpawnInterval,
  };
}

export function saveOptions(options: SavedOptions): void {
  write(GameConfig.persistence.optionsKey, options);
}

export function loadLastResult(): MatchResult | null {
  return read<MatchResult>(GameConfig.persistence.resultKey);
}

export function saveResult(result: MatchResult): void {
  write(GameConfig.persistence.resultKey, result);
}
