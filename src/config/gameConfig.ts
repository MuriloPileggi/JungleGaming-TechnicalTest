/**
 * Central game configuration.
 * RULE: balancing changes happen ONLY here — never inside logic classes.
 */

export const GameConfig = {
  arena: {
    tileSize: 128,
    cols: 25,
    rows: 16,
    width: 25 * 128, // 3200
    height: 16 * 128, // 2048
  },

  ship: {
    size: 64,
    maxHp: 100,
    // movement
    maxSpeed: 240, // px/s
    acceleration: 300, // px/s²
    drag: 0.92, // per-frame multiplier at 60fps (converted to dt in code)
    rotationSpeedDeg: 120, // deg/s
    collisionRadius: 24, // px
    // weapons
    frontal: {
      cooldown: 0.45, // s
      projectileSpeed: 420, // px/s
      damage: 20,
      lifetime: 1.6, // s
    },
    lateral: {
      cooldown: 0.75,
      projectileSpeed: 380,
      damage: 10,
      lifetime: 1.4,
      count: 3, // parallel projectiles per side
      spacing: 14, // px between the 3 projectiles
    },
  },

  enemies: {
    chaser: { hp: 30, speed: 150, contactDamage: 25, points: 5, turnRateDeg: 140 },
    shooter: {
      hp: 50,
      speed: 90,
      approachRange: 380, // stops advancing closer than this
      fireCooldown: 2.0,
      projectileSpeed: 300,
      projectileDamage: 10,
      projectileLifetime: 2.2,
      points: 10,
      turnRateDeg: 100,
    },
  },

  match: {
    durationOptions: [60, 120, 180] as const, // seconds (Options screen)
    defaultDuration: 60,
    spawnIntervalOptions: [5, 10, 15] as const, // seconds (Options screen)
    defaultSpawnInterval: 5,
    spawnMinDistanceFromPlayer: 250,
    firstSpawnDelay: 0,
  },

  simulation: {
    maxDeltaMs: 100, // clamp: tab-switch/pause won't teleport entities
    hudSyncHz: 10, // HUD updates React at most 10x/sec
  },

  persistence: {
    optionsKey: 'pirate-battle:options',
    resultKey: 'pirate-battle:last-result',
    pendingKey: 'pirate-battle:pending-submission',
  },
} as const;

export type MatchDuration = (typeof GameConfig.match.durationOptions)[number];
export type SpawnInterval = (typeof GameConfig.match.spawnIntervalOptions)[number];
