const request = require('supertest');
const app = require('./app');
const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const { createTestUser, createReadOnlyUser, createTestVehicle, authHeader } = require('./helpers');

describe('Routes Endpoints', () => {
  describe('GET /api/routes', () => {
    it('should return empty array when no routes', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/routes')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return user routes', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Route.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        distanciaRecorrida: 100,
        fecha: new Date(),
        owner: user._id
      });

      const res = await request(app)
        .get('/api/routes')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('should filter by vehicleAlias', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      await Route.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        distanciaRecorrida: 100,
        fecha: new Date(),
        owner: user._id
      });
      await Route.create({
        vehicleAlias: vehicle2.alias,
        vehicle: vehicle2._id,
        distanciaRecorrida: 200,
        fecha: new Date(),
        owner: user._id
      });

      const res = await request(app)
        .get('/api/routes?vehicleAlias=CAR1')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].vehicleAlias).toBe('CAR1');
    });

    it('should filter by date range', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Route.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        distanciaRecorrida: 100,
        fecha: new Date('2024-01-15'),
        owner: user._id
      });
      await Route.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        distanciaRecorrida: 200,
        fecha: new Date('2024-06-15'),
        owner: user._id
      });

      const res = await request(app)
        .get('/api/routes?startDate=2024-01-01&endDate=2024-03-31')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/routes/:id', () => {
    it('should return route by ID', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const route = await Route.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        distanciaRecorrida: 150,
        fecha: new Date(),
        owner: user._id
      });

      const res = await request(app)
        .get(`/api/routes/${route._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.distanciaRecorrida).toBe(150);
    });

    it('should return 404 for non-existent route', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/routes/507f1f77bcf86cd799439011')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/routes', () => {
    it('should create a new route and update vehicle kilometraje', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1', kilometrajeInicial: 1000 });

      const res = await request(app)
        .post('/api/routes')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          distanciaRecorrida: 250
        });

      expect(res.status).toBe(201);
      expect(res.body.data.distanciaRecorrida).toBe(250);
      expect(res.body.vehicleKilometraje).toBe(1250);

      // Verify vehicle was updated
      const updatedVehicle = await Vehicle.findById(vehicle._id);
      expect(updatedVehicle.kilometrajeTotal).toBe(1250);
    });

    it('should fail for read-only user', async () => {
      const { user, token } = await createReadOnlyUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/routes')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          distanciaRecorrida: 100
        });

      expect(res.status).toBe(403);
    });

    it('should fail for inactive vehicle', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1', isActive: false });

      const res = await request(app)
        .post('/api/routes')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          distanciaRecorrida: 100
        });

      expect(res.status).toBe(404);
    });

    it('should fail with invalid distance', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/routes')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          distanciaRecorrida: -10
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/routes/:id', () => {
    it('should update route and adjust vehicle kilometraje', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1', kilometrajeInicial: 1000 });

      const route = await Route.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        distanciaRecorrida: 100,
        fecha: new Date(),
        owner: user._id
      });

      // Update vehicle km manually to simulate the original state
      vehicle.kilometrajeTotal = 1100;
      await vehicle.save();

      const res = await request(app)
        .put(`/api/routes/${route._id}`)
        .set(authHeader(token))
        .send({
          distanciaRecorrida: 150
        });

      expect(res.status).toBe(200);
      expect(res.body.data.distanciaRecorrida).toBe(150);

      // Vehicle km should have increased by 50 (150 - 100)
      const updatedVehicle = await Vehicle.findById(vehicle._id);
      expect(updatedVehicle.kilometrajeTotal).toBe(1150);
    });

    it('should allow changing vehicle', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1', kilometrajeInicial: 1000 });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2', kilometrajeInicial: 2000 });

      const route = await Route.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        distanciaRecorrida: 100,
        fecha: new Date(),
        owner: user._id
      });

      // Update vehicle km
      vehicle1.kilometrajeTotal = 1100;
      await vehicle1.save();

      const res = await request(app)
        .put(`/api/routes/${route._id}`)
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR2'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicleAlias).toBe('CAR2');

      // Vehicle 1 should have km subtracted
      const updatedVehicle1 = await Vehicle.findById(vehicle1._id);
      expect(updatedVehicle1.kilometrajeTotal).toBe(1000);

      // Vehicle 2 should have km added
      const updatedVehicle2 = await Vehicle.findById(vehicle2._id);
      expect(updatedVehicle2.kilometrajeTotal).toBe(2100);
    });
  });

  describe('DELETE /api/routes/:id', () => {
    it('should permanently delete route and update vehicle kilometraje', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1', kilometrajeInicial: 1000 });

      const route = await Route.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        distanciaRecorrida: 100,
        fecha: new Date(),
        owner: user._id
      });

      vehicle.kilometrajeTotal = 1100;
      await vehicle.save();

      const res = await request(app)
        .delete(`/api/routes/${route._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.vehicleKilometraje).toBe(1000);

      // Verify route is deleted
      const deletedRoute = await Route.findById(route._id);
      expect(deletedRoute).toBeNull();
    });
  });
});
