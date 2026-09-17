import { Container, Graphics, Sprite } from 'pixi.js';
import { GameConfig } from '../../config/gameConfig';
import type { CollisionSystem } from '../systems/CollisionSystem';
import type { Player } from './Player';

export type EnemyKind = 'chaser' | 'shooter';
export type DamageSource = 'player' | 'other';
export type FireCallback = (x: number, y: number, vx: number, vy: number) => void;

/** Ship art faces "up" (−Y); heading 0 = east. */
const ART_ROTATION_OFFSET = Math.PI / 2;

export class Enemy {
  /** Position & zIndex live here. Pixi v8: Sprites are leaves — only Containers hold children. */
  readonly root = new Container();
  readonly sprite: Sprite;
  readonly kind: EnemyKind;
  readonly maxHp: number;
  hp: number;
  heading: number;
  alive = true;
  /** true only when a player projectile landed the killing blow */
  killedByPlayer = false;

  private fireCd: number;
  private readonly hpBar = new Graphics();

  constructor(kind: EnemyKind, textureKey: string, x: number, y: number, heading: number) {
    this.kind = kind;
    const cfg = GameConfig.enemies[kind];
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.heading = heading;
    if (kind === 'shooter') {
      this.fireCd = GameConfig.enemies.shooter.fireCooldown;
    } else {
      this.fireCd = 0;
    }

    this.sprite = Sprite.from(textureKey);
    this.sprite.anchor.set(0.5);
    this.sprite.rotation = heading + ART_ROTATION_OFFSET;

    this.root.position.set(x, y);
    this.root.zIndex = 9;
    this.root.addChild(this.sprite);

    // Sibling of the sprite → stays upright for free, no counter-rotation
    this.hpBar.position.set(0, -GameConfig.ship.size * 0.75);
    this.root.addChild(this.hpBar);
    this.redrawHpBar();
  }

  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }
  get radius(): number {
    return GameConfig.ship.collisionRadius;
  }

  update(dt: number, player: Player, collision: CollisionSystem, fire: FireCallback): void {
    if (!this.alive) return;

    const dx = player.sprite.x - this.x;
    const dy = player.sprite.y - this.y;
    const dist = Math.hypot(dx, dy);
    const desired = Math.atan2(dy, dx);

    if (this.kind === 'chaser') {
      const cfg = GameConfig.enemies.chaser;
      this.turnToward(desired, cfg.turnRateDeg, dt);
      this.advance(collision, cfg.speed, dt);
    } else {
      const cfg = GameConfig.enemies.shooter;
      this.turnToward(desired, cfg.turnRateDeg, dt);
      if (dist > cfg.approachRange) this.advance(collision, cfg.speed, dt);

      this.fireCd -= dt;
      if (this.fireCd <= 0 && dist <= cfg.approachRange && this.angleTo(desired) < 0.3) {
        const fx = Math.cos(this.heading);
        const fy = Math.sin(this.heading);
        const muzzle = GameConfig.ship.size / 2;
        fire(
          this.x + fx * muzzle,
          this.y + fy * muzzle,
          fx * cfg.projectileSpeed,
          fy * cfg.projectileSpeed,
        );
        this.fireCd = cfg.fireCooldown;
      }
    }

    this.sprite.rotation = this.heading + ART_ROTATION_OFFSET;
  }

  /** Returns true if this damage killed the enemy. */
  takeDamage(amount: number, source: DamageSource): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    this.redrawHpBar();
    if (this.hp <= 0) {
      this.alive = false;
      this.killedByPlayer = source === 'player';
      return true;
    }
    return false;
  }

  private advance(collision: CollisionSystem, speed: number, dt: number): void {
    collision.moveCircle(
      this.root,
      Math.cos(this.heading) * speed * dt,
      Math.sin(this.heading) * speed * dt,
      this.radius,
    );
  }

  private turnToward(desired: number, rateDeg: number, dt: number): void {
    const rate = (rateDeg * Math.PI) / 180;
    const diff = this.angleToSigned(desired);
    this.heading += Math.sign(diff) * Math.min(Math.abs(diff), rate * dt);
  }

  private angleTo(desired: number): number {
    return Math.abs(this.angleToSigned(desired));
  }

  private angleToSigned(desired: number): number {
    let diff = desired - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  private redrawHpBar(): void {
    const w = 40;
    const h = 5;
    this.hpBar.clear();
    this.hpBar.rect(-w / 2, -h / 2, w, h).fill(0x3a0d0d);
    const frac = Math.max(0, this.hp / this.maxHp);
    if (frac > 0) this.hpBar.rect(-w / 2, -h / 2, w * frac, h).fill(0x37c24a);
  }
}
