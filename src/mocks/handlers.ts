import { http, HttpResponse } from 'msw';
import type { MatchResult } from '../game/types';
import type { HistoryEntry, Page } from '../api/types';

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
    typeof b.clientId === 'string' &&
    typeof b.score === 'number' &&
    typeof b.enemiesKilled === 'number' &&
    typeof b.durationPlayed === 'number' &&
    (b.endReason === 'timeout' || b.endReason === 'death') &&
    typeof b.endedAt === 'string'
  );
}

function paginate<T>(items: T[], url: URL): Page<T> {
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const limit = Math.max(1, Number(url.searchParams.get('limit')) || 5);
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
    page,
    pages: Math.max(1, Math.ceil(items.length / limit)),
  };
}

export const handlers = [
  http.get('/api/history', ({ request }) => {
    const sorted = readStore().sort((a, b) => b.endedAt.localeCompare(a.endedAt));
    return HttpResponse.json(paginate(sorted, new URL(request.url)));
  }),

  http.post('/api/history', async ({ request }) => {
    const body: unknown = await request.json();
    if (!isValidResult(body))
      return HttpResponse.json({ error: 'invalid match result' }, { status: 400 });
    const store = readStore();
    // Idempotency: a retry of the same clientId returns the existing entry — never duplicates.
    const existing = store.find((e) => e.clientId === body.clientId);
    if (existing) return HttpResponse.json(existing, { status: 200 });
    const entry: HistoryEntry = { ...body, id: crypto.randomUUID() };
    writeStore([entry, ...store]);
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.get('/api/ranking', ({ request }) => {
    const ranked = readStore()
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((e, i) => ({
        rank: i + 1,
        score: e.score,
        enemiesKilled: e.enemiesKilled,
        endReason: e.endReason,
        endedAt: e.endedAt,
        clientId: e.clientId,
      }));
    return HttpResponse.json(paginate(ranked, new URL(request.url)));
  }),
];
