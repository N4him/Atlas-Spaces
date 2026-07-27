const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const httpLogger = require('./middleware/httpLogger');
const openapiSpec = require('./docs/openapi');

// El refresh token viaja en una cookie httpOnly, por lo que el navegador solo la envía
// en peticiones "con credenciales". Eso exige un origin explícito en CORS (no se puede
// usar '*' junto con credentials: true). En local por defecto es el puerto de Vite.
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  if (process.env.NODE_ENV !== 'test') {
    app.use(httpLogger);
  }

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/spaces', spaceRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Documentación interactiva de la API (OpenAPI 3). Ver backend/src/docs/openapi.js.
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
