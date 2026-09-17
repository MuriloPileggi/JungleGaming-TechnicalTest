/** Tile codes → texture paths. ADJUST FILENAMES TO MATCH YOUR FOLDER. */
export const TILESET = {
  water: '/assets/png/default/tiles/tile_73.png',
  islandSand: '/assets/png/default/tiles/tile_5.png',
  islandGrass: '/assets/png/default/tiles/tile_24.png',
  rock: '/assets/png/default/tiles/tile_50.png',
} as const;

/** Non-solid decorative sprites, scattered by the seeded RNG. */
export const DECOR = {
  plants: [
    '/assets/png/default/tiles/tile_70.png',
    '/assets/png/default/tiles/tile_71.png',
    '/assets/png/default/tiles/tile_72.png',
  ],
  rocks: [
    '/assets/png/default/tiles/tile_65.png',
    '/assets/png/default/tiles/tile_66.png',
    '/assets/png/default/tiles/tile_67.png',
  ],
  wreckage: ['/assets/png/default/tiles/tile_81.png', '/assets/png/default/tiles/tile_82.png'],
} as const;
