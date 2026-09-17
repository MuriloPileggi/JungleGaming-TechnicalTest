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

function pickAllowed(
  value: number | undefined,
  allowed: readonly number[],
  fallback: number,
): number {
  return value !== undefined && allowed.includes(value) ? value : fallback;
}

/** Options are validated against the allowed sets — a hand-edited
 *  localStorage can't put the game in an invalid configuration. */
export function loadOptions(): SavedOptions {
  const saved = read<SavedOptions>(GameConfig.persistence.optionsKey);
  return {
    matchDuration: pickAllowed(
      saved?.matchDuration,
      GameConfig.match.durationOptions,
      GameConfig.match.defaultDuration,
    ),
    spawnInterval: pickAllowed(
      saved?.spawnInterval,
      GameConfig.match.spawnIntervalOptions,
      GameConfig.match.defaultSpawnInterval,
    ),
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
