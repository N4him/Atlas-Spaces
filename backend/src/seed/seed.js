require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Space = require('../models/Space');
const Reservation = require('../models/Reservation');
const { bogotaStringToUTCDate } = require('../utils/dateUtils');

const SEED_PASSWORD = 'Atlas2026!';

async function seed() {
  await connectDB();

  console.log('[seed] Limpiando colecciones existentes...');
  await Promise.all([
    User.deleteMany({}),
    Space.deleteMany({}),
    Reservation.deleteMany({}),
  ]);

  console.log('[seed] Creando usuarios...');
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const [admin, operator] = await User.create([
    {
      name: 'Andrea Restrepo',
      email: 'admin@atlasspaces.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    },
    {
      name: 'Carlos Mena',
      email: 'operador@atlasspaces.com',
      passwordHash,
      role: 'operator',
      isActive: true,
    },
  ]);

  console.log('[seed] Creando espacios...');
  const spaces = await Space.create([
    {
      name: 'Sala Bogotá',
      type: 'sala_reunion',
      location: 'Sede Chapinero',
      capacity: 8,
      openTime: '07:00',
      closeTime: '20:00',
      isActive: true,
    },
    {
      name: 'Sala Medellín',
      type: 'sala_reunion',
      location: 'Sede Poblado',
      capacity: 6,
      openTime: '07:00',
      closeTime: '20:00',
      isActive: true,
    },
    {
      name: 'Oficina Cali',
      type: 'oficina_privada',
      location: 'Sede Cali',
      capacity: 4,
      openTime: '08:00',
      closeTime: '18:00',
      isActive: true,
    },
    {
      name: 'Oficina Norte',
      type: 'oficina_privada',
      location: 'Sede Chapinero',
      capacity: 2,
      openTime: '08:00',
      closeTime: '18:00',
      isActive: true,
    },
    {
      name: 'Auditorio Principal',
      type: 'auditorio',
      location: 'Sede Poblado',
      capacity: 60,
      openTime: '07:00',
      closeTime: '22:00',
      isActive: true,
    },
  ]);

  console.log('[seed] Creando reservas de ejemplo...');
  const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  const clientNames = [
    'María Gómez', 'Jorge Ramírez', 'Laura Torres', 'Andrés Castro', 'Sofía Vargas',
    'Diego Herrera', 'Camila Rojas', 'Felipe Ortiz', 'Valentina Cruz', 'Santiago Peña',
  ];

  const reservationsData = [];
  const today = new Date();
  // Generamos reservas distribuidas entre 10 días atrás y 15 días adelante, en hora Bogotá,
  // para que el dashboard tenga datos históricos y futuros que probar.
  for (let i = 0; i < 20; i += 1) {
    const dayOffset = -10 + Math.floor((i * 25) / 20); // rango aprox -10 a +15
    const baseDate = new Date(today);
    baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);
    const dateStr = baseDate.toISOString().slice(0, 10);

    const space = spaces[i % spaces.length];
    const startHour = 8 + (i % 8);
    const startStr = `${dateStr}T${String(startHour).padStart(2, '0')}:00`;
    const endStr = `${dateStr}T${String(startHour + 1).padStart(2, '0')}:00`;

    const status = dayOffset < 0 ? statuses[i % statuses.length] : statuses[i % 2 === 0 ? 1 : 0];

    reservationsData.push({
      space: space._id,
      title: `Reunión ${i + 1}`,
      clientName: clientNames[i % clientNames.length],
      clientEmail: `cliente${i + 1}@ejemplo.com`,
      attendeesCount: Math.min(space.capacity, 1 + (i % space.capacity)),
      startAt: bogotaStringToUTCDate(startStr),
      endAt: bogotaStringToUTCDate(endStr),
      status,
      notes: i % 3 === 0 ? 'Requiere proyector' : '',
      createdBy: i % 2 === 0 ? admin._id : operator._id,
    });
  }

  await Reservation.insertMany(reservationsData);

  console.log('\n[seed] Listo. Datos creados:');
  console.log(`  - Usuarios: 2 (admin@atlasspaces.com / operador@atlasspaces.com)`);
  console.log(`  - Contraseña para ambos: ${SEED_PASSWORD}`);
  console.log(`  - Espacios: ${spaces.length}`);
  console.log(`  - Reservas: ${reservationsData.length}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Error al ejecutar el seed:', err);
  process.exit(1);
});
