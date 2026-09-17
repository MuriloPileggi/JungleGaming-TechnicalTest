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
