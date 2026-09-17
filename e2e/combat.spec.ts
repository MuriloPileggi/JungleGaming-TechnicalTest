import { expect, test } from '@playwright/test';
import { getTestConfig, getState, gotoGame, spawnEnemy, waitFor, healPlayer } from './helpers';

test('frontal fire: single ball, cooldown blocks spam', async ({ page }) => {
  await gotoGame(page, { seed: 11 });
  await page.keyboard.press('Space');
  let s = await waitFor(page, (st) => st.projectiles.some((p) => p.owner === 'player'));
  expect(s.projectiles.filter((p) => p.owner === 'player')).toHaveLength(1);

  await page.keyboard.press('Space'); // immediately again → on cooldown
  await page.waitForTimeout(150);
  s = await getState(page);
  expect(s.projectiles.filter((p) => p.owner === 'player')).toHaveLength(1);
});

test('lateral fire produces a broadside volley', async ({ page }) => {
  await gotoGame(page, { seed: 11 });
  await page.keyboard.press('KeyQ');
  const s = await waitFor(page, (st) => st.projectiles.some((p) => p.owner === 'player'));
  expect(s.projectiles.filter((p) => p.owner === 'player').length).toBeGreaterThan(1);
});

test('killing a shooter scores its points exactly once', async ({ page }) => {
  await gotoGame(page, { seed: 12 });
  const c = await getTestConfig(page);
  const before = await getState(page);
  await spawnEnemy(page, 'shooter', 0, -400);

  const deadline = Date.now() + 25_000;
  let killed = false;
  while (Date.now() < deadline && !killed) {
    const s = await getState(page);
    if (s.matchState === 'ended') throw new Error('match ended before the kill landed');
    if (s.kills > before.kills) {
      killed = true;
      break;
    }
    if (s.enemies.length === 0) await spawnEnemy(page, 'shooter', 0, -400);
    await healPlayer(page, 40); // the hunter outlives the hunt
    await page.keyboard.press('Space');
    await page.waitForTimeout(700); // > frontal cooldown; tune to your config
  }
  expect(killed, 'shooter was not killed within 25s of frontal fire').toBe(true);

  const after = await getState(page);
  expect(after.kills).toBe(before.kills + 1);
  expect(after.score).toBe(before.score + c.enemies.shooter.points); // exactly once
});

test('chaser contact damages the player and scores nothing', async ({ page }) => {
  await gotoGame(page, { seed: 13 });
  const c = await getTestConfig(page);
  const before = await getState(page);
  await spawnEnemy(page, 'chaser', 0, -80);
  const after = await waitFor(page, (st) => st.hp < before.hp, 15_000);
  expect(after.hp).toBe(before.hp - c.enemies.chaser.contactDamage);
  expect(after.score).toBe(before.score);
});
