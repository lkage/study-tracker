import client from './client.js';

export const listSubjects = () => client.get('/subjects');
export const createSubject = (data) => client.post('/subjects', data);
export const updateSubject = (id, data) => client.patch(`/subjects/${id}`, data);
export const deleteSubject = (id) => client.delete(`/subjects/${id}`);
