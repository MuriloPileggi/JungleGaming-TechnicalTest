import { Graphics } from 'pixi.js';

export type ProjectileOwner = 'player' | 'enemy';
export type DeathCause = 'ship' | 'island' | 'water';

export interface ProjectileOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetime: number;
  owner: ProjectileOwner;
  color: number;
}

export class Projectile {
  readonly view: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  lifetime: number;
  owner: ProjectileOwner;
  alive = true;
  deathCause: DeathCause | null = null;

  constructor(opts: ProjectileOptions) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.damage = opts.damage;
    this.lifetime = opts.lifetime;
    this.owner = opts.owner;

    // Placeholder cannonball visual. Swap for Sprite.from(cannonballPath)
    // in the polish block once you pick the texture.
    this.view = new Graphics();
    this.view.circle(0, 0, 5).fill(opts.color);
    this.view.circle(0, 0, 2.5).fill(0xd9d9d9);
    this.view.zIndex = 8;
    this.view.position.set(this.x, this.y);
  }

  update(dt: number): void {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;
    this.view.position.set(this.x, this.y);
    if (this.lifetime <= 0) {
      this.alive = false;
      this.deathCause ??= 'water';
    }
  }
}
