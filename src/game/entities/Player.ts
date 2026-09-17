import { Sprite } from 'pixi.js';
import { GameConfig } from '../../config/gameConfig';
import type { InputSystem } from '../systems/InputSystem';
import type { CollisionSystem } from '../systems/CollisionSystem';

/** Ship art faces "up" (−Y); heading 0 points +X (east). */
const ART_ROTATION_OFFSET = Math.PI / 2;

export class Player {
  readonly sprite: Sprite;
  heading = -Math.PI / 2;
  speed = 0;
  hp = GameConfig.ship.maxHp;

  private arena: { width: number; height: number };

  constructor(textureKey: string, arena: { width: number; height: number }) {
    this.sprite = Sprite.from(textureKey);
    this.sprite.anchor.set(0.5);
    this.sprite.zIndex = 10;
    this.arena = arena;
  }

  update(dt: number, input: InputSystem, collision: CollisionSystem): void {
    const { ship } = GameConfig;
    const rot = (ship.rotationSpeedDeg * Math.PI) / 180;

    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) this.heading -= rot * dt;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) this.heading += rot * dt;

    if (input.isDown('KeyW') || input.isDown('ArrowUp')) {
      this.speed += ship.acceleration * dt;
    } else {
      this.speed *= Math.pow(ship.drag, 60 * dt);
      if (Math.abs(this.speed) < 2) this.speed = 0;
    }
    this.speed = Math.max(-ship.maxSpeed * 0.4, Math.min(this.speed, ship.maxSpeed));

    // Position changes ONLY via the collision system — never integrate directly.
    const dx = Math.cos(this.heading) * this.speed * dt;
    const dy = Math.sin(this.heading) * this.speed * dt;
    collision.moveCircle(this.sprite, dx, dy, ship.collisionRadius);

    this.sprite.rotation = this.heading + ART_ROTATION_OFFSET;

    // Arena bounds as final safety net
    const half = ship.collisionRadius;
    this.sprite.x = Math.max(half, Math.min(this.sprite.x, this.arena.width - half));
    this.sprite.y = Math.max(half, Math.min(this.sprite.y, this.arena.height - half));
  }
}
