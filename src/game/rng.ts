/**
 * Mulberry32: tiny, fast, seedable PRNG.
 * Tests can seed it so enemy spawns / AI jitter are reproducible.
 */
export class Rng {
  private state: number;

  constructor(seed = Date.now() >>> 0) {
    this.state = seed;
  }

  /** float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** int in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)] as T;
  }
}
