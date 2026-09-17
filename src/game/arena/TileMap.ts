import { ARENA_MAP } from '../../config/arenaMap';
import { GameConfig } from '../../config/gameConfig';

const SOLID = new Set(['S', 'G', 'R']);

export class TileMap {
  readonly cols: number;
  readonly rows: number;
  private cells: string[];

  constructor() {
    this.rows = ARENA_MAP.length;
    this.cols = ARENA_MAP[0]?.length ?? 0;

    if (this.cols !== GameConfig.arena.cols || this.rows !== GameConfig.arena.rows) {
      throw new Error(
        `ARENA_MAP is ${this.cols}x${this.rows} but config expects ` +
          `${GameConfig.arena.cols}x${GameConfig.arena.rows}`,
      );
    }
    this.cells = ARENA_MAP.join('').split('');
  }

  codeAt(col: number, row: number): string {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return 'S'; // out of bounds = solid wall
    return this.cells[row * this.cols + col] ?? '.';
  }

  codeAtWorld(x: number, y: number): string {
    return this.codeAt(this.colOf(x), this.rowOf(y));
  }

  isSolid(col: number, row: number): boolean {
    return SOLID.has(this.codeAt(col, row));
  }

  isSolidWorld(x: number, y: number): boolean {
    return this.isSolid(this.colOf(x), this.rowOf(y));
  }

  colOf(x: number): number {
    return Math.floor(x / GameConfig.arena.tileSize);
  }

  rowOf(y: number): number {
    return Math.floor(y / GameConfig.arena.tileSize);
  }
}
