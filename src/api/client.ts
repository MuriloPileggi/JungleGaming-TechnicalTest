import type { HistoryEntry, RankingEntry } from './types';
import type { MatchResult } from '../game/types';

const API = '/api';

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const res = await fetch(`${API}/history`);
  if (!res.ok) throw new Error(`GET /history failed: ${res.status}`);
  return (await res.json()) as HistoryEntry[];
}

export async function fetchRanking(): Promise<RankingEntry[]> {
  const res = await fetch(`${API}/ranking`);
  if (!res.ok) throw new Error(`GET /ranking failed: ${res.status}`);
  return (await res.json()) as RankingEntry[];
}

export async function submitMatch(result: MatchResult): Promise<HistoryEntry> {
  const res = await fetch(`${API}/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result),
  });
  if (!res.ok) throw new Error(`POST /history failed: ${res.status}`);
  return (await res.json()) as HistoryEntry;
}
