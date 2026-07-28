const request = require('supertest');
const createApp = require('../src/app');
const { createUser, tokenFor, createSpace } = require('./helpers');

const app = createApp();

// Genera una fecha futura (mañana) en formato YYYY-MM-DD para evitar el rechazo por "fecha pasada".
function tomorrowDateStr() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 2); // +2 días de margen amplio
  return d.toISOString().slice(0, 10);
}

describe('Reglas de negocio de reservas', () => {
  let token;
  let space;

  beforeEach(async () => {
    const operator = await createUser({ role: 'operator' });
    token = tokenFor(operator);
    space = await createSpace({ capacity: 4, openTime: '08:00', closeTime: '18:00' });
  });

  test('Rechaza una reserva que se superpone con otra existente (409 Conflict)', async () => {
    const date = tomorrowDateStr();

    const first = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión A',
        clientName: 'Cliente A',
        clientEmail: 'clientea@test.com',
        attendeesCount: 2,
        startAt: `${date}T09:00`,
        endAt: `${date}T10:00`,
      });
    expect(first.status).toBe(201);

    // Se superpone: empieza 30 min antes de que termine la primera
    const overlapping = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión B',
        clientName: 'Cliente B',
        clientEmail: 'clienteb@test.com',
        attendeesCount: 2,
        startAt: `${date}T09:30`,
        endAt: `${date}T10:30`,
      });

    expect(overlapping.status).toBe(409);
    expect(overlapping.body.message).toMatch(/superpone/i);
  });

  test('Permite dos reservas consecutivas (una inicia justo cuando termina la otra)', async () => {
    const date = tomorrowDateStr();

    const first = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión A',
        clientName: 'Cliente A',
        clientEmail: 'clientea@test.com',
        attendeesCount: 2,
        startAt: `${date}T09:00`,
        endAt: `${date}T10:00`,
      });
    expect(first.status).toBe(201);

    const consecutive = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión B',
        clientName: 'Cliente B',
        clientEmail: 'clienteb@test.com',
        attendeesCount: 2,
        startAt: `${date}T10:00`,
        endAt: `${date}T11:00`,
      });

    expect(consecutive.status).toBe(201);
  });

  test('Rechaza una reserva que excede la capacidad del espacio', async () => {
    const date = tomorrowDateStr();

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión grande',
        clientName: 'Cliente C',
        clientEmail: 'clientec@test.com',
        attendeesCount: 999,
        startAt: `${date}T09:00`,
        endAt: `${date}T10:00`,
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/capacidad/i);
  });

  test('Rechaza una reserva fuera del horario del espacio', async () => {
    const date = tomorrowDateStr();

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión nocturna',
        clientName: 'Cliente D',
        clientEmail: 'cliented@test.com',
        attendeesCount: 2,
        startAt: `${date}T19:00`,
        endAt: `${date}T20:00`,
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/horario/i);
  });

  test('Rechaza una reserva con fecha de inicio posterior a la de finalización', async () => {
    const date = tomorrowDateStr();

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión invertida',
        clientName: 'Cliente E',
        clientEmail: 'clientee@test.com',
        attendeesCount: 2,
        startAt: `${date}T11:00`,
        endAt: `${date}T10:00`,
      });

    expect(res.status).toBe(422);
  });

  test('Rechaza la creación de reservas en fechas pasadas', async () => {
    const past = new Date();
    past.setUTCDate(past.getUTCDate() - 5);
    const dateStr = past.toISOString().slice(0, 10);

    const res = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión pasada',
        clientName: 'Cliente F',
        clientEmail: 'clientef@test.com',
        attendeesCount: 2,
        startAt: `${dateStr}T09:00`,
        endAt: `${dateStr}T10:00`,
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/pasadas/i);
  });

  test('Al editar, no se compara la reserva contra sí misma (permite guardar sin cambios de horario)', async () => {
    const date = tomorrowDateStr();

    const created = await request(app)
      .post('/api/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        spaceId: space._id.toString(),
        title: 'Reunión editable',
        clientName: 'Cliente G',
        clientEmail: 'clienteg@test.com',
        attendeesCount: 2,
        startAt: `${date}T09:00`,
        endAt: `${date}T10:00`,
      });
    expect(created.status).toBe(201);
    const id = created.body.item._id;

    const edited = await request(app)
      .put(`/api/reservations/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        notes: 'Actualizada sin cambiar horario',
      });

    expect(edited.status).toBe(200);
    expect(edited.body.item.notes).toBe('Actualizada sin cambiar horario');
  });
});
