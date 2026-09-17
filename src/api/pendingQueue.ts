import type { MatchResult } from '../game/types';
import { submitMatch } from './client';

const KEY = 'pirate-battle:pending';

export function readPending(): MatchResult[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as MatchResult[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePending(list: MatchResult[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* non-fatal */
  }
}

export function enqueuePending(r: MatchResult): void {
  writePending([r, ...readPending().filter((p) => p.clientId !== r.clientId)]);
}

export function removePending(clientId: string): void {
  writePending(readPending().filter((p) => p.clientId !== clientId));
}

/** Retries queued submissions in order; stops at first failure. Returns how many succeeded. */
export async function flushPending(): Promise<number> {
  let ok = 0;
  for (const r of readPending()) {
    try {
      await submitMatch(r); // server dedupes by clientId → safe to retry blindly
      removePending(r.clientId);
      ok++;
    } catch {
      break; // offline / server error → keep queue, retry next boot
    }
  }
  return ok;
}
