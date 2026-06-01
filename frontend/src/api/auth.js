import client from './client.js';

export const register = (data) => client.post('/auth/register', data);
export const login = (data) => client.post('/auth/login', data);
export const fetchMe = () => client.get('/auth/me');
