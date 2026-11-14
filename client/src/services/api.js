const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

function readStoredToken() {
  try {
    // Check sessionStorage first for strict per-tab account isolation
    return sessionStorage.getItem('riveria_access_token') || localStorage.getItem('riveria_access_token');
  } catch {
    return null;
  }
}

let accessToken = readStoredToken();

export function setAccessToken(token) {
  accessToken = token;
  try {
    if (token) {
      localStorage.setItem('riveria_access_token', token);
      sessionStorage.setItem('riveria_access_token', token);
    } else {
      localStorage.removeItem('riveria_access_token');
      sessionStorage.removeItem('riveria_access_token');
    }
  } catch {}
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
    let message = data?.error?.message || data?.error;
    if (data?.error?.details && Array.isArray(data.error.details) && data.error.details.length > 0) {
      message = data.error.details.map((d) => d.message).join('. ');
    }
    const error = new Error(message || 'Request failed');
    error.status = response.status;
    error.details = data?.error?.details;
    throw error;
  }
  return data;
}
