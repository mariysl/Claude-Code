import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const getLeads = (params) => client.get('/leads', { params }).then(r => r.data);
export const getLead = (id) => client.get(`/leads/${id}`).then(r => r.data);
export const createLead = (data) => client.post('/leads', data).then(r => r.data);
export const updateLead = (id, data) => client.patch(`/leads/${id}`, data).then(r => r.data);
export const getStats = () => client.get('/leads/stats').then(r => r.data);
export const getSettings = () => client.get('/settings').then(r => r.data);
export const updateSettings = (data) => client.put('/settings', data).then(r => r.data);
export const sendManualSMS = (leadId, message) =>
  client.post('/sms/send', { leadId, message }).then(r => r.data);
