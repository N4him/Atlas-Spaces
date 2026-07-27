import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/resources';
import { setUnauthorizedHandler, setAccessToken } from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'authenticated' | 'guest'

  const logout = useCallback(async ({ callServer = true } = {}) => {
    if (callServer) {
      // Revoca el refresh token en el servidor; se ignora el error (p. ej. si ya no había
      // sesión) porque de cualquier forma el estado local se limpia a continuación.
      try {
        await authApi.logout();
      } catch {
        /* la sesión ya no era válida en el servidor; no es un problema */
      }
    }
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => {
    // El interceptor de axios llama a este handler cuando ni el access token ni su
    // renovación (refresh) funcionan, es decir, cuando ya no hay sesión válida.
    setUnauthorizedHandler(() => logout({ callServer: false }));
  }, [logout]);

  useEffect(() => {
    // No hay token en localStorage que leer: el access token vive solo en memoria y se
    // pierde al recargar la página a propósito (mitiga robo por XSS). Para restaurar la
    // sesión se usa el refresh token, que el navegador ya trae en su cookie httpOnly.
    authApi
      .refresh()
      .then((res) => {
        setAccessToken(res.data.token);
        setUser(res.data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        setStatus('guest');
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login(email, password);
    setAccessToken(res.data.token);
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
