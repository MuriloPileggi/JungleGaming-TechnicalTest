import { expect, test } from '@playwright/test';
import {
  damagePlayer,
  getState,
  gotoGame,
  fastForward,
  spawnEnemy,
  pageIsMatchRunning,
} from './helpers';

test('timeout ends the match with a full freeze', async ({ page }) => {
  await gotoGame(page, { seed: 31, duration: 120 });
  await spawnEnemy(page, 'chaser', 0, -300);
  await page.keyboard.press('Space'); // a projectile in flight when time expires
  await fastForward(page, 120);

  await expect(page.getByText('TIME UP')).toBeVisible({ timeout: 5_000 });
  const s1 = await getState(page);
  expect(s1.matchState).toBe('ended');
  expect(s1.endReason).toBe('timeout');

  await page.waitForTimeout(1_000);
  const s2 = await getState(page);
  expect(s2.timeRemaining).toBe(s1.timeRemaining);
  expect(s2.durationPlayed).toBe(s1.durationPlayed);
  expect(s2.enemies).toEqual(s1.enemies); // frozen mid-chase
  expect(s2.projectiles).toEqual(s1.projectiles); // frozen mid-air
});

test('death ends the match; result persists after refresh', async ({ page }) => {
  await gotoGame(page, { seed: 32, duration: 120 });
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });

  const persisted = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pirate-battle:last-result') ?? 'null'),
  );
  expect(persisted).toMatchObject({ endReason: 'death' });

  await page.reload();
  await page.goto('/');
  await expect(page.getByText('Last voyage')).toBeVisible();
  await expect(page.getByText(/· death/)).toBeVisible();
});

test('play again produces a clean restart', async ({ page }) => {
  await gotoGame(page, { seed: 33, duration: 60 });
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });

  await page.getByRole('button', { name: /play again/i }).click();
  await page.waitForFunction(pageIsMatchRunning, undefined, { timeout: 15_000 });
  const s = await getState(page);
  expect(s.hp).toBe(100);
  expect(s.score).toBe(0);
  expect(s.timeRemaining).toBeGreaterThan(55);
  expect(await page.locator('canvas').count()).toBe(1);
});
