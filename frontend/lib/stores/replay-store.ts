import { create } from "zustand";

type ReplayState = {
  isPlaying: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
  hoveredTime: number | null;
  setPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  seekBy: (delta: number) => void;
  setHoveredTime: (time: number | null) => void;
  reset: () => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useReplayStore = create<ReplayState>((set, get) => ({
  isPlaying: false,
  playbackRate: 1,
  currentTime: 0,
  duration: 0,
  hoveredTime: null,
  setPlaying: (isPlaying) => set({ isPlaying }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackRate: (rate) => set({ playbackRate: clamp(rate, 0.25, 4) }),
  setCurrentTime: (time) => {
    const duration = get().duration;
    const nextTime = clamp(time, 0, Math.max(duration, 0));
    set({
      currentTime: nextTime,
      isPlaying: nextTime >= duration ? false : get().isPlaying,
    });
  },
  setDuration: (duration) => {
    const safeDuration = Math.max(duration, 0);
    const current = get().currentTime;
    set({
      duration: safeDuration,
      currentTime: clamp(current, 0, safeDuration),
    });
  },
  seekBy: (delta) => {
    const { currentTime } = get();
    get().setCurrentTime(currentTime + delta);
  },
  setHoveredTime: (hoveredTime) => set({ hoveredTime }),
  reset: () =>
    set({
      isPlaying: false,
      playbackRate: 1,
      currentTime: 0,
      duration: 0,
      hoveredTime: null,
    }),
}));

// this is zustand store
