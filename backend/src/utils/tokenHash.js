const crypto = require('crypto');

/**
 * Hash determinístico (SHA-256) usado para almacenar refresh tokens en la base de datos
 * sin guardar el valor en texto plano. A diferencia de bcrypt (usado para contraseñas),
 * aquí no se necesita salt por token individual: el propio refresh token ya es un valor
 * aleatorio de alta entropía (256 bits) generado por el servidor, por lo que un hash
 * determinístico es suficiente y permite buscarlo por igualdad en la consulta a MongoDB.
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { hashToken };
