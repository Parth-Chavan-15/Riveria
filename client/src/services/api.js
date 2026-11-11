const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

let accessToken = sessionStorage.getItem('riveria_access_token');

export function setAccessToken(token) {
  accessToken = token;
  if (token) sessionStorage.setItem('riveria_access_token', token);
  else sessionStorage.removeItem('riveria_access_token');
}

export function getAccessToken() {
  return accessToken;
}

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(apiUrl(path), { ...options, headers });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.error || 'Request failed');
    error.status = response.status;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}
