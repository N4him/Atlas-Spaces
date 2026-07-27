const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const Space = require('../src/models/Space');

async function createUser({ role = 'operator', email, isActive = true } = {}) {
  const passwordHash = await bcrypt.hash('Password123', 10);
  const user = await User.create({
    name: role === 'admin' ? 'Admin de prueba' : 'Operador de prueba',
    email: email || `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash,
    role,
    isActive,
  });
  return user;
}

function tokenFor(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
}

async function createSpace(overrides = {}) {
  return Space.create({
    name: 'Sala de prueba',
    type: 'sala_reunion',
    location: 'Sede Test',
    capacity: 4,
    openTime: '08:00',
    closeTime: '18:00',
    isActive: true,
    ...overrides,
  });
}

module.exports = { createUser, tokenFor, createSpace };
