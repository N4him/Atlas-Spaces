const { BusinessRuleError } = require('../utils/reservationRules');

/**
 * Middleware de manejo de errores centralizado.
 * Traduce errores conocidos (Mongoose, reglas de negocio) a códigos HTTP coherentes
 * y evita exponer detalles internos del servidor.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Reglas de negocio (incluye conflictos 409)
  if (err instanceof BusinessRuleError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ message: 'Error de validación', errors: messages });
  }

  // ObjectId con formato inválido
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Identificador inválido: ${err.value}` });
  }

  // Índice único duplicado (ej. correo ya registrado)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ message: `Ya existe un registro con ese ${field}` });
  }

  console.error('[error]', err);
  return res.status(500).json({ message: 'Error interno del servidor' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { errorHandler, notFoundHandler };
