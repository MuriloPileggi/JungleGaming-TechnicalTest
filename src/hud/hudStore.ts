import { create } from 'zustand';
import type { HudSnapshot } from '../game/types';

interface HudStore extends HudSnapshot {
  apply: (s: HudSnapshot) => void;
  reset: (timeRemaining: number, maxHp: number) => void;
}

export const useHudStore = create<HudStore>((set) => ({
  score: 0,
  hp: 0,
  maxHp: 100,
  timeRemaining: 0,
  paused: false,
  matchState: 'running',
  endReason: null,
  apply: (s) => set(s),
  reset: (timeRemaining, maxHp) =>
    set({
      score: 0,
      hp: maxHp,
      maxHp,
      timeRemaining,
      paused: false,
      matchState: 'running',
      endReason: null,
    }),
}));
