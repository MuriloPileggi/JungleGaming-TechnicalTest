import { expect, test } from '@playwright/test';
import { getState, gotoGame } from './helpers';

test.describe('movement & collision', () => {
  test('W accelerates along heading', async ({ page }) => {
    await gotoGame(page, { seed: 42 });
    const before = await getState(page);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(600);
    const after = await getState(page);
    await page.keyboard.up('KeyW');

    expect(after.player!.speed).toBeGreaterThan(10);
    expect(after.player!.y).toBeLessThan(before.player!.y); // spawns heading north
  });

  test('A/D rotate the ship', async ({ page }) => {
    await gotoGame(page, { seed: 42 });
    const h0 = (await getState(page)).player!.heading;
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    const h1 = (await getState(page)).player!.heading;
    expect(h1).toBeGreaterThan(h0);
  });

  test('ship never enters solid tiles; arena bounds clamp', async ({ page }) => {
    await gotoGame(page, { seed: 7 });
    const samples: Array<{ x: number; y: number }> = [];
    // Sail in a wide arc for 10s, sampling position; no sample may be solid,
    // and position must stay inside the arena.
    await page.keyboard.down('KeyW');
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(500);
      const s = await getState(page);
      samples.push({ x: s.player!.x, y: s.player!.y });
      if (i === 6) {
        await page.keyboard.down('KeyD');
      } // turn into whatever lies ahead
      if (i === 12) {
        await page.keyboard.up('KeyD');
      }
    }
    await page.keyboard.up('KeyW');

    const solids = await page.evaluate(
      (pts) =>
        pts.map((p) =>
          (
            window as unknown as { __PIRATE_TEST__: { isSolid(x: number, y: number): boolean } }
          ).__PIRATE_TEST__.isSolid(p.x, p.y),
        ),
      samples,
    );
    expect(solids.some(Boolean)).toBe(false);
    for (const p of samples) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(2400);
      expect(p.y).toBeLessThanOrEqual(2400);
    }
  });
});
