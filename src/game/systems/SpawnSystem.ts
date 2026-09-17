import { GameConfig } from '../../config/gameConfig';
import type { Rng } from '../rng';
import type { CollisionSystem } from './CollisionSystem';
import type { EnemyKind } from '../entities/Enemy';

export interface SpawnRequest {
  kind: EnemyKind;
  x: number;
  y: number;
}

export class SpawnSystem {
  private timer: number;
  private interval: number;
  private rng: Rng;
  private collision: CollisionSystem;

  constructor(rng: Rng, collision: CollisionSystem, interval: number) {
    this.interval = interval;
    this.timer = interval; // first spawn one interval in, not at t=0
    this.rng = rng;
    this.collision = collision;
  }

  setInterval(seconds: number): void {
    this.interval = seconds;
  }

  update(dt: number, playerX: number, playerY: number): SpawnRequest | null {
    this.timer -= dt;
    if (this.timer > 0) return null;
    this.timer = this.interval;

    const point = this.findSpawnPoint(playerX, playerY);
    if (!point) return null; // skip this cycle rather than spawn in a wall
    return { ...point, kind: this.rng.next() < 0.5 ? 'chaser' : 'shooter' };
  }

  private findSpawnPoint(px: number, py: number): { x: number; y: number } | null {
    const { width, height } = GameConfig.arena;
    const margin = GameConfig.ship.size;

    for (let attempt = 0; attempt < 24; attempt++) {
      const x = this.rng.range(margin, width - margin);
      const y = this.rng.range(margin, height - margin);
      if (Math.hypot(x - px, y - py) < GameConfig.match.spawnMinDistanceFromPlayer) continue;
      // require some clearance, not just "center not in a wall"
      if (this.collision.circleHitsSolid({ x, y, r: GameConfig.ship.collisionRadius * 1.5 }))
        continue;
      return { x, y };
    }
    return null;
  }
}
