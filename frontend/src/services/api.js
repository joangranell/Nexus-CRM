import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to all requests if stored in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexus_token') || localStorage.getItem('bfg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401s to redirect to login if session expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_user');
        localStorage.removeItem('bfg_token');
        localStorage.removeItem('bfg_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

export const accountsApi = {
  getFunnelMetrics: () => api.get('/accounts/funnel-metrics'),
  getAccounts: (params) => api.get('/accounts', { params }),
  getAccountDetail: (id) => api.get(`/accounts/${id}`),
  createAccount: (data) => api.post('/accounts', data),
  updateAccount: (id, data) => api.put(`/accounts/${id}`, data),
  getDistributors: () => api.get('/accounts/distributors'),
  qualifyAccount: (id, data) => api.post(`/accounts/${id}/qualify`, data),
  previewStale: (days = 60) => api.get('/accounts/stale/preview', { params: { days } }),
  recycleStale: (days = 60) => api.post('/accounts/stale/recycle', null, { params: { days } }),
};

export const interactionsApi = {
  addInteraction: (accountId, data) => api.post(`/accounts/${accountId}/interactions`, data),
  getInteractions: (accountId) => api.get(`/accounts/${accountId}/interactions`),
};

export const opportunitiesApi = {
  getOpportunities: (params) => api.get('/opportunities', { params }),
  createOpportunity: (data) => api.post('/opportunities', data),
  updateOpportunity: (id, data) => api.put(`/opportunities/${id}`, data),
};

export const tasksApi = {
  getMyDay: () => api.get('/tasks/my-day'),
  getTasks: (params) => api.get('/tasks', { params }),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  toggleTask: (id) => api.patch(`/tasks/${id}/toggle`),
};

export const webhooksApi = {
  sendLeadWebhook: (data, apiKey = 'nexus_webhook_secret_key_2026') =>
    api.post('/webhooks/lead', data, {
      headers: { 'X-API-Key': apiKey },
    }),
  sendErpOrderWebhook: (data, apiKey = 'nexus_webhook_secret_key_2026') =>
    api.post('/webhooks/erp/order', data, {
      headers: { 'X-API-Key': apiKey },
    }),
};

export const erpApi = {
  getAccountSummary: (accountId) => api.get(`/erp/accounts/${accountId}/summary`),
  pushToErp: (accountId) => api.post(`/erp/accounts/${accountId}/push-to-erp`),
  simulateOrder: (data) => api.post('/erp/sandbox/simulate-order', data),
  getOrders: (params) => api.get('/erp/orders', { params }),
};

export const importsApi = {
  uploadFile: (formData) =>
    api.post('/imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBatches: () => api.get('/imports/batches'),
  getBatchDetail: (batchId) => api.get(`/imports/batches/${batchId}`),
  mapAndAnalyze: (batchId, mapping) =>
    api.post(`/imports/batches/${batchId}/map-and-analyze`, { mapping }),
  consolidate: (batchId, resolutionStrategy = 'SKIP', assignToUserId = null) =>
    api.post(`/imports/batches/${batchId}/consolidate`, {
      resolution_strategy: resolutionStrategy,
      assign_to_user_id: assignToUserId,
    }),
};

export const mailingApi = {
  getTemplates: () => api.get('/mailing/templates'),
  getTemplate: (id) => api.get(`/mailing/templates/${id}`),
  createTemplate: (data) => api.post('/mailing/templates', data),
  updateTemplate: (id, data) => api.put(`/mailing/templates/${id}`, data),
  deleteTemplate: (id) => api.delete(`/mailing/templates/${id}`),
  estimateSegment: (data) => api.post('/mailing/estimate-segment', data),
  getCampaigns: () => api.get('/mailing/campaigns'),
  createCampaign: (data) => api.post('/mailing/campaigns', data),
  getCampaignDetail: (id) => api.get(`/mailing/campaigns/${id}`),
  sendCampaign: (id) => api.post(`/mailing/campaigns/${id}/send`),
  getCampaignRecipients: (id, params) => api.get(`/mailing/campaigns/${id}/recipients`, { params }),
  getRecipient: (id) => api.get(`/mailing/recipients/${id}`),
  simulateEvent: (data) => api.post('/mailing/sandbox/simulate-event', data),
  sendWebhookEvent: (data) => api.post('/webhooks/mailing/event', data),
};

export const aiApi = {
  getConfig: () => api.get('/ai/config'),
  updateConfig: (data) => api.put('/ai/config', data),
  testConnection: (data) => api.post('/ai/test-connection', data),
  enrichLead: (accountId) => api.post('/ai/lead-enrich', { account_id: accountId }),
  voiceToCRM: (data) => api.post('/ai/voice-to-crm', data),
  detectEmailIntent: (data) => api.post('/ai/email-intent', data),
  getChurnRisks: () => api.get('/ai/churn-risks'),
  createChurnAlertTask: (data) => api.post('/ai/churn-alert-task', data),
  generateCampaignCopy: (data) => api.post('/ai/generate-campaign-copy', data),
};

export default api;

