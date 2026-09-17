import { Container, Graphics } from 'pixi.js';
import type { Rng } from '../rng';

const DURATION = 0.5; // seconds

interface Spark {
  angle: number;
  speed: number;
  size: number;
}

class ExplosionVfx {
  readonly view = new Graphics();
  private t = 0;
  private sparks: Spark[] = [];

  constructor(x: number, y: number, rng: Rng) {
    this.view.position.set(x, y);
    this.view.zIndex = 20;
    for (let i = 0; i < 10; i++) {
      this.sparks.push({
        angle: rng.range(0, Math.PI * 2),
        speed: rng.range(60, 160),
        size: rng.range(2.5, 5),
      });
    }
    this.render();
  }

  /** Returns false when finished. */
  update(dt: number): boolean {
    this.t += dt;
    if (this.t >= DURATION) return false;
    this.render();
    return true;
  }

  private render(): void {
    const k = this.t / DURATION;
    const fade = 1 - k;
    const g = this.view;
    g.clear();

    // expanding shockwave ring
    g.circle(0, 0, 8 + 46 * k).stroke({ color: 0xffa64d, width: 3, alpha: fade * 0.9 });
    // white-hot core early in the blast
    if (k < 0.35) g.circle(0, 0, 14 * (1 - k / 0.35)).fill({ color: 0xfff3c4, alpha: 0.9 });
    // radial sparks
    for (const s of this.sparks) {
      const d = s.speed * this.t;
      g.circle(Math.cos(s.angle) * d, Math.sin(s.angle) * d, s.size * fade).fill({
        color: 0xffd27a,
        alpha: fade,
      });
    }
  }
}

export class VfxSystem {
  readonly layer = new Container();
  private effects: ExplosionVfx[] = [];

  constructor() {
    this.layer.zIndex = 20;
  }

  spawnExplosion(x: number, y: number, rng: Rng): void {
    const fx = new ExplosionVfx(x, y, rng);
    this.effects.push(fx);
    this.layer.addChild(fx.view);
  }

  update(dt: number): void {
    if (!this.effects.length) return;
    const alive: ExplosionVfx[] = [];
    for (const fx of this.effects) {
      if (fx.update(dt)) alive.push(fx);
      else {
        this.layer.removeChild(fx.view);
        fx.view.destroy();
      }
    }
    this.effects = alive;
  }

  clear(): void {
    for (const fx of this.effects) {
      this.layer.removeChild(fx.view);
      fx.view.destroy();
    }
    this.effects = [];
  }
}
