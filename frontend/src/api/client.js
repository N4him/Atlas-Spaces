import axios from 'axios';

// La URL base se toma de la variable de entorno de Vite (definida en .env / .env.example).
// En desarrollo local sin Docker, por defecto apunta a http://localhost:4000/api.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorageSafeGet('atlas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nota: se usa localStorage únicamente para persistir el token de sesión entre recargas
// de página (requerimiento del Ticket 1: "mantener la sesión al recargar"). Todos los
// datos de negocio (espacios, reservas, analítica) se consultan siempre en vivo contra
// el backend/MongoDB; no se usa localStorage como fuente de datos de la aplicación.
function localStorageSafeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
