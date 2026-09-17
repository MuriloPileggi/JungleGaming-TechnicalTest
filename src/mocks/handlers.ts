import { http, HttpResponse } from 'msw';
import type { MatchResult } from '../game/types';
import type { HistoryEntry, RankingEntry } from '../api/types';

const STORE_KEY = 'pirate-battle:history';

function readStore(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(entries));
  } catch {
    // quota / private mode — non-fatal
  }
}

function isValidResult(body: unknown): body is MatchResult {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.score === 'number' &&
    typeof b.enemiesKilled === 'number' &&
    typeof b.durationPlayed === 'number' &&
    (b.endReason === 'timeout' || b.endReason === 'death') &&
    typeof b.endedAt === 'string'
  );
}

export const handlers = [
  http.get('/api/history', () =>
    HttpResponse.json(readStore().sort((a, b) => b.endedAt.localeCompare(a.endedAt))),
  ),

  http.post('/api/history', async ({ request }) => {
    const body: unknown = await request.json();
    if (!isValidResult(body)) {
      return HttpResponse.json({ error: 'invalid match result' }, { status: 400 });
    }
    const entry: HistoryEntry = { ...body, id: crypto.randomUUID() };
    writeStore([entry, ...readStore()]);
    return HttpResponse.json(entry, { status: 201 });
  }),

  // Ranking is computed "server-side": the client never sorts scores itself.
  http.get('/api/ranking', () => {
    const ranking: RankingEntry[] = readStore()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((e, i) => ({
        rank: i + 1,
        score: e.score,
        enemiesKilled: e.enemiesKilled,
        endReason: e.endReason,
        endedAt: e.endedAt,
      }));
    return HttpResponse.json(ranking);
  }),
];
