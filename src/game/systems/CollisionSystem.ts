import { GameConfig } from '../../config/gameConfig';
import type { TileMap } from '../arena/TileMap';

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export class CollisionSystem {
  private map: TileMap;

  constructor(map: TileMap) {
    this.map = map;
  }

  /** True if the circle overlaps any solid tile. */
  circleHitsSolid(c: Circle): boolean {
    const ts = GameConfig.arena.tileSize;
    const minCol = this.map.colOf(c.x - c.r);
    const maxCol = this.map.colOf(c.x + c.r);
    const minRow = this.map.rowOf(c.y - c.r);
    const maxRow = this.map.rowOf(c.y + c.r);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        if (!this.map.isSolid(col, row)) continue;
        if (this.circleVsAabb(c, col * ts, row * ts, ts, ts)) return true;
      }
    }
    return false;
  }

  /** Point test — used later by projectiles. */
  pointBlocked(x: number, y: number): boolean {
    return this.map.isSolidWorld(x, y);
  }

  /**
   * Separated-axis move with collision. Mutates pos in place.
   * Sliding along walls emerges naturally from the per-axis undo.
   */
  moveCircle(pos: { x: number; y: number }, dx: number, dy: number, r: number): void {
    pos.x += dx;
    if (this.circleHitsSolid({ x: pos.x, y: pos.y, r })) pos.x -= dx;

    pos.y += dy;
    if (this.circleHitsSolid({ x: pos.x, y: pos.y, r })) pos.y -= dy;
  }

  private circleVsAabb(c: Circle, rx: number, ry: number, rw: number, rh: number): boolean {
    const nearestX = Math.max(rx, Math.min(c.x, rx + rw));
    const nearestY = Math.max(ry, Math.min(c.y, ry + rh));
    const dx = c.x - nearestX;
    const dy = c.y - nearestY;
    return dx * dx + dy * dy <= c.r * c.r;
  }
}
