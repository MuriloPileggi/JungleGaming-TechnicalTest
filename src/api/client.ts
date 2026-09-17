import type { HistoryEntry, Page, RankingEntry } from './types';
import type { MatchResult } from '../game/types';

const API = '/api';

export async function fetchHistory(page = 1): Promise<Page<HistoryEntry>> {
  const res = await fetch(`${API}/history?page=${page}`);
  if (!res.ok) throw new Error(`GET /history failed: ${res.status}`);
  return (await res.json()) as Page<HistoryEntry>;
}

export async function fetchRanking(page = 1): Promise<Page<RankingEntry>> {
  const res = await fetch(`${API}/ranking?page=${page}`);
  if (!res.ok) throw new Error(`GET /ranking failed: ${res.status}`);
  return (await res.json()) as Page<RankingEntry>;
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
