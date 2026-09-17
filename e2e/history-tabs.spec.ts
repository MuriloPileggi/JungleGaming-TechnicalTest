import { expect, test } from '@playwright/test';
import { apiFault, historyEntries, seedHistory } from './helpers';

test('ranking and history tabs paginate independently', async ({ page }) => {
  await seedHistory(page, historyEntries(12));
  await page.goto('/history');

  await expect(page.getByTestId('ranking-row')).toHaveCount(5);
  await expect(page.getByTestId('page-indicator')).toContainText('Page 1 / 3');
  const firstPageTop = await page.getByTestId('ranking-row').first().innerText();

  await page.getByTestId('next-page').click();
  await expect(page.getByTestId('page-indicator')).toContainText('Page 2 / 3');
  expect(await page.getByTestId('ranking-row').first().innerText()).not.toBe(firstPageTop);

  await page.getByRole('tab', { name: /match history/i }).click();
  await expect(page.getByTestId('page-indicator')).toContainText('Page 1 / 3'); // tab switch resets page
  await expect(page.getByTestId('history-row')).toHaveCount(5);
});

test('empty state on a fresh profile', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByTestId('empty-state')).toBeVisible();
});

test('loading and error states with retry', async ({ page }) => {
  await seedHistory(page, historyEntries(3));
  await page.goto('/history?test=1');
  await expect(page.getByTestId('ranking-row').first()).toBeVisible(); // hooks live, data loaded

  await apiFault(page, 'failGet', 2); // retry:1 ⇒ one query = up to 2 requests
  await page.getByRole('tab', { name: /match history/i }).click(); // fresh GET → 500 → error UI
  await expect(page.getByRole('alert')).toBeVisible();

  await page.getByTestId('retry').click(); // faults exhausted → success
  await expect(page.getByTestId('history-row').first()).toBeVisible();
});
