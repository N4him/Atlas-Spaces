import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/resources';

// Se mockea la capa de API: estas pruebas verifican el manejo de estado de AuthContext
// (status, user, login, logout), no la integración real con el backend (cubierta por los
// tests de Jest del backend y por la evidencia manual en el video de demostración).
vi.mock('../api/resources', () => ({
  authApi: {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

const adminUser = { id: '1', name: 'Andrea', email: 'admin@atlasspaces.com', role: 'admin', isActive: true };

function Probe() {
  const { user, status, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="user">{user?.name || 'ninguno'}</p>
      <button onClick={() => login('admin@atlasspaces.com', 'Atlas2026!').catch(() => {})}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  test('restaura la sesión al montar si el refresh token (cookie) sigue siendo válido', async () => {
    authApi.refresh.mockResolvedValueOnce({ data: { token: 'access-token', user: adminUser } });

    renderWithProvider();

    expect(screen.getByTestId('status').textContent).toBe('loading');
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('Andrea');
  });

  test('si no hay refresh token válido, el estado inicial pasa a "guest"', async () => {
    authApi.refresh.mockRejectedValueOnce(new Error('sin sesión'));

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
    expect(screen.getByTestId('user').textContent).toBe('ninguno');
  });

  test('login exitoso actualiza el usuario y el estado a "authenticated"', async () => {
    authApi.refresh.mockRejectedValueOnce(new Error('sin sesión'));
    authApi.login.mockResolvedValueOnce({ data: { token: 'access-token', user: adminUser } });

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));

    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));
    expect(screen.getByTestId('user').textContent).toBe('Andrea');
  });

  test('logout llama a authApi.logout y limpia el estado local', async () => {
    authApi.refresh.mockResolvedValueOnce({ data: { token: 'access-token', user: adminUser } });
    authApi.logout.mockResolvedValueOnce({});

    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('authenticated'));

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('guest'));
    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user').textContent).toBe('ninguno');
  });
});
