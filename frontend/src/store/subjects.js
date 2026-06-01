import { create } from 'zustand';
import * as api from '../api/subjects.js';

export const useSubjectsStore = create((set, get) => ({
  subjects: [],
  loading: false,
  error: null,

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.listSubjects();
      set({ subjects: res.data.subjects, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || '과목을 불러올 수 없습니다', loading: false });
    }
  },

  create: async (data) => {
    const res = await api.createSubject(data);
    set({ subjects: [...get().subjects, res.data.subject] });
    return res.data.subject;
  },

  update: async (id, data) => {
    const res = await api.updateSubject(id, data);
    set({
      subjects: get().subjects.map((s) => (s.id === id ? res.data.subject : s)),
    });
    return res.data.subject;
  },

  remove: async (id) => {
    await api.deleteSubject(id);
    set({ subjects: get().subjects.filter((s) => s.id !== id) });
  },
}));
