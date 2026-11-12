import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest, getAccessToken, setAccessToken } from '../services/api';
import { AuthContext } from './authContextDef';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAccessToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [error, setError] = useState('');

  const logout = useCallback(() => {
    setAccessToken(null);
    setToken(null);
    setUser(null);
    setError('');
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    apiRequest('/auth/me')
      .then((profile) => active && setUser(profile))
      .catch((err) => {
        if (err?.status === 401 && active) logout();
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [token, logout]);

  const authenticate = useCallback(async (endpoint, email, password) => {
    setError('');
    setIsLoading(true);
    try {
      const data = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify({ email, password }) });
      setAccessToken(data.token);
      setToken(data.token);
      setUser({ _id: data._id, email: data.email, role: data.role });
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    user, token, isLoading, error, clearError: () => setError(''),
    login: (email, password) => authenticate('/auth/login', email, password),
    register: (email, password) => authenticate('/auth/register', email, password),
    logout
  }), [user, token, isLoading, error, authenticate, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
