export type EndReason = 'timeout' | 'death';
export type MatchState = 'running' | 'ended';

/** Pushed to the React layer at most hudSyncHz times per second. */
export interface HudSnapshot {
  score: number;
  hp: number;
  maxHp: number;
  timeRemaining: number;
  paused: boolean;
  matchState: MatchState;
  endReason: EndReason | null;
}

/** Persisted + later POSTed to /history. */
export interface MatchResult {
  score: number;
  enemiesKilled: number;
  durationPlayed: number; // seconds
  endReason: EndReason;
  endedAt: string; // ISO timestamp
}
