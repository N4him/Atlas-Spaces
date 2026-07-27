const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true, // ya crea el índice único; no se declara con schema.index() para evitar duplicado
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'El correo no tiene un formato válido'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'operator'],
      required: true,
      default: 'operator',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true } // createdAt / updatedAt = fechas de auditoría
);

module.exports = mongoose.model('User', userSchema);
