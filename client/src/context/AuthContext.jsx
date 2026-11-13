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
    if (user) return; // Skip redundant roundtrip when user is already populated from login
    let active = true;
    apiRequest('/auth/me')
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        if (profile?.preferences) {
          try {
            const p = profile.preferences;
            if (p.streamQuality) localStorage.setItem('reveria:streamQuality', p.streamQuality);
            if (p.latencyMode) localStorage.setItem('reveria:latencyMode', p.latencyMode);
            if (p.dynamicNormalization !== undefined) localStorage.setItem('reveria:normalizeVolume', String(p.dynamicNormalization));
            if (p.crossfade !== undefined) localStorage.setItem('reveria:crossfade', String(p.crossfade));
            if (p.spatialSoundstage !== undefined) localStorage.setItem('reveria:stereoWidth', String(p.spatialSoundstage));
            if (p.equalizerPreset) localStorage.setItem('reveria:eqPreset', p.equalizerPreset);
            if (p.equalizerBands) localStorage.setItem('reveria:eqBands', JSON.stringify(p.equalizerBands));
          } catch {}
        }
      })
      .catch((err) => {
        if (err?.status === 401 && active) logout();
      })
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [token, user, logout]);

  const authenticate = useCallback(async (endpoint, email, password) => {
    setError('');
    setIsLoading(true);
    try {
      const data = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify({ email, password }) });
      setAccessToken(data.token);
      setToken(data.token);
      setUser({ _id: data._id, email: data.email, role: data.role, preferences: data.preferences });
      if (data.preferences) {
        try {
          const p = data.preferences;
          if (p.streamQuality) localStorage.setItem('reveria:streamQuality', p.streamQuality);
          if (p.latencyMode) localStorage.setItem('reveria:latencyMode', p.latencyMode);
          if (p.dynamicNormalization !== undefined) localStorage.setItem('reveria:normalizeVolume', String(p.dynamicNormalization));
          if (p.crossfade !== undefined) localStorage.setItem('reveria:crossfade', String(p.crossfade));
          if (p.spatialSoundstage !== undefined) localStorage.setItem('reveria:stereoWidth', String(p.spatialSoundstage));
          if (p.equalizerPreset) localStorage.setItem('reveria:eqPreset', p.equalizerPreset);
          if (p.equalizerBands) localStorage.setItem('reveria:eqBands', JSON.stringify(p.equalizerBands));
        } catch {}
      }
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const savePreferencesToAccount = useCallback(async (preferences) => {
    try {
      const res = await apiRequest('/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });
      if (res?.preferences) {
        setUser((prev) => prev ? { ...prev, preferences: res.preferences } : prev);
      }
      return true;
    } catch (err) {
      console.warn('Failed to save preferences to account:', err);
      return false;
    }
  }, []);

  const value = useMemo(() => ({
    user, token, isLoading, error, clearError: () => setError(''),
    login: (email, password) => authenticate('/auth/login', email, password),
    register: (email, password) => authenticate('/auth/register', email, password),
    savePreferencesToAccount,
    logout
  }), [user, token, isLoading, error, authenticate, savePreferencesToAccount, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
