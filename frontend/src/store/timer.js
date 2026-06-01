import { create } from 'zustand';
import { useState, useEffect } from 'react';
import { createSession } from '../api/sessions.js';

const STORAGE_KEY = 'active_timer';

const load = () => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

const save = (state) => {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  else localStorage.removeItem(STORAGE_KEY);
};

export const useTimerStore = create((set, get) => ({
  state: load(),

  start: (subject, target_sec, accumulated_before_sec = 0) => {
    const newState = {
      subject_id: subject.id,
      subject_name: subject.name,
      subject_color: subject.color,
      target_sec: target_sec || 0,
      accumulated_before_sec: accumulated_before_sec,
      started_at: new Date().toISOString(),
      paused_at: null,
      pause_reason: null,
      accumulated_pause_ms: 0,
    };
    save(newState);
    set({ state: newState });
  },

  pause: (reason = 'manual') => {
    const prev = get().state;
    if (!prev || prev.paused_at) return;
    save({ ...prev, paused_at: new Date().toISOString(), pause_reason: reason });
    set({ state: { ...prev, paused_at: new Date().toISOString(), pause_reason: reason } });
  },

  resume: () => {
    const prev = get().state;
    if (!prev || !prev.paused_at) return;
    const pauseDuration = Date.now() - new Date(prev.paused_at).getTime();
    const next = {
      ...prev,
      paused_at: null,
      pause_reason: null,
      accumulated_pause_ms: prev.accumulated_pause_ms + pauseDuration,
    };
    save(next);
    set({ state: next });
  },

  finishAndSave: async () => {
    const current = get().state;
    if (!current) return null;

    const endTime = current.paused_at ? new Date(current.paused_at) : new Date();
    const totalMs = endTime.getTime() - new Date(current.started_at).getTime();
    const actualMs = totalMs - current.accumulated_pause_ms;

    if (actualMs < 1000) {
      save(null);
      set({ state: null });
      return null;
    }

    const adjustedEndedAt = new Date(
      new Date(current.started_at).getTime() + actualMs
    ).toISOString();

    try {
      const res = await createSession({
        subject_id: current.subject_id,
        started_at: current.started_at,
        ended_at: adjustedEndedAt,
        memo: '',
      });
      save(null);
      set({ state: null });
      return res.data.session;
    } catch (err) {
      throw err;
    }
  },

  cancel: () => {
    save(null);
    set({ state: null });
  },
}));

let listenersRegistered = false;

export function registerTimerListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const autoPause = () => {
    const { state, pause } = useTimerStore.getState();
    if (state && !state.paused_at) {
      pause('focus_lost');
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) autoPause();
  });
  window.addEventListener('blur', autoPause);
}

export function useTimerElapsed() {
  const state = useTimerStore((s) => s.state);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!state || state.paused_at) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [state, state?.paused_at]);

  if (!state) return 0;
  const end = state.paused_at
    ? new Date(state.paused_at).getTime()
    : Date.now();
  const totalMs = end - new Date(state.started_at).getTime();
  const actualMs = totalMs - state.accumulated_pause_ms;
  return Math.floor(Math.max(0, actualMs) / 1000);
}
