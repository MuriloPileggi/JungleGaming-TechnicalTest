import { Container } from 'pixi.js';
import { GameConfig } from '../../config/gameConfig';
import { Projectile } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import type { InputSystem } from './InputSystem';
import type { CollisionSystem } from './CollisionSystem';
import type { AudioManager } from './AudioManager';

export class WeaponSystem {
  readonly layer = new Container();
  projectiles: Projectile[] = [];
  private frontalCd = 0;
  private lateralCd = 0;
  private readonly audio: AudioManager;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  update(dt: number, input: InputSystem, player: Player, collision: CollisionSystem): void {
    this.frontalCd = Math.max(0, this.frontalCd - dt);
    this.lateralCd = Math.max(0, this.lateralCd - dt);

    // Frontal cannon: Space (hold-to-fire, cooldown gated)
    if (input.isDown('Space') && this.frontalCd <= 0) {
      this.fireFrontal(player);
      this.frontalCd = GameConfig.ship.frontal.cooldown;
    }

    // Lateral salvos: Q = left, E = right (if both held, right wins)
    const left = input.isDown('KeyQ');
    const right = input.isDown('KeyE');
    if ((left || right) && this.lateralCd <= 0) {
      this.fireLateral(player, left && !right ? -1 : 1);
      this.lateralCd = GameConfig.ship.lateral.cooldown;
    }

    // Advance + cull
    const { width, height } = GameConfig.arena;
    for (const p of this.projectiles) {
      p.update(dt);
      if (p.alive) {
        const outside = p.x < 0 || p.y < 0 || p.x > width || p.y > height;
        if (outside) {
          p.alive = false;
          p.deathCause ??= 'water';
        } else if (collision.pointBlocked(p.x, p.y)) {
          p.alive = false;
          p.deathCause ??= 'island';
        }
      }
      if (!p.alive) {
        if (p.deathCause === 'water') this.audio.play('splash', { volume: 0.6 });
        else if (p.deathCause === 'island') this.audio.play('collision', { volume: 0.35 });
        // 'ship' plays nothing here — CombatSystem already fired its sound
        this.layer.removeChild(p.view);
        p.view.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.alive);
  }

  private fireFrontal(player: Player): void {
    const cfg = GameConfig.ship.frontal;
    const fx = Math.cos(player.heading);
    const fy = Math.sin(player.heading);
    const muzzle = GameConfig.ship.size / 2;

    this.spawn({
      x: player.sprite.x + fx * muzzle,
      y: player.sprite.y + fy * muzzle,
      vx: fx * cfg.projectileSpeed,
      vy: fy * cfg.projectileSpeed,
      damage: cfg.damage,
      lifetime: cfg.lifetime,
      owner: 'player',
      color: 0x22262b,
    });

    this.audio.play('fireFrontal', { rate: 0.95 + Math.random() * 0.1 });
  }

  private fireLateral(player: Player, side: 1 | -1): void {
    const cfg = GameConfig.ship.lateral;
    const fx = Math.cos(player.heading);
    const fy = Math.sin(player.heading);
    const px = -fy * side; // perpendicular (left/right of bow)
    const py = fx * side;
    const sideOffset = GameConfig.ship.size / 2;

    // 3 parallel shots, spaced along the ship's length
    for (const i of [-1, 0, 1]) {
      this.spawn({
        x: player.sprite.x + px * sideOffset + fx * (i * cfg.spacing),
        y: player.sprite.y + py * sideOffset + fy * (i * cfg.spacing),
        vx: px * cfg.projectileSpeed,
        vy: py * cfg.projectileSpeed,
        damage: cfg.damage,
        lifetime: cfg.lifetime,
        owner: 'player',
        color: 0x22262b,
      });
    }

    this.audio.play('fireLateral', { rate: 0.95 + Math.random() * 0.1 });
  }

  private spawn(opts: ConstructorParameters<typeof Projectile>[0]): void {
    const p = new Projectile(opts);
    this.projectiles.push(p);
    this.layer.addChild(p.view);
  }

  spawnEnemyShot(x: number, y: number, vx: number, vy: number): void {
    const cfg = GameConfig.enemies.shooter;
    this.spawn({
      x,
      y,
      vx,
      vy,
      damage: cfg.projectileDamage,
      lifetime: cfg.projectileLifetime,
      owner: 'enemy',
      color: 0x8a2b2b,
    });
  }

  /** Call on match end / destroy so nothing leaks. */
  clear(): void {
    for (const p of this.projectiles) {
      this.layer.removeChild(p.view);
      p.view.destroy();
    }
    this.projectiles = [];
    this.frontalCd = 0;
    this.lateralCd = 0;
  }
}
