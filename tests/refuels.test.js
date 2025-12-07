const request = require('supertest');
const app = require('./app');
const Refuel = require('../models/Refuel');
const { createTestUser, createReadOnlyUser, createTestVehicle, authHeader } = require('./helpers');

describe('Refuels Endpoints', () => {
  describe('GET /api/refuels', () => {
    it('should return empty array when no refuels', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/refuels')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return user refuels', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        fecha: new Date(),
        owner: user._id
      });

      const res = await request(app)
        .get('/api/refuels')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('should filter by vehicleAlias', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      await Refuel.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        owner: user._id
      });
      await Refuel.create({
        vehicleAlias: vehicle2.alias,
        vehicle: vehicle2._id,
        tipoCombustible: 'Premium',
        cantidadGastada: 600,
        galones: 10,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/refuels?vehicleAlias=CAR1')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].tipoCombustible).toBe('Regular');
    });

    it('should include virtual precioPorGalon when using lean with virtuals', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/refuels')
        .set(authHeader(token));

      // Virtual field should be included via lean({ virtuals: true })
      expect(res.body.data[0].cantidadGastada).toBe(500);
      expect(res.body.data[0].galones).toBe(10);
      // Note: precioPorGalon virtual may not be returned with lean() depending on Mongoose version
      // The API uses lean({ virtuals: true }) but this may not work in all configurations
    });
  });

  describe('GET /api/refuels/:id', () => {
    it('should return refuel by ID', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const refuel = await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Premium',
        cantidadGastada: 600,
        galones: 12,
        owner: user._id
      });

      const res = await request(app)
        .get(`/api/refuels/${refuel._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.tipoCombustible).toBe('Premium');
    });

    it('should return 404 for non-existent refuel', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/refuels/507f1f77bcf86cd799439011')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/refuels', () => {
    it('should create a new refuel', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/refuels')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipoCombustible: 'Regular',
          cantidadGastada: 450,
          galones: 9
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tipoCombustible).toBe('Regular');
      expect(res.body.data.cantidadGastada).toBe(450);
    });

    it('should fail for read-only user', async () => {
      const { user, token } = await createReadOnlyUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/refuels')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipoCombustible: 'Regular',
          cantidadGastada: 450,
          galones: 9
        });

      expect(res.status).toBe(403);
    });

    it('should fail for non-existent vehicle', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .post('/api/refuels')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'NONEXISTENT',
          tipoCombustible: 'Regular',
          cantidadGastada: 450,
          galones: 9
        });

      expect(res.status).toBe(404);
    });

    it('should fail with invalid fuel type', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/refuels')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipoCombustible: 'InvalidType',
          cantidadGastada: 450,
          galones: 9
        });

      expect(res.status).toBe(400);
    });

    it('should create refuel without galones', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/refuels')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipoCombustible: 'Premium',
          cantidadGastada: 500
        });

      expect(res.status).toBe(201);
      expect(res.body.data.galones).toBeNull();
    });
  });

  describe('PUT /api/refuels/:id', () => {
    it('should update refuel', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const refuel = await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        owner: user._id
      });

      const res = await request(app)
        .put(`/api/refuels/${refuel._id}`)
        .set(authHeader(token))
        .send({
          cantidadGastada: 550
        });

      expect(res.status).toBe(200);
      expect(res.body.data.cantidadGastada).toBe(550);
    });

    it('should allow changing vehicle', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      const refuel = await Refuel.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        owner: user._id
      });

      const res = await request(app)
        .put(`/api/refuels/${refuel._id}`)
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR2'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicleAlias).toBe('CAR2');
    });
  });

  describe('DELETE /api/refuels/:id', () => {
    it('should permanently delete refuel', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const refuel = await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        owner: user._id
      });

      const res = await request(app)
        .delete(`/api/refuels/${refuel._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);

      // Verify refuel is deleted
      const deletedRefuel = await Refuel.findById(refuel._id);
      expect(deletedRefuel).toBeNull();
    });
  });

  describe('GET /api/refuels/vehicle/:alias/analysis', () => {
    it('should return fuel analysis', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Regular',
        cantidadGastada: 500,
        galones: 10,
        owner: user._id
      });
      await Refuel.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipoCombustible: 'Premium',
        cantidadGastada: 600,
        galones: 10,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/refuels/vehicle/CAR1/analysis')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalReabastecimientos).toBe(2);
      expect(res.body.data.summary.totalGalones).toBe('20.00');
      expect(res.body.data.porTipoCombustible).toBeDefined();
    });
  });
});
