import { expect, test } from '@playwright/test';
import { getState, pageIsMatchRunning } from './helpers';

test('asset failure shows error state; retry recovers', async ({ page }) => {
  await page.goto('/game?test=1&seed=42&failAssets=1');
  await expect(page.getByRole('alert')).toContainText(/failed to load/i);
  await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();

  await page.getByRole('button', { name: /retry/i }).click(); // strips failAssets, reloads
  await page.waitForFunction(pageIsMatchRunning, undefined, { timeout: 20_000 });
  const s = await getState(page);
  expect(s.matchState).toBe('running');
});
