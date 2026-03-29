/**
 * Ownership tests — verifica que el Usuario B no puede acceder
 * ni modificar recursos que pertenecen al Usuario A.
 */
const request = require('supertest');
const app = require('./app');
const Route = require('../models/Route');
const Refuel = require('../models/Refuel');
const Maintenance = require('../models/Maintenance');
const Expense = require('../models/Expense');
const { createTestUser, createTestVehicle, authHeader } = require('./helpers');

describe('Ownership — Cross-user access control', () => {
  let userA, tokenA, vehicleA;
  let userB, tokenB;

  beforeEach(async () => {
    ({ user: userA, token: tokenA } = await createTestUser());
    ({ user: userB, token: tokenB } = await createTestUser());
    vehicleA = await createTestVehicle(userA._id, { alias: 'CARA' });
  });

  // ─── Vehicles ───────────────────────────────────────────────────────────────

  describe('Vehicles', () => {
    it('GET /api/vehicles — user B cannot see user A vehicles', async () => {
      const res = await request(app)
        .get('/api/vehicles')
        .set(authHeader(tokenB));

      expect(res.status).toBe(200);
      expect(res.body.data.map((v) => v.alias)).not.toContain('CARA');
    });

    it('GET /api/vehicles/:alias — user B gets 404 for user A vehicle', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleA.alias}`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });

    it('PUT /api/vehicles/:alias — user B cannot update user A vehicle', async () => {
      const res = await request(app)
        .put(`/api/vehicles/${vehicleA.alias}`)
        .set(authHeader(tokenB))
        .send({ marca: 'Hacked' });

      expect(res.status).toBe(404);
    });

    it('DELETE /api/vehicles/:alias — user B cannot delete user A vehicle', async () => {
      const res = await request(app)
        .delete(`/api/vehicles/${vehicleA.alias}`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });

    it('GET /api/vehicles/:alias/stats — user B gets 404', async () => {
      const res = await request(app)
        .get(`/api/vehicles/${vehicleA.alias}/stats`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });
  });

  // ─── Routes ─────────────────────────────────────────────────────────────────

  describe('Routes', () => {
    let routeA;

    beforeEach(async () => {
      routeA = await Route.create({
        vehicleAlias: vehicleA.alias,
        vehicle: vehicleA._id,
        distanciaRecorrida: 150,
        fecha: new Date(),
        owner: userA._id,
      });
    });

    it('GET /api/routes — user B does not see user A routes', async () => {
      const res = await request(app)
        .get('/api/routes')
        .set(authHeader(tokenB));

      expect(res.status).toBe(200);
      const ids = res.body.data.map((r) => r._id.toString());
      expect(ids).not.toContain(routeA._id.toString());
    });

    it('PUT /api/routes/:id — user B cannot update user A route', async () => {
      const res = await request(app)
        .put(`/api/routes/${routeA._id}`)
        .set(authHeader(tokenB))
        .send({ distanciaRecorrida: 999 });

      expect(res.status).toBe(404);
    });

    it('DELETE /api/routes/:id — user B cannot delete user A route', async () => {
      const res = await request(app)
        .delete(`/api/routes/${routeA._id}`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });
  });

  // ─── Refuels ─────────────────────────────────────────────────────────────────

  describe('Refuels', () => {
    let refuelA;

    beforeEach(async () => {
      refuelA = await Refuel.create({
        vehicleAlias: vehicleA.alias,
        vehicle: vehicleA._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 50,
        galones: 10,
        fecha: new Date(),
        owner: userA._id,
      });
    });

    it('GET /api/refuels — user B does not see user A refuels', async () => {
      const res = await request(app)
        .get('/api/refuels')
        .set(authHeader(tokenB));

      const ids = res.body.data.map((r) => r._id.toString());
      expect(ids).not.toContain(refuelA._id.toString());
    });

    it('PUT /api/refuels/:id — user B cannot update user A refuel', async () => {
      const res = await request(app)
        .put(`/api/refuels/${refuelA._id}`)
        .set(authHeader(tokenB))
        .send({ cantidadGastada: 999 });

      expect(res.status).toBe(404);
    });

    it('DELETE /api/refuels/:id — user B cannot delete user A refuel', async () => {
      const res = await request(app)
        .delete(`/api/refuels/${refuelA._id}`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });
  });

  // ─── Maintenance ─────────────────────────────────────────────────────────────

  describe('Maintenance', () => {
    let maintenanceA;

    beforeEach(async () => {
      maintenanceA = await Maintenance.create({
        vehicleAlias: vehicleA.alias,
        vehicle: vehicleA._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Oil change',
        costo: 80,
        kilometraje: 50000,
        fecha: new Date(),
        owner: userA._id,
      });
    });

    it('GET /api/maintenance — user B does not see user A maintenance', async () => {
      const res = await request(app)
        .get('/api/maintenance')
        .set(authHeader(tokenB));

      const ids = res.body.data.map((m) => m._id.toString());
      expect(ids).not.toContain(maintenanceA._id.toString());
    });

    it('PUT /api/maintenance/:id — user B cannot update user A maintenance', async () => {
      const res = await request(app)
        .put(`/api/maintenance/${maintenanceA._id}`)
        .set(authHeader(tokenB))
        .send({ costo: 999 });

      expect(res.status).toBe(404);
    });

    it('DELETE /api/maintenance/:id — user B cannot delete user A maintenance', async () => {
      const res = await request(app)
        .delete(`/api/maintenance/${maintenanceA._id}`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });
  });

  // ─── Expenses ─────────────────────────────────────────────────────────────────

  describe('Expenses', () => {
    let expenseA;

    beforeEach(async () => {
      expenseA = await Expense.create({
        vehicleAlias: vehicleA.alias,
        vehicle: vehicleA._id,
        categoria: 'Seguro',
        monto: 200,
        descripcion: 'Insurance',
        fecha: new Date(),
        owner: userA._id,
      });
    });

    it('GET /api/expenses — user B does not see user A expenses', async () => {
      const res = await request(app)
        .get('/api/expenses')
        .set(authHeader(tokenB));

      const ids = res.body.data.map((e) => e._id.toString());
      expect(ids).not.toContain(expenseA._id.toString());
    });

    it('PUT /api/expenses/:id — user B cannot update user A expense', async () => {
      const res = await request(app)
        .put(`/api/expenses/${expenseA._id}`)
        .set(authHeader(tokenB))
        .send({ monto: 999 });

      expect(res.status).toBe(404);
    });

    it('DELETE /api/expenses/:id — user B cannot delete user A expense', async () => {
      const res = await request(app)
        .delete(`/api/expenses/${expenseA._id}`)
        .set(authHeader(tokenB));

      expect(res.status).toBe(404);
    });
  });
});
