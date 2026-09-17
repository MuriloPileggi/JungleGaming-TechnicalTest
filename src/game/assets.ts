import { DECOR, TILESET } from './arena/tileset';
import type { EnemyKind } from './entities/Enemy';

export const SHIP_TEXTURE = '/assets/png/default/ships/ship_4.png';

export const ENEMY_TEXTURES: Record<EnemyKind, string> = {
  chaser: '/assets/png/default/ships/ship_3.png',
  shooter: '/assets/png/default/ships/ship_2.png',
};

export const GAME_TEXTURES: string[] = [
  SHIP_TEXTURE,
  ...Object.values(ENEMY_TEXTURES),
  ...Object.values(TILESET),
  ...DECOR.plants,
  ...DECOR.rocks,
  ...DECOR.wreckage,
];
