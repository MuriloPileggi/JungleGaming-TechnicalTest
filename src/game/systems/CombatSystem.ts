import { GameConfig } from '../../config/gameConfig';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { Projectile } from '../entities/Projectile';

export interface CombatResult {
  playerDamage: number;
  playerKills: Enemy[]; // killed by player projectiles → score
  otherDeaths: Enemy[]; // contact explosions etc. → no score
  playerHitPositions: Array<{ x: number; y: number }>;
}

export class CombatSystem {
  resolve(
    projectiles: readonly Projectile[],
    enemies: readonly Enemy[],
    player: Player,
  ): CombatResult {
    const result: CombatResult = {
      playerDamage: 0,
      playerKills: [],
      otherDeaths: [],
      playerHitPositions: [],
    };
    const pr = GameConfig.ship.collisionRadius;

    for (const p of projectiles) {
      if (!p.alive) continue;

      if (p.owner === 'player') {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (overlaps(p.x, p.y, e.x, e.y, e.radius)) {
            p.alive = false;
            if (e.takeDamage(p.damage, 'player')) result.playerKills.push(e);
            break; // projectile is spent
          }
        }
      } else if (overlaps(p.x, p.y, player.sprite.x, player.sprite.y, pr)) {
        p.alive = false;
        player.hp -= p.damage;
        result.playerDamage += p.damage;
        result.playerHitPositions.push({ x: p.x, y: p.y });
      }
    }

    // Chaser contact detonation
    for (const e of enemies) {
      if (!e.alive || e.kind !== 'chaser') continue;
      if (overlaps(player.sprite.x, player.sprite.y, e.x, e.y, pr + e.radius)) {
        e.alive = false;
        e.killedByPlayer = false;
        player.hp -= GameConfig.enemies.chaser.contactDamage;
        result.playerDamage += GameConfig.enemies.chaser.contactDamage;
        result.otherDeaths.push(e);
      }
    }

    return result;
  }
}

function overlaps(ax: number, ay: number, bx: number, by: number, r: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy <= r * r;
}
