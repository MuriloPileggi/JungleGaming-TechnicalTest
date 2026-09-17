/**
 * Arena layout as ASCII art. Legend:
 *   .  water (navigable)
 *   S  sand island (solid)
 *   G  grass island (solid)
 *   R  rock (solid)
 *
 * Must be exactly GameConfig.arena.cols × rows.
 * Design rules: keep the center open (player spawn), keep lanes
 * between islands wide enough for ship + projectiles.
 */
export const ARENA_MAP: string[] = [
  '.........................',
  '.........................',
  '....SSS.........GGGG.....',
  '....SSS.........GGGG.....',
  '....SSS.........GGGG.....',
  '.........................',
  '..........RR.............',
  '.........................',
  '..GGGG..........SSS......',
  '..GGGG..........SSS......',
  '..GGGG..........SSS......',
  '.........................',
  '.......RRR...............',
  '.........................',
  '.........................',
  '.........................',
];
