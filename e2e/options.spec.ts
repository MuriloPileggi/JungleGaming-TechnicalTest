import { expect, test } from '@playwright/test';

test('options change persists and reaches the match', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /options/i }).click();
  await page.getByLabel('Match length').selectOption('60');
  await page.getByRole('link', { name: /back to menu/i }).click();
  await expect(page.getByText('Match length: 1:00')).toBeVisible();

  await page.reload(); // persistence across reload
  await expect(page.getByText('Match length: 1:00')).toBeVisible();

  await page.getByRole('button', { name: /set sail/i }).click();
  await expect(page.getByTestId('hud-bar')).toContainText('1:00', { timeout: 20_000 });
});

test('invalid persisted options fall back to defaults', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('pirate-battle:options', '{"matchDuration":7,"spawnInterval":-3}');
  });
  await page.goto('/options');
  await expect(page.getByLabel('Match length')).toHaveValue('60');
  await expect(page.getByLabel('Enemy spawn interval')).toHaveValue('5');
});
