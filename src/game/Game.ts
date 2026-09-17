import { Application, Assets, Container, Ticker } from 'pixi.js';
import { GameConfig } from '../config/gameConfig';
import { Rng } from './rng';
import { InputSystem } from './systems/InputSystem';
import { Player } from './entities/Player';
import { TileMap } from './arena/TileMap';
import { ArenaRenderer } from './arena/ArenaRenderer';
import { CollisionSystem } from './systems/CollisionSystem';
import { GAME_TEXTURES, SHIP_TEXTURE } from './assets';

export class Game {
  private app = new Application();
  private world = new Container();
  private player: Player | null = null;
  private input: InputSystem;
  private host: HTMLElement;
  private onProgress: (p: number) => void;
  private destroyed = false;
  private rng = new Rng(1234);
  private collision!: CollisionSystem; // assigned in init(), used only after

  constructor(host: HTMLElement, onProgress: (p: number) => void) {
    this.host = host;
    this.onProgress = onProgress;
    this.input = new InputSystem(host);
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
    } // Strict Mode race guard
    this.host.appendChild(this.app.canvas);

    // --- load assets with progress BEFORE combat starts ---
    await Assets.load(GAME_TEXTURES, (p) => this.onProgress(p));
    if (this.destroyed) return;

    // --- build the world ---
    this.world.sortableChildren = true;
    this.app.stage.addChild(this.world);

    const tileMap = new TileMap();
    this.collision = new CollisionSystem(tileMap);
    const arena = new ArenaRenderer(tileMap, this.rng);
    this.world.addChild(arena.layer);

    this.player = new Player(SHIP_TEXTURE, GameConfig.arena);
    this.player.sprite.x = GameConfig.arena.width / 2;
    this.player.sprite.y = GameConfig.arena.height / 2;
    this.world.addChild(this.player.sprite);

    // --- game loop ---
    this.app.ticker.add(this.update, this);

    // --- auto-pause on tab hide / window blur ---
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('blur', this.onBlur);

    this.onProgress(1);
  }

  private update(ticker: Ticker): void {
    if (this.destroyed || this.app.ticker.started === false) return;

    const dt = Math.min(ticker.deltaMS, GameConfig.simulation.maxDeltaMs) / 1000;

    if (!this.paused) {
      this.player?.update(dt, this.input, this.collision);
    }
    this.updateCamera();
  }

  private updateCamera(): void {
    const p = this.player;
    if (!p) return;
    const { width, height } = this.app.renderer;
    const { arena } = GameConfig;

    let camX = p.sprite.x - width / 2;
    let camY = p.sprite.y - height / 2;
    camX = Math.max(0, Math.min(camX, arena.width - width));
    camY = Math.max(0, Math.min(camY, arena.height - height));

    this.world.position.set(-camX, -camY);
  }

  // --- pause control ---
  private paused = false;
  private resumeHandler: ((e: KeyboardEvent | PointerEvent) => void) | null = null;

  private onVisibility = () => {
    if (document.hidden) this.setPaused(true);
  };
  private onBlur = () => this.setPaused(true);

  setPaused(paused: boolean): void {
    if (this.destroyed) return;

    if (paused && !this.paused) {
      this.paused = true;
      this.input.clear();
      this.installResumeListener();
      this.onPauseChanged?.(true);
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
    this.onPauseChanged?.(false);
  }

  /** Callback so the React layer can render a PAUSED overlay */
  onPauseChanged: ((paused: boolean) => void) | null = null;

  get isPaused(): boolean {
    return this.paused;
  }

  destroy(): void {
    this.destroyed = true;
    this.removeResumeListener();

    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('blur', this.onBlur);
    this.input?.destroy();

    if (this.app.renderer) {
      this.app.ticker?.remove(this.update, this);
      this.app.destroy(true, { children: true, texture: false });
    }
  }
}
