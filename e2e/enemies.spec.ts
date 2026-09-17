import { expect, Page, test } from '@playwright/test';
import { getTestConfig, getState, gotoGame, spawnEnemy, waitFor } from './helpers';

async function enemyDistance(page: Page): Promise<number> {
  return page.evaluate(() => {
    const api = (
      window as unknown as {
        __PIRATE_TEST__: {
          getState(): {
            player: { x: number; y: number } | null;
            enemies: Array<{ x: number; y: number }>;
          };
        };
      }
    ).__PIRATE_TEST__;
    const s = api.getState();
    const e = s.enemies[0];
    if (!e || !s.player) return Number.NaN;
    return Math.hypot(e.x - s.player.x, e.y - s.player.y);
  });
}

test('chaser closes distance toward the player', async ({ page }) => {
  await gotoGame(page, { seed: 21 });
  await spawnEnemy(page, 'chaser', 0, -400);
  const d0 = await enemyDistance(page);
  await page.waitForTimeout(1500);
  const d1 = await enemyDistance(page);
  expect(d1).toBeLessThan(d0 - 50);
});

test('shooter holds range and fires at the player', async ({ page }) => {
  await gotoGame(page, { seed: 22 });
  const c = await getTestConfig(page);
  const start = Math.round(c.enemies.shooter.approachRange * 1.2); // start OUTSIDE hold range
  await spawnEnemy(page, 'shooter', 0, -start);

  // In-page observer: no polling latency, catches short-lived projectiles.
  const sawShot = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const api = (
          window as unknown as {
            __PIRATE_TEST__: { getState(): { projectiles: Array<{ owner: string }> } };
          }
        ).__PIRATE_TEST__;
        const t0 = Date.now();
        const tick = (): void => {
          if (api.getState().projectiles.some((p) => p.owner === 'enemy')) return resolve(true);
          if (Date.now() - t0 > 8_000) return resolve(false);
          requestAnimationFrame(tick);
        };
        tick();
      }),
  );
  expect(sawShot).toBe(true);

  const s = await getState(page);
  const dist = Math.hypot(s.enemies[0].x - s.player!.x, s.enemies[0].y - s.player!.y);
  expect(dist).toBeGreaterThan(c.enemies.shooter.approachRange * 0.4);
});

test('natural spawns respect the configured interval', async ({ page }) => {
  await gotoGame(page, { seed: 23, spawn: 2 });
  const s1 = await waitFor(page, (s) => s.enemies.length >= 1, 8_000);
  const s2 = await waitFor(page, (s) => s.enemies.length >= 2, 8_000);

  expect(s1.durationPlayed).toBeLessThan(1.5); // firstSpawnDelay = 0 → near-immediate
  const gap = s2.durationPlayed - s1.durationPlayed; // in GAME seconds
  expect(gap).toBeGreaterThan(1.7);
  expect(gap).toBeLessThan(2.6);
});
