import { expect, test } from '@playwright/test';
import { getState, gotoGame } from './helpers';

test('P pauses; timer and sim freeze; P resumes', async ({ page }) => {
  await gotoGame(page, { seed: 3, duration: 120 });
  await page.keyboard.press('KeyP');
  const s1 = await getState(page);
  expect(s1.paused).toBe(true);
  await expect(page.getByText('PAUSED')).toBeVisible();

  await page.waitForTimeout(1000);
  const s2 = await getState(page);
  expect(s2.timeRemaining).toBe(s1.timeRemaining);
  expect(s2.durationPlayed).toBe(s1.durationPlayed);

  await page.keyboard.press('KeyP');
  const s3 = await getState(page);
  expect(s3.paused).toBe(false);
  expect(s3.durationPlayed).toBeGreaterThan(s2.durationPlayed);
});

test('blur pauses; resume does not advance the clock', async ({ page }) => {
  await gotoGame(page, { seed: 3, duration: 120 });
  const t0 = (await getState(page)).timeRemaining;
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await getState(page)).paused).toBe(true);
  await page.waitForTimeout(1500);
  await page.mouse.click(400, 300); // resume via pointer
  await page.waitForTimeout(200);
  const s = await getState(page);
  expect(s.paused).toBe(false);
  // ≤ ~0.3s of sim ran before blur + after resume; the 1.5s pause cost nothing
  expect(t0 - s.timeRemaining).toBeLessThan(0.5);
});
