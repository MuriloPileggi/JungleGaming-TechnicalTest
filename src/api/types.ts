import type { MatchResult } from '../game/types';

export interface HistoryEntry extends MatchResult {
  id: string; // assigned "server-side" by the MSW handler
}

export interface RankingEntry {
  rank: number;
  score: number;
  enemiesKilled: number;
  endReason: MatchResult['endReason'];
  endedAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
