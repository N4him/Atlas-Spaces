const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
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
 * POST /api/auth/login
 * Body: { email, password }
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

  const token = signToken(user);
  return res.status(200).json({ token, user: serializeUser(user) });
});

/**
 * GET /api/auth/me
 * Requiere autenticación. Devuelve el usuario actual (útil para mantener sesión al recargar).
 */
const me = asyncHandler(async (req, res) => {
  return res.status(200).json({ user: serializeUser(req.user) });
});

module.exports = { login, me };
