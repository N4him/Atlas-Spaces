/**
 * Especificación OpenAPI 3.0 de la API de Atlas Spaces.
 * Se sirve como JSON interactivo en GET /api/docs (Swagger UI).
 * Se mantiene como objeto JS (en vez de YAML) para no añadir un paso de parseo y
 * poder reutilizar constantes/comentarios de JavaScript.
 */
const bearerAuth = { bearerAuth: [] };

const errorSchema = {
  type: 'object',
  properties: { message: { type: 'string' } },
};

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
];

const reservationFilterParams = [
  { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] } },
  { name: 'spaceId', in: 'query', schema: { type: 'string' } },
  { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD (hora Bogotá)' },
  { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD (hora Bogotá)' },
  { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Busca en título, nombre y correo del cliente' },
  { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['startAt', 'createdAt'], default: 'startAt' } },
  { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
];

const dateRangeParams = [
  { name: 'from', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
  { name: 'to', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Atlas Spaces API',
    version: '1.0.0',
    description:
      'API REST para la plataforma de reservas de coworking Atlas Spaces. ' +
      'Autenticación por JWT (access token en header Authorization) con refresh token ' +
      'en cookie httpOnly. Todas las fechas se reciben/devuelven en hora America/Bogota ' +
      'y se persisten internamente en UTC (ver README, sección "Manejo de fechas").',
  },
  servers: [{ url: '/api', description: 'Prefijo base de la API' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: errorSchema,
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'operator'] },
          isActive: { type: 'boolean' },
        },
      },
      Space: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string' },
          location: { type: 'string' },
          capacity: { type: 'integer' },
          openTime: { type: 'string', example: '08:00' },
          closeTime: { type: 'string', example: '18:00' },
          isActive: { type: 'boolean' },
        },
      },
      Reservation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          space: { type: 'string', description: 'ID del espacio' },
          title: { type: 'string' },
          clientName: { type: 'string' },
          clientEmail: { type: 'string' },
          attendeesCount: { type: 'integer' },
          startAt: { type: 'string', format: 'date-time' },
          endAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
          notes: { type: 'string' },
        },
      },
    },
  },
  tags: [
    { name: 'Auth', description: 'Autenticación y sesión' },
    { name: 'Spaces', description: 'Gestión de espacios de coworking' },
    { name: 'Reservations', description: 'Gestión de reservas' },
    { name: 'Analytics', description: 'Indicadores y agregaciones para el dashboard' },
    { name: 'Health', description: 'Estado del servicio' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Chequeo de salud del servicio (usado por Docker healthcheck)',
        responses: { 200: { description: 'Servicio operativo' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Inicia sesión con correo y contraseña',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login correcto. Devuelve access token y deja un refresh token en cookie httpOnly.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { token: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
          401: { description: 'Credenciales inválidas o usuario inactivo', content: { 'application/json': { schema: errorSchema } } },
          422: { description: 'Correo o contraseña con formato inválido', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Renueva el access token usando el refresh token de la cookie httpOnly',
        description: 'El refresh token se rota en cada uso: el anterior queda revocado.',
        responses: {
          200: { description: 'Nuevo access token emitido' },
          401: { description: 'Sin sesión, o refresh token expirado/revocado', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cierra sesión: revoca el refresh token actual y limpia la cookie',
        responses: { 204: { description: 'Sesión cerrada' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Devuelve el usuario autenticado actual',
        security: [bearerAuth],
        responses: {
          200: { description: 'Usuario actual', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
          401: { description: 'No autenticado', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/spaces': {
      get: {
        tags: ['Spaces'],
        summary: 'Lista espacios',
        security: [bearerAuth],
        responses: { 200: { description: 'Listado de espacios' } },
      },
      post: {
        tags: ['Spaces'],
        summary: 'Crea un espacio (solo admin)',
        security: [bearerAuth],
        responses: {
          201: { description: 'Espacio creado' },
          403: { description: 'Rol sin permiso (operator)', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/spaces/{id}': {
      get: { tags: ['Spaces'], summary: 'Detalle de un espacio', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Espacio' }, 404: { description: 'No encontrado' } } },
      put: { tags: ['Spaces'], summary: 'Actualiza un espacio (solo admin)', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Espacio actualizado' }, 403: { description: 'Rol sin permiso' } } },
    },
    '/spaces/{id}/deactivate': {
      patch: { tags: ['Spaces'], summary: 'Desactiva un espacio (solo admin)', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Espacio desactivado' } } },
    },
    '/spaces/{id}/reactivate': {
      patch: { tags: ['Spaces'], summary: 'Reactiva un espacio (solo admin)', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Espacio reactivado' } } },
    },
    '/reservations': {
      get: {
        tags: ['Reservations'],
        summary: 'Lista reservas con paginación, filtros, búsqueda y orden',
        security: [bearerAuth],
        parameters: [...paginationParams, ...reservationFilterParams],
        responses: { 200: { description: 'Listado paginado de reservas' } },
      },
      post: {
        tags: ['Reservations'],
        summary: 'Crea una reserva (valida solapamiento, capacidad, horario y fechas)',
        security: [bearerAuth],
        responses: {
          201: { description: 'Reserva creada' },
          409: { description: 'Conflicto de horario con otra reserva', content: { 'application/json': { schema: errorSchema } } },
          422: { description: 'Regla de negocio violada (capacidad, horario, fechas)', content: { 'application/json': { schema: errorSchema } } },
        },
      },
    },
    '/reservations/export': {
      get: {
        tags: ['Reservations'],
        summary: 'Exporta a CSV las reservas que coinciden con los filtros activos',
        security: [bearerAuth],
        parameters: reservationFilterParams,
        responses: { 200: { description: 'Archivo CSV (text/csv, UTF-8 con BOM)' } },
      },
    },
    '/reservations/{id}': {
      get: { tags: ['Reservations'], summary: 'Detalle de una reserva', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reserva' }, 404: { description: 'No encontrada' } } },
      put: { tags: ['Reservations'], summary: 'Edita una reserva (revalida todas las reglas)', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reserva actualizada' }, 409: { description: 'Conflicto de horario' } } },
    },
    '/reservations/{id}/cancel': {
      patch: { tags: ['Reservations'], summary: 'Cancela una reserva', security: [bearerAuth], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Reserva cancelada' } } },
    },
    '/analytics/summary': {
      get: { tags: ['Analytics'], summary: 'Indicadores agregados del periodo', security: [bearerAuth], parameters: dateRangeParams, responses: { 200: { description: 'Totales, confirmadas, tasa de cancelación y espacio top' } } },
    },
    '/analytics/reservations-by-day': {
      get: { tags: ['Analytics'], summary: 'Serie diaria de reservas en el rango', security: [bearerAuth], parameters: dateRangeParams, responses: { 200: { description: 'Serie por día' } } },
    },
    '/analytics/status-distribution': {
      get: { tags: ['Analytics'], summary: 'Distribución de reservas por estado', security: [bearerAuth], parameters: dateRangeParams, responses: { 200: { description: 'Conteo por estado' } } },
    },
    '/analytics/space-usage': {
      get: { tags: ['Analytics'], summary: 'Uso por espacio (horas confirmadas)', security: [bearerAuth], parameters: dateRangeParams, responses: { 200: { description: 'Uso por espacio' } } },
    },
  },
};
