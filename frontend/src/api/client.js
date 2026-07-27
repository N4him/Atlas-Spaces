import axios from 'axios';

// La URL base se toma de la variable de entorno de Vite (definida en .env / .env.example).
// En desarrollo local sin Docker, por defecto apunta a http://localhost:4000/api.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// withCredentials permite que el navegador envíe/reciba la cookie httpOnly del refresh
// token (ver backend/src/controllers/authController.js). El access token, en cambio,
// NO se guarda en localStorage: se mantiene únicamente en memoria (ver más abajo), lo que
// reduce la superficie de ataque ante un XSS (un script inyectado no puede leerlo).
const api = axios.create({ baseURL, withCredentials: true });

let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Cliente aparte (sin los interceptores de abajo) para pedir la renovación del token.
// Evita que una petición de refresh fallida vuelva a disparar el propio interceptor de 401.
const refreshClient = axios.create({ baseURL, withCredentials: true });

let refreshPromise = null;
function refreshAccessToken() {
  // Si ya hay una renovación en curso (p. ej. varias peticiones en paralelo recibieron 401
  // al mismo tiempo), todas esperan la misma promesa en vez de disparar refrescos duplicados.
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.token);
        return res.data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/refresh');

    if (response?.status === 401 && !config._retry && !isAuthEndpoint) {
      config._retry = true;
      try {
        const newToken = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch {
        setAccessToken(null);
        if (onUnauthorized) onUnauthorized();
        return Promise.reject(error);
      }
    }

    if (response?.status === 401 && (config._retry || isAuthEndpoint) && onUnauthorized) {
      onUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default api;
