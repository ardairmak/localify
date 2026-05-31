import { create } from 'zustand';
import type { Song } from '../types';

const audio = typeof window !== 'undefined' ? new Audio() : null;

interface PlayerStore {
  currentSong: Song | null;
  queue: Song[];
  queueIndex: number;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
  currentTime: number;
  duration: number;

  playSong: (song: Song, queue?: Song[]) => void;
  playQueue: (songs: Song[], startIndex?: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (song: Song) => void;

  _setCurrentTime: (t: number) => void;
  _setDuration: (d: number) => void;
  _setIsPlaying: (p: boolean) => void;
}

function loadSong(song: Song, state: PlayerStore) {
  if (!audio) return;
  audio.src = `/api/songs/${song.id}/stream`;
  audio.volume = state.volume;
  audio.play().catch(console.error);
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  shuffle: false,
  repeat: 'off',
  volume: 0.8,
  currentTime: 0,
  duration: 0,

  playSong: (song, queue) => {
    const q = queue ?? [song];
    const idx = q.findIndex(s => s.id === song.id);
    set({ currentSong: song, queue: q, queueIndex: idx >= 0 ? idx : 0, isPlaying: true, currentTime: 0 });
    loadSong(song, get());
  },

  playQueue: (songs, startIndex = 0) => {
    if (!songs.length) return;
    const song = songs[startIndex];
    set({ currentSong: song, queue: songs, queueIndex: startIndex, isPlaying: true, currentTime: 0 });
    loadSong(song, get());
  },

  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      audio?.pause();
    } else {
      audio?.play().catch(console.error);
    }
    set({ isPlaying: !isPlaying });
  },

  next: () => {
    const { queue, queueIndex, repeat, shuffle } = get();
    if (!queue.length) return;

    if (repeat === 'one') {
      if (audio) { audio.currentTime = 0; audio.play().catch(console.error); }
      set({ isPlaying: true, currentTime: 0 });
      return;
    }

    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeat === 'all') { nextIdx = 0; }
        else { audio?.pause(); set({ isPlaying: false }); return; }
      }
    }

    const song = queue[nextIdx];
    set({ currentSong: song, queueIndex: nextIdx, isPlaying: true, currentTime: 0 });
    loadSong(song, get());
  },

  previous: () => {
    const { queue, queueIndex, currentTime } = get();
    if (currentTime > 3) {
      if (audio) audio.currentTime = 0;
      set({ currentTime: 0 });
      return;
    }
    const prevIdx = Math.max(0, queueIndex - 1);
    const song = queue[prevIdx];
    if (!song) return;
    set({ currentSong: song, queueIndex: prevIdx, isPlaying: true, currentTime: 0 });
    loadSong(song, get());
  },

  seek: (time) => {
    if (audio) audio.currentTime = time;
    set({ currentTime: time });
  },

  setVolume: (v) => {
    if (audio) audio.volume = v;
    set({ volume: v });
  },

  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),

  toggleRepeat: () =>
    set(s => ({ repeat: s.repeat === 'off' ? 'all' : s.repeat === 'all' ? 'one' : 'off' })),

  addToQueue: (song) => set(s => ({ queue: [...s.queue, song] })),

  _setCurrentTime: (t) => set({ currentTime: t }),
  _setDuration: (d) => set({ duration: d }),
  _setIsPlaying: (p) => set({ isPlaying: p }),
}));

// Wire up audio events
if (audio) {
  audio.addEventListener('timeupdate', () => usePlayerStore.getState()._setCurrentTime(audio.currentTime));
  audio.addEventListener('durationchange', () => usePlayerStore.getState()._setDuration(audio.duration || 0));
  audio.addEventListener('ended', () => usePlayerStore.getState().next());
  audio.addEventListener('play', () => usePlayerStore.getState()._setIsPlaying(true));
  audio.addEventListener('pause', () => usePlayerStore.getState()._setIsPlaying(false));
}
