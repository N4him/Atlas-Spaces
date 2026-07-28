const request = require('supertest');
const createApp = require('../src/app');
const { createUser, tokenFor } = require('./helpers');

const app = createApp();

describe('Autenticación', () => {
  test('POST /api/auth/login con credenciales válidas devuelve token y usuario', async () => {
    const bcrypt = require('bcryptjs');
    const User = require('../src/models/User');
    const passwordHash = await bcrypt.hash('Password123', 10);
    await User.create({
      name: 'Usuario Login',
      email: 'login-test@atlasspaces.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login-test@atlasspaces.com',
      password: 'Password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('login-test@atlasspaces.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('POST /api/auth/login con credenciales inválidas devuelve 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'no-existe@atlasspaces.com',
      password: 'cualquiera',
    });
    expect(res.status).toBe(401);
  });

  test('Acceso a ruta protegida sin token devuelve 401', async () => {
    const res = await request(app).get('/api/spaces');
    expect(res.status).toBe(401);
  });

  test('Acceso a ruta protegida con token válido es exitoso', async () => {
    const user = await createUser({ role: 'operator' });
    const token = tokenFor(user);

    const res = await request(app).get('/api/spaces').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('Token inválido es rechazado', async () => {
    const res = await request(app).get('/api/spaces').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });
});

describe('Refresh token', () => {
  async function loginAndGetCookie() {
    const bcrypt = require('bcryptjs');
    const User = require('../src/models/User');
    const passwordHash = await bcrypt.hash('Password123', 10);
    await User.create({
      name: 'Usuario Refresh',
      email: 'refresh-test@atlasspaces.com',
      passwordHash,
      role: 'operator',
      isActive: true,
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'refresh-test@atlasspaces.com',
      password: 'Password123',
    });

    const setCookie = loginRes.headers['set-cookie'] || [];
    const refreshCookie = setCookie.find((c) => c.startsWith('atlas_refresh_token='));
    return { loginRes, refreshCookie };
  }

  test('POST /api/auth/login deja una cookie httpOnly con el refresh token', async () => {
    const { refreshCookie } = await loginAndGetCookie();
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
  });

  test('POST /api/auth/refresh sin cookie devuelve 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/refresh con cookie válida rota el token y devuelve un nuevo access token', async () => {
    const { refreshCookie } = await loginAndGetCookie();

    const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const newSetCookie = res.headers['set-cookie'] || [];
    const newRefreshCookie = newSetCookie.find((c) => c.startsWith('atlas_refresh_token='));
    expect(newRefreshCookie).toBeDefined();
    // La rotación emite un valor de cookie distinto al original.
    expect(newRefreshCookie.split(';')[0]).not.toBe(refreshCookie.split(';')[0]);
  });

  test('Reutilizar un refresh token ya rotado es rechazado (401)', async () => {
    const { refreshCookie } = await loginAndGetCookie();

    const first = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(first.status).toBe(200);

    // El mismo token (ya revocado por la rotación anterior) no debe volver a servir.
    const second = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(second.status).toBe(401);
  });

  test('POST /api/auth/logout revoca el refresh token y limpia la cookie', async () => {
    const { refreshCookie } = await loginAndGetCookie();

    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', refreshCookie);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(refreshAfterLogout.status).toBe(401);
  });
});

describe('Autorización por rol', () => {
  test('Un operador no puede crear espacios (403 Forbidden)', async () => {
    const operator = await createUser({ role: 'operator' });
    const token = tokenFor(operator);

    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sala no autorizada',
        type: 'sala_reunion',
        location: 'Sede X',
        capacity: 5,
        openTime: '08:00',
        closeTime: '18:00',
      });

    expect(res.status).toBe(403);
  });

  test('Un administrador sí puede crear espacios', async () => {
    const admin = await createUser({ role: 'admin' });
    const token = tokenFor(admin);

    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sala autorizada',
        type: 'sala_reunion',
        location: 'Sede X',
        capacity: 5,
        openTime: '08:00',
        closeTime: '18:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.item.name).toBe('Sala autorizada');
  });
});
