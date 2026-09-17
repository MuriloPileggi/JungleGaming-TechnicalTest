import { expect, type Page } from '@playwright/test';

export interface TestGameState {
  score: number;
  kills: number;
  hp: number;
  timeRemaining: number;
  durationPlayed: number;
  matchState: 'running' | 'ended';
  endReason: 'timeout' | 'death' | null;
  paused: boolean;
  player: { x: number; y: number; heading: number; speed: number } | null;
  enemies: Array<{ kind: 'chaser' | 'shooter'; x: number; y: number; hp: number; alive: boolean }>;
  projectiles: Array<{ owner: 'player' | 'enemy'; x: number; y: number }>;
}

export function pageIsMatchRunning(): boolean {
  const w = window as unknown as { __PIRATE_TEST__?: { getState(): { matchState: string } } };
  return w.__PIRATE_TEST__?.getState().matchState === 'running';
}

/** waitForFunction body: pending queue fully flushed. */
export function pendingDrained(): boolean {
  return JSON.parse(localStorage.getItem('pirate-battle:pending') ?? '[]').length === 0;
}

export async function gotoGame(
  page: Page,
  opts: { seed?: number; duration?: number; spawn?: number; touch?: boolean } = {},
): Promise<void> {
  const params = new URLSearchParams({
    test: '1',
    seed: String(opts.seed ?? 42),
    spawn: String(opts.spawn ?? 999),
  });
  if (opts.duration) params.set('duration', String(opts.duration));
  if (opts.touch) params.set('touch', '1');
  await page.goto(`/game?${params}`);
  await page.waitForFunction(
    () =>
      (
        window as unknown as { __PIRATE_TEST__?: { getState(): { matchState: string } } }
      ).__PIRATE_TEST__?.getState().matchState === 'running',
    undefined,
    { timeout: 20_000 },
  );
}

export function getState(page: Page): Promise<TestGameState> {
  return page.evaluate(() =>
    (
      window as unknown as { __PIRATE_TEST__: { getState(): TestGameState } }
    ).__PIRATE_TEST__.getState(),
  );
}

export function fastForward(page: Page, seconds: number): Promise<void> {
  return page.evaluate((s) => {
    (
      window as unknown as { __PIRATE_TEST__: { fastForward(n: number): void } }
    ).__PIRATE_TEST__.fastForward(s);
  }, seconds);
}

export async function seedHistory(
  page: Page,
  entries: Array<Record<string, unknown>>,
): Promise<void> {
  await page.addInitScript((data) => {
    localStorage.setItem('pirate-battle:history', JSON.stringify(data));
  }, entries);
}

export const expectNoConsoleErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  return () => expect(errors, `console errors: ${errors.join('; ')}`).toHaveLength(0);
};

export async function waitFor(
  page: Page,
  pred: (s: TestGameState) => boolean,
  timeout = 10_000,
): Promise<TestGameState> {
  const start = Date.now();
  for (;;) {
    const s = await getState(page);
    if (pred(s)) return s;
    if (Date.now() - start > timeout) throw new Error(`waitFor timed out after ${timeout}ms`);
    await page.waitForTimeout(100);
  }
}

export async function apiFault(page: Page, method: string, ...args: unknown[]): Promise<void> {
  await page.evaluate(
    ([m, a]) => {
      const f = (window as unknown as Record<string, Record<string, (...x: unknown[]) => void>>)
        .__API_FAULTS__;
      f[m](...a);
    },
    [method, args] as [string, unknown[]],
  );
}

export async function getTestConfig(page: Page): Promise<{
  enemies: Record<
    string,
    { points: number; contactDamage: number; approachRange: number; fireCooldown: number }
  >;
  ship: { maxHp: number };
  weapons: Record<string, unknown>;
}> {
  return page.evaluate(
    () => (window as unknown as { __PIRATE_TEST__: { config: never } }).__PIRATE_TEST__.config,
  ) as never;
}

export async function holdButton(page: Page, testId: string, ms: number): Promise<void> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`no bounding box for ${testId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

export function historyEntries(count: number): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, i) => ({
    clientId: `seed-${i}`,
    score: (count - i) * 10,
    enemiesKilled: count - i,
    durationPlayed: 60,
    endReason: i % 2 === 0 ? 'timeout' : 'death',
    endedAt: new Date(Date.now() - i * 60_000).toISOString(),
  }));
}

export async function damagePlayer(page: Page, amount: number): Promise<void> {
  await page.evaluate((a) => {
    (
      window as unknown as { __PIRATE_TEST__: { damagePlayer(n: number): void } }
    ).__PIRATE_TEST__.damagePlayer(a);
  }, amount);
}

export async function spawnEnemy(
  page: Page,
  kind: 'chaser' | 'shooter',
  dx: number,
  dy: number,
): Promise<void> {
  // dx/dy relative to the player, applied in-page
  await page.evaluate(
    ([k, ddx, ddy]) => {
      const api = (
        window as unknown as {
          __PIRATE_TEST__: {
            spawnEnemy(kind: string, x: number, y: number): void;
            getState(): { player: { x: number; y: number } | null };
          };
        }
      ).__PIRATE_TEST__;
      const p = api.getState().player!;
      api.spawnEnemy(k, p.x + ddx, p.y + ddy);
    },
    [kind, dx, dy] as const,
  );
}

export async function healPlayer(page: Page, amount: number): Promise<void> {
  await page.evaluate((a) => {
    (
      window as unknown as { __PIRATE_TEST__: { healPlayer(n: number): void } }
    ).__PIRATE_TEST__.healPlayer(a);
  }, amount);
}
