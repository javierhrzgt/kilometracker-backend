const request = require('supertest');
const app = require('./app');
const Vehicle = require('../models/Vehicle');
const { createTestUser, createReadOnlyUser, createTestVehicle, authHeader } = require('./helpers');

describe('Vehicle Endpoints', () => {
  describe('GET /api/vehicles', () => {
    it('should return empty array when no vehicles', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/vehicles')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.count).toBe(0);
    });

    it('should return user vehicles', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });
      await createTestVehicle(user._id, { alias: 'CAR2' });

      const res = await request(app)
        .get('/api/vehicles')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });

    it('should not return other users vehicles', async () => {
      const { user: user1, token } = await createTestUser();
      const { user: user2 } = await createTestUser();

      await createTestVehicle(user1._id, { alias: 'MYCAR' });
      await createTestVehicle(user2._id, { alias: 'OTHERCAR' });

      const res = await request(app)
        .get('/api/vehicles')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].alias).toBe('MYCAR');
    });

    it('should filter by isActive', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'ACTIVE', isActive: true });
      await createTestVehicle(user._id, { alias: 'INACTIVE', isActive: false });

      const res = await request(app)
        .get('/api/vehicles?isActive=true')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].alias).toBe('ACTIVE');
    });

    it('should support pagination', async () => {
      const { user, token } = await createTestUser();
      for (let i = 0; i < 15; i++) {
        await createTestVehicle(user._id, { alias: `CAR${i}` });
      }

      const res = await request(app)
        .get('/api/vehicles?page=1&limit=5')
        .set(authHeader(token));

      expect(res.body.count).toBe(5);
      expect(res.body.pagination.total).toBe(15);
      expect(res.body.pagination.totalPages).toBe(3);
      expect(res.body.pagination.hasNextPage).toBe(true);
    });
  });

  describe('GET /api/vehicles/:alias', () => {
    it('should return vehicle by alias', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR', marca: 'Toyota' });

      const res = await request(app)
        .get('/api/vehicles/MYCAR')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.alias).toBe('MYCAR');
      expect(res.body.data.marca).toBe('Toyota');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/vehicles/NONEXISTENT')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });

    it('should be case-insensitive for alias', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR' });

      const res = await request(app)
        .get('/api/vehicles/mycar')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.alias).toBe('MYCAR');
    });
  });

  describe('POST /api/vehicles', () => {
    it('should create a new vehicle', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/vehicles')
        .set(authHeader(token))
        .send({
          alias: 'newcar',
          marca: 'Honda',
          modelo: 2021,
          plates: 'XYZ789',
          kilometrajeInicial: 5000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.alias).toBe('NEWCAR'); // Should be uppercase
      expect(res.body.data.kilometrajeTotal).toBe(5000);
    });

    it('should fail for read-only user', async () => {
      const { token } = await createReadOnlyUser();

      const res = await request(app)
        .post('/api/vehicles')
        .set(authHeader(token))
        .send({
          alias: 'newcar',
          marca: 'Honda',
          modelo: 2021,
          kilometrajeInicial: 5000
        });

      expect(res.status).toBe(403);
    });

    it('should fail with missing required fields', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/vehicles')
        .set(authHeader(token))
        .send({
          alias: 'newcar'
        });

      expect(res.status).toBe(400);
    });

    it('should fail with duplicate alias', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'EXISTING' });

      const res = await request(app)
        .post('/api/vehicles')
        .set(authHeader(token))
        .send({
          alias: 'EXISTING',
          marca: 'Honda',
          modelo: 2021,
          kilometrajeInicial: 5000
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/vehicles/:alias', () => {
    it('should update vehicle', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR', marca: 'Toyota' });

      const res = await request(app)
        .put('/api/vehicles/MYCAR')
        .set(authHeader(token))
        .send({ marca: 'Honda' });

      expect(res.status).toBe(200);
      expect(res.body.data.marca).toBe('Honda');
    });

    it('should not allow updating kilometrajeTotal directly', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR', kilometrajeInicial: 1000 });

      const res = await request(app)
        .put('/api/vehicles/MYCAR')
        .set(authHeader(token))
        .send({ kilometrajeTotal: 99999 });

      expect(res.status).toBe(200);
      expect(res.body.data.kilometrajeTotal).toBe(1000); // Should remain unchanged
    });

    it('should return 404 for non-existent vehicle', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .put('/api/vehicles/NONEXISTENT')
        .set(authHeader(token))
        .send({ marca: 'Honda' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/vehicles/:alias', () => {
    it('should soft delete (deactivate) vehicle', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR' });

      const res = await request(app)
        .delete('/api/vehicles/MYCAR')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);

      // Verify in database
      const vehicle = await Vehicle.findOne({ alias: 'MYCAR' });
      expect(vehicle.isActive).toBe(false);
    });
  });

  describe('PATCH /api/vehicles/:alias/reactivate', () => {
    it('should reactivate vehicle', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR', isActive: false });

      const res = await request(app)
        .patch('/api/vehicles/MYCAR/reactivate')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('GET /api/vehicles/:alias/stats', () => {
    it('should return vehicle statistics', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR' });

      const res = await request(app)
        .get('/api/vehicles/MYCAR/stats')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.vehicle).toBeDefined();
      expect(res.body.data.statistics).toBeDefined();
      expect(res.body.data.costs).toBeDefined();
      expect(res.body.data.efficiency).toBeDefined();
    });
  });

  describe('GET /api/vehicles/:alias/fuel-efficiency', () => {
    it('should return fuel efficiency data', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR' });

      const res = await request(app)
        .get('/api/vehicles/MYCAR/fuel-efficiency')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.efficiency).toBeDefined();
      expect(res.body.data.period).toBeDefined();
    });

    it('should support date range filtering', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'MYCAR' });

      const res = await request(app)
        .get('/api/vehicles/MYCAR/fuel-efficiency?startDate=2024-01-01&endDate=2024-12-31')
        .set(authHeader(token));

      expect(res.status).toBe(200);
    });
  });
});
