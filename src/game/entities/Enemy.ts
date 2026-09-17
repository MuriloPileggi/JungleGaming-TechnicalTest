import { Container, Graphics, Sprite } from 'pixi.js';
import { GameConfig } from '../../config/gameConfig';
import type { Rng } from '../rng';
import type { CollisionSystem } from '../systems/CollisionSystem';
import type { Player } from './Player';

export type EnemyKind = 'chaser' | 'shooter';
export type DamageSource = 'player' | 'other';
export type FireCallback = (x: number, y: number, vx: number, vy: number) => void;

const ART_ROTATION_OFFSET = Math.PI / 2;
const STUCK_THRESHOLD_S = 0.6; // negligible progress for this long → wedged
const AVOID_DURATION_S = 0.9; // how long a detour lasts

export class Enemy {
  readonly root = new Container();
  readonly sprite: Sprite;
  readonly kind: EnemyKind;
  readonly maxHp: number;
  hp: number;
  heading: number;
  alive = true;
  killedByPlayer = false;

  private fireCd: number;
  private readonly hpBar = new Graphics();
  private readonly rng: Rng;

  // stuck detection / avoidance state
  private prevX: number;
  private prevY: number;
  private stuckTime = 0;
  private avoidTime = 0;
  private avoidHeading = 0;

  constructor(
    kind: EnemyKind,
    textureKey: string,
    x: number,
    y: number,
    heading: number,
    rng: Rng,
  ) {
    this.kind = kind;
    this.rng = rng;
    const cfg = GameConfig.enemies[kind];
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.heading = heading;
    if (kind === 'shooter') {
      this.fireCd = GameConfig.enemies.shooter.fireCooldown;
    } else {
      this.fireCd = 0;
    }
    this.prevX = x;
    this.prevY = y;

    this.sprite = Sprite.from(textureKey);
    this.sprite.anchor.set(0.5);
    this.sprite.rotation = heading + ART_ROTATION_OFFSET;

    this.root.position.set(x, y);
    this.root.zIndex = 9;
    this.root.addChild(this.sprite);

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

    this.avoidTime = Math.max(0, this.avoidTime - dt);
    const target = this.avoidTime > 0 ? this.avoidHeading : desired;

    let moveSpeed = 0;
    if (this.kind === 'chaser') {
      const cfg = GameConfig.enemies.chaser;
      this.turnToward(target, cfg.turnRateDeg, dt);
      moveSpeed = cfg.speed;
    } else {
      const cfg = GameConfig.enemies.shooter;
      this.turnToward(target, cfg.turnRateDeg, dt);
      // keep moving during avoidance even inside approach range, or the detour stalls
      if (dist > cfg.approachRange || this.avoidTime > 0) moveSpeed = cfg.speed;

      this.fireCd -= dt;
      if (
        this.fireCd <= 0 &&
        this.avoidTime <= 0 &&
        dist <= cfg.approachRange &&
        this.angleTo(desired) < 0.3
      ) {
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

    if (moveSpeed > 0) this.advance(collision, moveSpeed, dt);
    this.sprite.rotation = this.heading + ART_ROTATION_OFFSET;
    this.updateStuck(dt, moveSpeed, desired, collision);
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

  private updateStuck(
    dt: number,
    moveSpeed: number,
    desired: number,
    collision: CollisionSystem,
  ): void {
    const moved = Math.hypot(this.x - this.prevX, this.y - this.prevY);
    this.prevX = this.x;
    this.prevY = this.y;

    const intended = moveSpeed * dt;
    if (intended > 0 && moved < intended * 0.3) this.stuckTime += dt;
    else this.stuckTime = Math.max(0, this.stuckTime - dt * 2);

    if (this.stuckTime >= STUCK_THRESHOLD_S && this.avoidTime <= 0) {
      this.beginAvoidance(desired, collision);
    }
  }

  /** Probe one tile ahead along candidate headings; take the first open one. */
  private beginAvoidance(desired: number, collision: CollisionSystem): void {
    const probe = GameConfig.arena.tileSize;
    const offsets = [Math.PI / 2, -Math.PI / 2, (3 * Math.PI) / 4, -(3 * Math.PI) / 4, Math.PI];
    if (this.rng.next() < 0.5) offsets.reverse(); // vary which side enemies favor

    let chosen = desired + Math.PI; // all probes blocked → back off
    for (const offset of offsets) {
      const h = desired + offset;
      const px = this.x + Math.cos(h) * probe;
      const py = this.y + Math.sin(h) * probe;
      if (!collision.pointBlocked(px, py)) {
        chosen = h;
        break;
      }
    }
    this.avoidHeading = chosen;
    this.avoidTime = AVOID_DURATION_S;
    this.stuckTime = 0;
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
