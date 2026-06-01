import client from './client.js';

export const listSessions = (params) => client.get('/sessions', { params });
export const createSession = (data) => client.post('/sessions', data);
export const deleteSession = (id) => client.delete(`/sessions/${id}`);
export const fetchStats = (params) => client.get('/sessions/stats', { params });
