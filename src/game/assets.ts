import { DECOR, TILESET } from './arena/tileset';

export const SHIP_TEXTURE = '/assets/png/default/ships/ship_1.png';

export const GAME_TEXTURES: string[] = [
  SHIP_TEXTURE,
  ...Object.values(TILESET),
  ...DECOR.plants,
  ...DECOR.rocks,
  ...DECOR.wreckage,
];
