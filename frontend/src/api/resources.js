import api from './client';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const spacesApi = {
  list: (params) => api.get('/spaces', { params }),
  get: (id) => api.get(`/spaces/${id}`),
  create: (data) => api.post('/spaces', data),
  update: (id, data) => api.put(`/spaces/${id}`, data),
  deactivate: (id) => api.patch(`/spaces/${id}/deactivate`),
  reactivate: (id) => api.patch(`/spaces/${id}/reactivate`),
};

export const reservationsApi = {
  list: (params) => api.get('/reservations', { params }),
  get: (id) => api.get(`/reservations/${id}`),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  cancel: (id) => api.patch(`/reservations/${id}/cancel`),
  // El endpoint de exportación requiere autenticación (Bearer token), por lo que no puede
  // navegarse directamente como un <a href>. Se descarga como blob autenticado y se dispara
  // la descarga en el navegador manualmente.
  exportCSV: async (params) => {
    const response = await api.get('/reservations/export', { params, responseType: 'blob' });
    const disposition = response.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'reservas.csv';

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const analyticsApi = {
  summary: (params) => api.get('/analytics/summary', { params }),
  byDay: (params) => api.get('/analytics/reservations-by-day', { params }),
  statusDistribution: (params) => api.get('/analytics/status-distribution', { params }),
  spaceUsage: (params) => api.get('/analytics/space-usage', { params }),
};
