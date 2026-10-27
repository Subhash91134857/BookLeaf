import { request } from './client';

export const api = {
  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    me: () => request('/auth/me'),
  },
  books: { list: () => request('/books') },
  tickets: {
    list: (params) => request('/tickets', { params }),
    get: (id) => request(`/tickets/${id}`),
    create: (payload) => request('/tickets', { method: 'POST', body: payload }),
    update: (id, patch) => request(`/tickets/${id}`, { method: 'PATCH', body: patch }),
    reply: (id, body) => request(`/tickets/${id}/messages`, { method: 'POST', body: { body } }),
    addNote: (id, body) => request(`/tickets/${id}/notes`, { method: 'POST', body: { body } }),
    draft: (id) => request(`/tickets/${id}/draft`, { method: 'POST' }),
  },
};
