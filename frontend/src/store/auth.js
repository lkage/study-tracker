import { create } from 'zustand';
import { fetchMe } from '../api/auth.js';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const useAuthStore = create((set, get) => ({
  // 초기 상태: localStorage에서 복원
  token: localStorage.getItem(TOKEN_KEY),
  user: JSON.parse(localStorage.getItem(USER_KEY) || 'null'),

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const newUser = { ...current, ...updates };
    localStorage.setItem('auth_user', JSON.stringify(newUser));
    set({ user: newUser });
  },

  // 토큰이 있으면 백엔드에 me 호출해서 유효성 확인 + user 갱신
  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetchMe();
      set({ token, user: res.data.user });
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    } catch {
      // 토큰 무효 → 정리 (API 클라이언트의 401 인터셉터가 이미 처리할 가능성)
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ token: null, user: null });
    }
  },
}));
