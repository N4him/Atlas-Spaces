const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * Requiere un token JWT válido en el header Authorization: Bearer <token>.
 * Adjunta el usuario autenticado (sin passwordHash) a req.user.
 * No expone detalles internos en los mensajes de error (evita fugas de información).
 */
const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'No autenticado: token ausente' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'No autenticado: token inválido o expirado' });
  }

  const user = await User.findById(payload.sub);

  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'No autenticado: usuario no válido' });
  }

  req.user = user;
  next();
});

/**
 * Restringe el acceso a los roles indicados. Debe usarse después de requireAuth.
 * Ej: requireRole('admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tiene permisos para realizar esta acción' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
