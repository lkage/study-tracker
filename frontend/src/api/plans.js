import client from './client.js';

export const listPlans = (params) => client.get('/plans', { params });

export const upsertPlan = (data) => client.post('/plans', data);

export const deletePlan = (subject_id, plan_date) =>
  client.delete('/plans', { params: { subject_id, plan_date } });

export const reorderPlans = (plan_date, order) =>
  client.patch('/plans/reorder', { plan_date, order });
