const mongoose = require('mongoose');

/**
 * Almacena refresh tokens de forma segura: nunca se guarda el token en texto plano,
 * solo un hash SHA-256 (ver utils/tokenHash.js). Esto permite:
 *  - Revocar sesiones individuales (logout) o todas las de un usuario.
 *  - Rotación: cada uso de un refresh token lo invalida y emite uno nuevo, de modo que
 *    un token robado y reutilizado después de una rotación legítima es detectable.
 *  - Auditar sesiones activas por usuario si se necesita en el futuro.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    // Referencia al token que lo reemplazó al rotar (útil para trazabilidad/depuración).
    replacedByHash: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// TTL index: Mongo elimina automáticamente el documento cuando expiresAt se cumple,
// evitando que la colección crezca indefinidamente con tokens vencidos.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.methods.isActive = function isActive() {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
