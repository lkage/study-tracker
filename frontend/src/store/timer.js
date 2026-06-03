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

// 현재 세션을 백엔드에 저장. 저장하지 않을 만한 짧은 세션이면 null 반환.
async function saveCurrentToBackend(current) {
  const endTime = current.paused_at ? new Date(current.paused_at) : new Date();
  const totalMs = endTime.getTime() - new Date(current.started_at).getTime();
  const actualMs = totalMs - current.accumulated_pause_ms;

  if (actualMs < 1000) return null;

  const adjustedEndedAt = new Date(
    new Date(current.started_at).getTime() + actualMs
  ).toISOString();

  const res = await createSession({
    subject_id: current.subject_id,
    started_at: current.started_at,
    ended_at: adjustedEndedAt,
    memo: '',
  });
  return res.data.session;
}

function buildNewState(subject, target_sec, accumulated_before_sec) {
  return {
    subject_id: subject.id,
    subject_name: subject.name,
    subject_color: subject.color,
    target_sec: target_sec || 0,
    accumulated_before_sec: accumulated_before_sec || 0,
    started_at: new Date().toISOString(),
    paused_at: null,
    pause_reason: null,
    accumulated_pause_ms: 0,
  };
}

export const useTimerStore = create((set, get) => ({
  state: load(),

  start: (subject, target_sec, accumulated_before_sec = 0) => {
    const newState = buildNewState(subject, target_sec, accumulated_before_sec);
    save(newState);
    set({ state: newState });
  },

  pause: (reason = 'manual') => {
    const prev = get().state;
    if (!prev || prev.paused_at) return;
    const next = { ...prev, paused_at: new Date().toISOString(), pause_reason: reason };
    save(next);
    set({ state: next });
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
    try {
      const session = await saveCurrentToBackend(current);
      save(null);
      set({ state: null });
      return session;
    } catch (err) {
      throw err;
    }
  },

  // 현재 세션 저장 + 새 타이머 시작을 atomic하게 (state가 null이 되는 순간 없음)
  finishAndStartNext: async (nextSubject, target_sec, accumulated_before_sec) => {
    const current = get().state;
    if (!current) return null;

    // 1. 현재 세션 백엔드 저장 (state는 아직 그대로)
    try {
      await saveCurrentToBackend(current);
    } catch (err) {
      throw err;
    }

    // 2. 새 state로 교체 (state가 null 되는 순간 없음)
    const newState = buildNewState(nextSubject, target_sec, accumulated_before_sec);
    save(newState);
    set({ state: newState });
    return newState;
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
