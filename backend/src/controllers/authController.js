const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { hashToken } = require('../utils/tokenHash');
const logger = require('../utils/logger');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REFRESH_COOKIE_NAME = 'atlas_refresh_token';
const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || 7);
const REFRESH_COOKIE_PATH = '/api/auth';

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

/**
 * Genera un refresh token de alta entropía (no es un JWT: no necesita serlo, porque su
 * validez se comprueba contra la base de datos, lo que además permite revocarlo).
 * Persiste solo su hash (ver models/RefreshToken.js) y devuelve el valor en texto plano
 * para entregarlo una única vez en la cookie httpOnly.
 */
async function issueRefreshToken(user, req) {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt,
    userAgent: req.headers['user-agent'] || null,
  });

  return { rawToken, expiresAt };
}

function setRefreshCookie(res, rawToken, expiresAt) {
  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true, // inaccesible desde JavaScript del navegador (mitiga robo por XSS)
    secure: process.env.NODE_ENV === 'production', // solo por HTTPS en producción
    sameSite: 'lax', // suficiente protección CSRF para este flujo y permite navegación normal
    path: REFRESH_COOKIE_PATH, // el navegador solo la envía a /api/auth/*
    expires: expiresAt,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Responde con un access token de corta duración (en el body, para usarse en el header
 * Authorization) y deja un refresh token en una cookie httpOnly+secure de larga duración.
 */
const login = asyncHandler(async (req, res) => {
  const rawEmail = req.body.email;
  const password = req.body.password;

  if (typeof rawEmail !== 'string' || !EMAIL_REGEX.test(rawEmail.trim())) {
    return res.status(422).json({ message: 'El correo no tiene un formato válido' });
  }
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(422).json({ message: 'La contraseña es obligatoria' });
  }

  const email = rawEmail.trim().toLowerCase();
  const user = await User.findOne({ email }).select('+passwordHash');

  // Mensaje genérico e idéntico para email inexistente / password incorrecta / usuario inactivo,
  // para no revelar cuál de las condiciones falló (evita enumeración de usuarios).
  const invalidCredentials = () => res.status(401).json({ message: 'Correo o contraseña inválidos' });

  if (!user) return invalidCredentials();
  if (!user.isActive) return invalidCredentials();

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return invalidCredentials();

  const accessToken = signAccessToken(user);
  const { rawToken, expiresAt } = await issueRefreshToken(user, req);
  setRefreshCookie(res, rawToken, expiresAt);

  logger.info({ userId: user._id.toString() }, 'Inicio de sesión exitoso');

  return res.status(200).json({ token: accessToken, user: serializeUser(user) });
});

/**
 * POST /api/auth/refresh
 * Lee el refresh token de la cookie httpOnly, lo valida contra la base de datos y,
 * si es válido, lo ROTA (revoca el actual y emite uno nuevo) antes de devolver un
 * nuevo access token. La rotación limita el daño si un refresh token llegara a filtrarse:
 * solo puede usarse una vez.
 */
const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    return res.status(401).json({ message: 'No hay sesión para renovar' });
  }

  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored || !stored.isActive()) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'La sesión expiró o fue revocada, inicia sesión de nuevo' });
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'No hay sesión para renovar' });
  }

  // Rotación: se revoca el token usado y se emite uno nuevo.
  const { rawToken: newRawToken, expiresAt } = await issueRefreshToken(user, req);
  stored.revokedAt = new Date();
  stored.replacedByHash = hashToken(newRawToken);
  await stored.save();

  setRefreshCookie(res, newRawToken, expiresAt);
  const accessToken = signAccessToken(user);

  return res.status(200).json({ token: accessToken, user: serializeUser(user) });
});

/**
 * POST /api/auth/logout
 * Revoca el refresh token actual (si existe) y limpia la cookie. Idempotente: responde
 * 204 incluso si ya no había sesión activa.
 */
const logout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
  }
  clearRefreshCookie(res);
  return res.status(204).send();
});

/**
 * GET /api/auth/me
 * Requiere autenticación. Devuelve el usuario actual (útil para mantener sesión al recargar).
 */
const me = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: serializeUser(req.user) });
});

module.exports = { login, refresh, logout, me };
