import { Container, Sprite } from 'pixi.js';
import { GameConfig } from '../../config/gameConfig';
import { Rng } from '../rng';
import { DECOR, TILESET } from './tileset';
import type { TileMap } from './TileMap';

export class ArenaRenderer {
  readonly layer = new Container();

  constructor(map: TileMap, rng: Rng) {
    const ts = GameConfig.arena.tileSize;

    for (let row = 0; row < map.rows; row++) {
      for (let col = 0; col < map.cols; col++) {
        const cx = col * ts + ts / 2;
        const cy = row * ts + ts / 2;
        const code = map.codeAt(col, row);

        // Water under everything
        const water = this.tile(TILESET.water, cx, cy, 0);
        this.layer.addChild(water);

        if (code === 'S' || code === 'G') {
          const island = this.tile(
            code === 'S' ? TILESET.islandSand : TILESET.islandGrass,
            cx,
            cy,
            5,
          );
          this.layer.addChild(island);
          this.scatterDecor(cx, cy, code, rng);
        } else if (code === 'R') {
          this.layer.addChild(this.tile(TILESET.rock, cx, cy, 5));
        } else if (rng.next() < 0.02) {
          // rare floating wreckage on open water
          //this.layer.addChild(this.tile(rng.pick(DECOR.wreckage), cx, cy, 4));
        }
      }
    }
  }

  private tile(path: string, cx: number, cy: number, zIndex: number): Sprite {
    const s = Sprite.from(path);
    s.anchor.set(0.5);
    s.width = GameConfig.arena.tileSize; // normalize regardless of source px size
    s.height = GameConfig.arena.tileSize;
    s.position.set(Math.round(cx), Math.round(cy)); // integer pos = no seam artifacts
    s.zIndex = zIndex;
    return s;
  }

  private scatterDecor(cx: number, cy: number, code: string, rng: Rng): void {
    const ts = GameConfig.arena.tileSize;
    const pool = code === 'G' ? DECOR.plants : DECOR.rocks;
    const count = rng.int(0, 2);
    for (let i = 0; i < count; i++) {
      const d = Sprite.from(rng.pick(pool));
      d.anchor.set(0.5);
      d.width = ts * rng.range(0.3, 0.55);
      d.height = d.width;
      d.position.set(
        Math.round(cx + rng.range(-ts * 0.3, ts * 0.3)),
        Math.round(cy + rng.range(-ts * 0.3, ts * 0.3)),
      );
      d.zIndex = 6;
      this.layer.addChild(d);
    }
  }
}
