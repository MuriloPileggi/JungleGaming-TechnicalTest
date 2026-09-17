import { http, HttpResponse } from 'msw';
import { worker } from './browser';

type Mode = 'ok' | 'error' | 'network' | 'delay';
interface Faults {
  mode: Mode;
  times: number;
  delayMs: number;
}
const post: Faults = { mode: 'ok', times: 0, delayMs: 0 };
const get: Faults = { mode: 'ok', times: 0, delayMs: 0 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function applyFault(f: Faults): Promise<Response | undefined> {
  if (f.mode === 'ok' || f.times === 0) return undefined; // fall through to real handlers
  if (f.times > 0) f.times--;
  if (f.mode === 'delay') {
    await sleep(f.delayMs);
    return undefined; // delayed, then served normally
  }
  if (f.mode === 'error') return HttpResponse.json({ error: 'injected fault' }, { status: 500 });
  return HttpResponse.error(); // 'network': fetch rejects, like a dropped connection
}

export function installApiFaultHooks(): void {
  (window as unknown as Record<string, unknown>).__API_FAULTS__ = {
    failPost: (times = 1) => Object.assign(post, { mode: 'error', times }),
    dropPost: (times = 1) => Object.assign(post, { mode: 'network', times }),
    delayPost: (ms: number, times = 1) =>
      Object.assign(post, { mode: 'delay', times, delayMs: ms }),
    failGet: (times = 1) => Object.assign(get, { mode: 'error', times }),
    delayGet: (ms: number, times = 1) => Object.assign(get, { mode: 'delay', times, delayMs: ms }),
    reset: () => {
      Object.assign(post, { mode: 'ok', times: 0, delayMs: 0 });
      Object.assign(get, { mode: 'ok', times: 0, delayMs: 0 });
    },
  };

  worker.use(
    http.post('/api/history', async () => applyFault(post)),
    http.get('/api/history', async () => applyFault(get)),
    http.get('/api/ranking', async () => applyFault(get)),
  );
}
