import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, } from '../api/resources';
import { setUnauthorizedHandler } from '../api/client';

export const AuthContext = createContext(null);

const TOKEN_KEY = 'atlas_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* localStorage no disponible (modo privado, etc.) */
    }
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    let token = null;
    try {
      token = window.localStorage.getItem(TOKEN_KEY);
    } catch {
      token = null;
    }

    if (!token) {
      setStatus('guest');
      return;
    }

    authApi
      .me()
      .then((res) => {
        setUser(res.data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        logout();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    try {
      window.localStorage.setItem(TOKEN_KEY, res.data.token);
    } catch {
      /* localStorage no disponible */
    }
    setUser(res.data.user);
    setStatus('authenticated');
    return res.data.user;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
