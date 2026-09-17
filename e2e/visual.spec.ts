import { expect, test } from '@playwright/test';
import { damagePlayer, gotoGame } from './helpers';

test('main menu visual baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /set sail/i })).toBeVisible();
  await expect(page).toHaveScreenshot('main-menu.png');
});

test('stable arena visual baseline', async ({ page }) => {
  await gotoGame(page, { seed: 42, spawn: 999 });
  await page.waitForTimeout(1_200);
  // Freeze sim + clock, then pin the visual time to an exact value.
  await page.evaluate(() => {
    const api = (
      window as unknown as {
        __PIRATE_TEST__: { setPaused(p: boolean): void };
      }
    ).__PIRATE_TEST__;
    api.setPaused(true);
  });
  await page.waitForTimeout(200); // let the paused frame settle
  await expect(page).toHaveScreenshot('arena-stable.png', {
    mask: [page.getByTestId('hud-bar'), page.getByTestId('touch-fire')],
  });
});

test('result screen visual baseline', async ({ page }) => {
  await gotoGame(page, { seed: 43, duration: 120 });
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('dialog')).toHaveScreenshot('result-screen.png', {
    mask: [page.getByText(/time played/i)], // wall-clock dependent
  });
});
