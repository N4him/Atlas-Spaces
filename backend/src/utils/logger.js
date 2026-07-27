const pino = require('pino');

/**
 * Logger estructurado de la aplicación.
 * - En desarrollo: salida legible en consola (pino-pretty).
 * - En producción/test: JSON de una línea por evento, apto para recolectores de logs
 *   (Docker logs, CloudWatch, Loki, etc.).
 *
 * Uso: const logger = require('../utils/logger'); logger.info({ userId }, 'mensaje');
 */
const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const logger = pino({
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      }
    : undefined,
  base: { service: 'atlas-spaces-backend' },
  redact: {
    // Nunca registrar credenciales o tokens completos, incluso si aparecen en el objeto logueado.
    paths: ['password', 'passwordHash', 'token', 'refreshToken', '*.password', '*.passwordHash', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTADO]',
  },
});

module.exports = logger;
