const mongoose = require('mongoose');

const SPACE_TYPES = ['sala_reunion', 'oficina_privada', 'auditorio'];

const spaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del espacio es obligatorio'],
      trim: true,
    },
    type: {
      type: String,
      enum: SPACE_TYPES,
      required: [true, 'El tipo de espacio es obligatorio'],
    },
    location: {
      type: String,
      required: [true, 'La sede o ubicación es obligatoria'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'La capacidad es obligatoria'],
      min: [1, 'La capacidad debe ser mayor que cero'],
    },
    // Horario expresado en hora de Bogotá, formato "HH:mm" (ej. "08:00")
    openTime: {
      type: String,
      required: [true, 'La hora de apertura es obligatoria'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'openTime debe tener formato HH:mm'],
    },
    closeTime: {
      type: String,
      required: [true, 'La hora de cierre es obligatoria'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'closeTime debe tener formato HH:mm'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

spaceSchema.pre('validate', function validateSchedule(next) {
  if (this.openTime && this.closeTime && this.openTime >= this.closeTime) {
    return next(new Error('La hora de apertura debe ser anterior a la hora de cierre'));
  }
  next();
});

module.exports = mongoose.model('Space', spaceSchema);
module.exports.SPACE_TYPES = SPACE_TYPES;
