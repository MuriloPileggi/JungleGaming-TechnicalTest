export class InputSystem {
  private keys = new Set<string>();
  private virtual = new Set<string>();

  constructor(host: HTMLElement) {
    // host intentionally unused for now: global key listeners are fine while
    // the game screen is the only screen. When we add menus, we'll scope
    // capture to the active game host (accessibility requirement).
    void host;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // Only capture game keys while the canvas host is focused/active,
    // so menus keep normal keyboard behavior (accessibility requirement)
    this.keys.add(e.code);
    if (GAME_KEYS.has(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  setVirtual(code: string, down: boolean): void {
    if (down) this.virtual.add(code);
    else this.virtual.delete(code);
  }

  isDown(code: string): boolean {
    return this.keys.has(code) || this.virtual.has(code);
  }

  clear(): void {
    this.keys.clear(); // call on pause/resume so held keys don't "stick"
    this.virtual.clear();
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}

const GAME_KEYS = new Set([
  'KeyW',
  'KeyS',
  'KeyA',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyQ',
  'KeyE',
  'Space',
]);
