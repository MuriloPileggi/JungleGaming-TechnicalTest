export type SoundId =
  | 'ambience'
  | 'start'
  | 'paused'
  | 'resumed'
  | 'gameover'
  | 'completed'
  | 'timeWarning'
  | 'healthWarning'
  | 'collision'
  | 'explosion'
  | 'fireFrontal'
  | 'fireLateral'
  | 'score'
  | 'splash';

/**
 * SINGLE SOURCE OF TRUTH for sound paths.
 */
const SOUND_FILES: Record<SoundId, string> = {
  ambience: '/assets/sounds/ocean_ambience_loop.wav',
  start: '/assets/sounds/game_start.wav',
  paused: '/assets/sounds/game_pause.wav',
  resumed: '/assets/sounds/game_resume.wav',
  gameover: '/assets/sounds/game_over.wav',
  completed: '/assets/sounds/game_complete.wav',
  timeWarning: '/assets/sounds/time_warning.wav',
  healthWarning: '/assets/sounds/health_low.wav',
  collision: '/assets/sounds/ship_collision.wav',
  explosion: '/assets/sounds/ship_explosion_1.wav',
  fireFrontal: '/assets/sounds/cannon_fire_1.wav',
  fireLateral: '/assets/sounds/cannon_broadside.wav',
  score: '/assets/sounds/score_point.wav',
  splash: '/assets/sounds/cannonball_water_hit_1.wav',
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<SoundId, AudioBuffer>();
  private loopSource: AudioBufferSourceNode | null = null;
  private loopGain: GainNode | null = null;
  private unlocked = false;
  private pendingLoop: SoundId | null = null;

  /** Decode via OfflineAudioContext: no autoplay-policy warnings at load time. */
  async load(): Promise<void> {
    const decoder = new OfflineAudioContext(1, 1, 44100);
    await Promise.all(
      (Object.keys(SOUND_FILES) as SoundId[]).map(async (id) => {
        try {
          const res = await fetch(SOUND_FILES[id]);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const bytes = await res.arrayBuffer();
          this.buffers.set(id, await decoder.decodeAudioData(bytes));
        } catch (err) {
          console.warn(`[audio] failed to load "${id}" (${SOUND_FILES[id]}):`, err);
        }
      }),
    );
  }

  /** Call on first user gesture (keydown/pointerdown). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.pendingLoop) {
      const id = this.pendingLoop;
      this.pendingLoop = null;
      this.startLoop(id);
    }
  }

  play(id: SoundId, opts?: { rate?: number; volume?: number }): void {
    // Pre-unlock one-shots are dropped, never queued: firing 30 cannon shots
    // before the first keypress must not blast them all at once on unlock.
    if (!this.unlocked || !this.ctx || !this.master) return;
    const buffer = this.buffers.get(id);
    if (!buffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = opts?.rate ?? 1;
    const gain = this.ctx.createGain();
    gain.gain.value = opts?.volume ?? 1;
    src.connect(gain).connect(this.master);
    src.start();
  }

  startLoop(id: SoundId): void {
    if (!this.unlocked) {
      this.pendingLoop = id; // begins on unlock()
      return;
    }
    this.stopLoop();
    if (!this.ctx || !this.master) return;
    const buffer = this.buffers.get(id);
    if (!buffer) return;
    this.loopSource = this.ctx.createBufferSource();
    this.loopSource.buffer = buffer;
    this.loopSource.loop = true;
    this.loopGain = this.ctx.createGain();
    this.loopGain.gain.value = 0.4; // ambience sits under the SFX
    this.loopSource.connect(this.loopGain).connect(this.master);
    this.loopSource.start();
  }

  stopLoop(): void {
    if (this.loopSource) {
      try {
        this.loopSource.stop();
      } catch {
        // already stopped
      }
      this.loopSource = null;
    }
    this.loopGain = null;
    this.pendingLoop = null;
  }

  setMuted(muted: boolean): void {
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  destroy(): void {
    this.stopLoop();
    if (this.ctx && this.ctx.state !== 'closed') void this.ctx.close();
    this.ctx = null;
    this.master = null;
  }
}
