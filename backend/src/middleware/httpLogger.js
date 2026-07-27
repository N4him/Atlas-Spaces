const pinoHttp = require('pino-http');
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

/**
 * Middleware de logging HTTP estructurado.
 * - Genera/propaga un requestId (header X-Request-Id) útil para correlacionar logs
 *   de una misma petición a través de controllers y servicios.
 * - Reemplaza a morgan: en dev se ve igual de legible (gracias a pino-pretty) y en
 *   producción emite JSON listo para un agregador de logs.
 * - No registra body/headers sensibles (ver redact en utils/logger.js).
 */
const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers['x-request-id'];
    const id = existing || randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} -> ${res.statusCode} (${err.message})`,
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

module.exports = httpLogger;
