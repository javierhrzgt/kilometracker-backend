const request = require('supertest');
const app = require('./app');
const Maintenance = require('../models/Maintenance');
const { createTestUser, createReadOnlyUser, createTestVehicle, authHeader } = require('./helpers');

describe('Maintenance Endpoints', () => {
  describe('GET /api/maintenance', () => {
    it('should return empty array when no maintenance records', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/maintenance')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return user maintenance records', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Cambio de aceite sintético',
        costo: 500,
        fecha: new Date(),
        kilometraje: 15000,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/maintenance')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('should filter by vehicleAlias', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      await Maintenance.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Test',
        costo: 500,
        kilometraje: 15000,
        owner: user._id
      });
      await Maintenance.create({
        vehicleAlias: vehicle2.alias,
        vehicle: vehicle2._id,
        tipo: 'Frenos',
        descripcion: 'Test',
        costo: 1000,
        kilometraje: 20000,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/maintenance?vehicleAlias=CAR1')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].tipo).toBe('Cambio de aceite');
    });

    it('should filter by tipo', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Test',
        costo: 500,
        kilometraje: 15000,
        owner: user._id
      });
      await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Frenos',
        descripcion: 'Test',
        costo: 1000,
        kilometraje: 20000,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/maintenance?tipo=Frenos')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/maintenance/upcoming', () => {
    it('should return maintenance with scheduled next service', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Test',
        costo: 500,
        kilometraje: 15000,
        proximoServicioFecha: futureDate,
        proximoServicioKm: 20000,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/maintenance/upcoming')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });
  });

  describe('GET /api/maintenance/:id', () => {
    it('should return maintenance by ID', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const maintenance = await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Inspección',
        descripcion: 'Inspección general',
        costo: 300,
        kilometraje: 18000,
        owner: user._id
      });

      const res = await request(app)
        .get(`/api/maintenance/${maintenance._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.tipo).toBe('Inspección');
    });

    it('should return 404 for non-existent maintenance', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/maintenance/507f1f77bcf86cd799439011')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/maintenance', () => {
    it('should create a new maintenance record', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/maintenance')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipo: 'Cambio de aceite',
          descripcion: 'Cambio de aceite sintético 5W-30',
          costo: 450,
          kilometraje: 15000,
          proveedor: 'AutoService'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.tipo).toBe('Cambio de aceite');
      expect(res.body.data.proveedor).toBe('AutoService');
    });

    it('should fail for read-only user', async () => {
      const { user, token } = await createReadOnlyUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/maintenance')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipo: 'Cambio de aceite',
          descripcion: 'Test',
          costo: 450,
          kilometraje: 15000
        });

      expect(res.status).toBe(403);
    });

    it('should fail with invalid tipo', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/maintenance')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipo: 'TipoInvalido',
          descripcion: 'Test',
          costo: 450,
          kilometraje: 15000
        });

      expect(res.status).toBe(400);
    });

    it('should create with scheduled next service', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 3);

      const res = await request(app)
        .post('/api/maintenance')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          tipo: 'Cambio de aceite',
          descripcion: 'Test',
          costo: 450,
          kilometraje: 15000,
          proximoServicioFecha: futureDate,
          proximoServicioKm: 20000
        });

      expect(res.status).toBe(201);
      expect(res.body.data.proximoServicioKm).toBe(20000);
    });
  });

  describe('PUT /api/maintenance/:id', () => {
    it('should update maintenance record', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const maintenance = await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Test',
        costo: 450,
        kilometraje: 15000,
        owner: user._id
      });

      const res = await request(app)
        .put(`/api/maintenance/${maintenance._id}`)
        .set(authHeader(token))
        .send({
          costo: 500,
          notas: 'Actualizado'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.costo).toBe(500);
      expect(res.body.data.notas).toBe('Actualizado');
    });

    it('should allow changing vehicle', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      const maintenance = await Maintenance.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Test',
        costo: 450,
        kilometraje: 15000,
        owner: user._id
      });

      const res = await request(app)
        .put(`/api/maintenance/${maintenance._id}`)
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR2'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicleAlias).toBe('CAR2');
    });
  });

  describe('DELETE /api/maintenance/:id', () => {
    it('should permanently delete maintenance record', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const maintenance = await Maintenance.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        tipo: 'Cambio de aceite',
        descripcion: 'Test',
        costo: 450,
        kilometraje: 15000,
        owner: user._id
      });

      const res = await request(app)
        .delete(`/api/maintenance/${maintenance._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);

      // Verify maintenance is deleted
      const deletedMaintenance = await Maintenance.findById(maintenance._id);
      expect(deletedMaintenance).toBeNull();
    });
  });
});
