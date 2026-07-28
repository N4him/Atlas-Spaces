const mongoose = require('mongoose');

const RESERVATION_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

// Estados que "bloquean" un horario (impiden nuevas reservas superpuestas)
const BLOCKING_STATUSES = ['pending', 'confirmed'];

const reservationSchema = new mongoose.Schema(
  {
    space: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: [true, 'El espacio es obligatorio'],
    },
    title: {
      type: String,
      required: [true, 'El título o motivo es obligatorio'],
      trim: true,
    },
    clientName: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
    },
    clientEmail: {
      type: String,
      required: [true, 'El correo del cliente es obligatorio'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El correo del cliente no tiene un formato válido'],
    },
    attendeesCount: {
      type: Number,
      required: [true, 'El número de asistentes es obligatorio'],
      min: [1, 'El número de asistentes debe ser mayor que cero'],
    },
    startAt: {
      type: Date,
      required: [true, 'La fecha y hora de inicio son obligatorias'],
    },
    endAt: {
      type: Date,
      required: [true, 'La fecha y hora de finalización son obligatorias'],
    },
    status: {
      type: String,
      enum: RESERVATION_STATUSES,
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

reservationSchema.index({ space: 1, startAt: 1, endAt: 1 });
reservationSchema.index({ status: 1 });
// Nota: la búsqueda por texto (search) se implementa con regex en el controlador,
// no con índice $text, para permitir coincidencias parciales (substring) en
// título, cliente y correo, en vez de solo coincidencias de palabra completa.

module.exports = mongoose.model('Reservation', reservationSchema);
module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;
module.exports.BLOCKING_STATUSES = BLOCKING_STATUSES;
