import { handleMock } from '../mock/handler';
const BASE = import.meta.env.VITE_API_BASE || '/api/v1';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const KEY = 'bookleaf_token';
const storage = () => (USE_MOCK ? sessionStorage : localStorage);
export const tokenStore = {
  get: () => storage().getItem(KEY),
  set: (t) => storage().setItem(KEY, t),
  clear: () => storage().removeItem(KEY),
};
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

let onUnauthorized = () => { };
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function request(path, { method = 'GET', body, params } = {}) {
  const clean = Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v != null));
  const token = tokenStore.get();
  let status; let data;

  if (USE_MOCK) {
    ({ status, data } = await handleMock({ method, path, body, params: clean, token }));
  } else {
    const qs = Object.keys(clean).length ? `?${new URLSearchParams(clean)}` : '';
    try {
      const res = await fetch(`${BASE}${path}${qs}`, {
        method,
        headers: { ...(body && { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }) },
        body: body ? JSON.stringify(body) : undefined,
      });
      status = res.status;
      const payload = status === 204 ? null : await res.json().catch(() => null);
      data = payload && 'isSuccess' in payload
        ? (payload.isSuccess ? payload.data : { error: { message: payload.message, details: payload.details } })
        : payload;
    } catch {
      throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.');
    }
  }

  if (status >= 400) {
    if (status === 401 && path !== '/auth/login') onUnauthorized();
    const err = data?.error || {};
    throw new ApiError(status, err.message || data?.message || 'Something went wrong.', err.details);
  }
  return data;
}
