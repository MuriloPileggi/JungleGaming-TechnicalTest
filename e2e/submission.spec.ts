import { expect, test } from '@playwright/test';
import { apiFault, damagePlayer, gotoGame, pendingDrained } from './helpers';

test('match registration updates ranking and history tabs', async ({ page }) => {
  await gotoGame(page, { seed: 51, duration: 120 });
  await page.waitForTimeout(500); // let the unlock gesture happen
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });

  await page.goto('/history');
  await expect(page.getByTestId('ranking-row')).toHaveCount(1);
  await page.getByRole('tab', { name: /match history/i }).click();
  await expect(page.getByTestId('history-row')).toHaveCount(1);
});

test('pending submission recovers after refresh', async ({ page }) => {
  await gotoGame(page, { seed: 52, duration: 120 });
  await apiFault(page, 'dropPost', 1); // POST will fail like a dropped connection
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });

  const pending = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('pirate-battle:pending') ?? '[]'),
  );
  expect(pending).toHaveLength(1);

  await apiFault(page, 'reset');
  await page.reload(); // boot-time flushPending retries
  await page.waitForFunction(pendingDrained, undefined, { timeout: 8_000 }); // ← pinpoints boot flush
  await page.goto('/history');
  await page.getByRole('tab', { name: /match history/i }).click(); // ← default tab is ranking
  await expect(page.getByTestId('history-row')).toHaveCount(1);
});

test('resend after failure never duplicates', async ({ page }) => {
  await gotoGame(page, { seed: 53, duration: 120 });
  await apiFault(page, 'dropPost', 1); // match-end POST dies like a dropped connection
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });

  await page.reload(); // boot flush #1 → succeeds
  await page.waitForFunction(pendingDrained, undefined, { timeout: 8_000 });
  await page.reload(); // boot flush #2 → queue empty, no-op

  // Idempotency at the contract level: replaying the same clientId must not duplicate.
  const { status, total } = await page.evaluate(async () => {
    const result = JSON.parse(localStorage.getItem('pirate-battle:last-result') ?? 'null');
    const post = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    });
    const data = (await (await fetch('/api/history?page=1')).json()) as { total: number };
    return { status: post.status, total: data.total };
  });
  expect(status).toBe(200); // recognized as duplicate — NOT 201
  expect(total).toBe(1); // clientId dedupe held

  await page.goto('/history');
  await page.getByRole('tab', { name: /match history/i }).click(); // ← default tab is ranking
  await expect(page.getByTestId('history-row')).toHaveCount(1);
});

test('delayed POST response still lands without clobbering fresh data', async ({ page }) => {
  await gotoGame(page, { seed: 54, duration: 120 });
  await apiFault(page, 'delayPost', 3_000, 1); // server responds 3s late
  await damagePlayer(page, 100);
  await expect(page.getByText('SHIP SUNK')).toBeVisible({ timeout: 5_000 });

  await page.goto('/history'); // arrives while the POST is still in flight
  await expect(page.getByTestId('ranking-row')).toHaveCount(1, { timeout: 8_000 }); // invalidation after late success
  await page.waitForTimeout(1_000);
  await expect(page.getByTestId('ranking-row')).toHaveCount(1); // and it stays — no stale overwrite
});
