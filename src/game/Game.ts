import { Application, Assets, Container, Ticker } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { Rng } from './rng';
import { InputSystem } from './systems/InputSystem';
import { Player } from './entities/Player';
import { TileMap } from './arena/TileMap';
import { ArenaRenderer } from './arena/ArenaRenderer';
import { CollisionSystem } from './systems/CollisionSystem';
import { WeaponSystem } from './systems/WeaponSystem';
import { SpawnSystem } from './systems/SpawnSystem';
import { CombatSystem } from './systems/CombatSystem';
import { AudioManager } from './systems/AudioManager';
import { VfxSystem } from './systems/VfxSystem';
import { Enemy, type EnemyKind } from './entities/Enemy';
import { ENEMY_TEXTURES, GAME_TEXTURES, SHIP_TEXTURE } from './assets';
import type { EndReason, HudSnapshot, MatchResult } from './types';

export interface GameOptions {
  matchDuration: number;
  spawnInterval: number;
}

export class Game {
  private app = new Application();
  private world = new Container();
  private enemyLayer = new Container();
  private player: Player | null = null;
  private enemies: Enemy[] = [];
  private input: InputSystem;
  private host: HTMLElement;
  private onProgress: (p: number) => void;
  private options: GameOptions;
  private destroyed = false;
  private rng = new Rng(1234);
  private collision!: CollisionSystem;
  private audio = new AudioManager();
  private vfx = new VfxSystem();
  private weapons!: WeaponSystem;
  private spawnSystem!: SpawnSystem;
  private combat = new CombatSystem();
  private lastTickSecond = 99;
  private healthWarned = false;
  private unlockHandler: (() => void) | null = null;

  // --- match state ---
  private matchState: 'running' | 'ended' = 'running';
  private endReason: EndReason | null = null;
  private timeRemaining: number;
  private durationPlayed = 0;
  private score = 0;
  private kills = 0;
  private hudTimer = 0;

  // --- pause ---
  private paused = false;
  private resumeHandler: ((e: KeyboardEvent | PointerEvent) => void) | null = null;

  /** React-layer callbacks — the game never imports React/zustand. */
  onHudSnapshot: ((s: HudSnapshot) => void) | null = null;
  onMatchEnd: ((r: MatchResult) => void) | null = null;

  constructor(host: HTMLElement, onProgress: (p: number) => void, options: GameOptions) {
    this.host = host;
    this.onProgress = onProgress;
    this.options = options;
    this.input = new InputSystem(host);
    this.timeRemaining = options.matchDuration;
    this.weapons = new WeaponSystem(this.audio);
  }

  async init(): Promise<void> {
    await this.app.init({
      background: '#0a2a43',
      antialias: true,
      resizeTo: this.host,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.host.appendChild(this.app.canvas);

    await Assets.load(GAME_TEXTURES, (p) => this.onProgress(p));
    if (this.destroyed) return;
    if (import.meta.env.DEV) {
      for (const id of GAME_TEXTURES) {
        if (!Assets.cache.has(id)) console.warn(`[assets] requested but not cached: ${id}`);
      }
    }

    await this.audio.load();
    this.world.addChild(this.vfx.layer);

    this.unlockHandler = () => this.audio.unlock();
    window.addEventListener('keydown', this.unlockHandler);
    window.addEventListener('pointerdown', this.unlockHandler);

    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);

    const tileMap = new TileMap();
    this.collision = new CollisionSystem(tileMap);
    this.world.addChild(new ArenaRenderer(tileMap, this.rng).layer);
    this.world.addChild(this.weapons.layer);
    this.world.addChild(this.enemyLayer);

    this.player = new Player(SHIP_TEXTURE, GameConfig.arena);
    this.player.sprite.x = GameConfig.arena.width / 2;
    this.player.sprite.y = GameConfig.arena.height / 2;
    this.world.addChild(this.player.sprite);

    this.spawnSystem = new SpawnSystem(this.rng, this.collision, this.options.spawnInterval);

    this.app.ticker.add(this.update, this);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);

    this.onProgress(1);
    this.pushHud();

    this.audio.play('start');
    this.audio.startLoop('ambience');
  }

  private update(ticker: Ticker): void {
    if (this.destroyed || !this.app.ticker.started) return;
    if (this.matchState === 'ended') return; // FULL freeze: sim, spawns, timer. Render continues.

    const dt = Math.min(ticker.deltaMS, GameConfig.simulation.maxDeltaMs) / 1000;

    if (!this.paused) {
      this.durationPlayed += dt;
      this.timeRemaining -= dt;

      const sec = Math.ceil(this.timeRemaining);
      if (this.timeRemaining < 10 && sec !== this.lastTickSecond) {
        this.lastTickSecond = sec;
        this.audio.play('timeWarning');
      }
      this.vfx.update(dt);

      this.player?.update(dt, this.input, this.collision);
      if (this.player) {
        this.weapons.update(dt, this.input, this.player, this.collision);

        const req = this.spawnSystem.update(dt, this.player.sprite.x, this.player.sprite.y);
        if (req) this.spawnEnemy(req.kind, req.x, req.y);

        for (const e of this.enemies) {
          e.update(dt, this.player, this.collision, (x, y, vx, vy) =>
            this.weapons.spawnEnemyShot(x, y, vx, vy),
          );
        }

        const result = this.combat.resolve(this.weapons.projectiles, this.enemies, this.player);
        this.handleCombatResult(result);
        this.removeDeadEnemies();

        if (this.player.hp <= 0) this.endMatch('death');
        else if (this.timeRemaining <= 0) this.endMatch('timeout');
      }
    }

    // HUD sync runs even while paused so the overlay state reaches React
    this.hudTimer += dt;
    if (this.hudTimer >= 1 / GameConfig.simulation.hudSyncHz) {
      this.hudTimer = 0;
      this.pushHud();
    }

    this.updateCamera();
  }

  private handleCombatResult(r: ReturnType<CombatSystem['resolve']>): void {
    this.kills += r.playerKills.length;
    for (const e of r.playerKills) {
      this.score += GameConfig.enemies[e.kind].points;
      this.vfx.spawnExplosion(e.x, e.y, this.rng);
      this.audio.play('explosion');
      if (GameConfig.enemies[e.kind].points > 0) this.audio.play('score');
    }
    for (const e of r.otherDeaths) {
      this.vfx.spawnExplosion(e.x, e.y, this.rng);
      this.audio.play('collision');
    }
    for (const pos of r.playerHitPositions) {
      this.vfx.spawnExplosion(pos.x, pos.y, this.rng);
      this.audio.play('collision', { volume: 0.7 });
    }
    const player = this.player;
    if (player && !this.healthWarned && player.hp > 0 && player.hp < GameConfig.ship.maxHp * 0.2) {
      this.healthWarned = true;
      this.audio.play('healthWarning');
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number, y: number): void {
    const player = this.player;
    if (!player) return;
    const heading = Math.atan2(player.sprite.y - y, player.sprite.x - x);
    const enemy = new Enemy(kind, ENEMY_TEXTURES[kind], x, y, heading, this.rng);
    this.enemies.push(enemy);
    this.enemyLayer.addChild(enemy.root);
  }

  private removeDeadEnemies(): void {
    const dead = this.enemies.filter((e) => !e.alive);
    if (!dead.length) return;
    for (const e of dead) {
      this.enemyLayer.removeChild(e.root);
      e.root.destroy({ children: true });
    }
    this.enemies = this.enemies.filter((e) => e.alive);
  }

  private endMatch(reason: EndReason): void {
    if (this.matchState === 'ended') return;
    this.matchState = 'ended';
    this.endReason = reason;
    this.timeRemaining = Math.max(0, this.timeRemaining);
    this.input.clear();
    this.removeResumeListener();

    const result: MatchResult = {
      score: this.score,
      enemiesKilled: this.kills,
      durationPlayed: Math.round(this.durationPlayed),
      endReason: reason,
      endedAt: new Date().toISOString(),
    };

    this.audio.stopLoop();
    this.audio.play(reason === 'death' ? 'gameover' : 'completed');

    this.pushHud();
    this.onMatchEnd?.(result); // React layer persists + shows the result screen
  }

  private pushHud(): void {
    this.onHudSnapshot?.({
      score: this.score,
      hp: Math.max(0, this.player?.hp ?? 0),
      maxHp: GameConfig.ship.maxHp,
      timeRemaining: Math.max(0, this.timeRemaining),
      paused: this.paused,
      matchState: this.matchState,
      endReason: this.endReason,
    });
  }

  private updateCamera(): void {
    const p = this.player;
    if (!p) return;
    const { width, height } = this.app.renderer;
    const { arena } = GameConfig;
    const camX = Math.max(0, Math.min(p.sprite.x - width / 2, arena.width - width));
    const camY = Math.max(0, Math.min(p.sprite.y - height / 2, arena.height - height));
    this.world.position.set(-camX, -camY);
  }

  // --- pause ---
  private onVisibility = () => {
    if (document.hidden) this.setPaused(true);
  };
  private onBlur = () => this.setPaused(true);

  setPaused(paused: boolean): void {
    if (this.destroyed || this.matchState === 'ended') return;
    if (paused && !this.paused) {
      this.paused = true;
      this.input.clear();
      this.installResumeListener();
      this.pushHud();
      this.audio.play('paused');
    }
  }

  private installResumeListener(): void {
    this.removeResumeListener();
    this.resumeHandler = (e: KeyboardEvent | PointerEvent) => {
      if (e.type === 'keydown') {
        const k = e as KeyboardEvent;
        if (['Escape', 'Enter', 'Space', 'KeyP'].includes(k.code)) this.resume();
      } else {
        this.resume();
      }
    };
    window.addEventListener('keydown', this.resumeHandler);
    window.addEventListener('pointerdown', this.resumeHandler);
  }

  private removeResumeListener(): void {
    if (this.resumeHandler) {
      window.removeEventListener('keydown', this.resumeHandler);
      window.removeEventListener('pointerdown', this.resumeHandler);
      this.resumeHandler = null;
    }
  }

  private resume(): void {
    this.paused = false;
    this.removeResumeListener();
    this.input.clear();
    this.pushHud();
    this.audio.play('resumed');
  }

  get isPaused(): boolean {
    return this.paused;
  }

  destroy(): void {
    this.destroyed = true;
    this.removeResumeListener();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
    this.input?.destroy();
    this.weapons.clear();
    this.enemies = [];
    this.vfx.clear();
    this.audio.destroy();
    if (this.unlockHandler) {
      window.removeEventListener('keydown', this.unlockHandler);
      window.removeEventListener('pointerdown', this.unlockHandler);
      this.unlockHandler = null;
    }

    if (this.app.renderer) {
      this.app.ticker?.remove(this.update, this);
      this.app.destroy(true, { children: true, texture: false });
    }
  }
}
