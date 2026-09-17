import { expect, test } from '@playwright/test';
import { getState, gotoGame, holdButton, waitFor } from './helpers';

test('repeated screen navigation leaks no canvases', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  for (let i = 0; i < 3; i++) {
    await page.goto('/');
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: /set sail/i }).click();
    await expect(page.getByTestId('hud-bar')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.getByRole('button', { name: /quit to menu/i }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('link', { name: /options/i }).click();
    await page.getByRole('link', { name: /back to menu/i }).click();
  }
  expect(errors).toEqual([]);
});

test('touch controls sail and fire through the real input path', async ({ page }) => {
  await gotoGame(page, { seed: 41, touch: true });
  await holdButton(page, 'touch-throttle', 700);
  const s1 = await getState(page);
  expect(s1.player!.speed).toBeGreaterThan(5);

  await holdButton(page, 'touch-fire', 60);
  const s2 = await waitFor(page, (s) => s.projectiles.some((p) => p.owner === 'player'), 3_000);
  expect(s2.projectiles.length).toBeGreaterThan(0);
});
