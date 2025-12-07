const request = require('supertest');
const app = require('./app');
const Expense = require('../models/Expense');
const { createTestUser, createReadOnlyUser, createTestVehicle, authHeader } = require('./helpers');

describe('Expenses Endpoints', () => {
  describe('GET /api/expenses', () => {
    it('should return empty array when no expenses', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/expenses')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return user expenses', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Seguro anual',
        fecha: new Date(),
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('should filter by vehicleAlias', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      await Expense.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        owner: user._id
      });
      await Expense.create({
        vehicleAlias: vehicle2.alias,
        vehicle: vehicle2._id,
        categoria: 'Impuestos',
        monto: 2000,
        descripcion: 'Test',
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses?vehicleAlias=CAR1')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].categoria).toBe('Seguro');
    });

    it('should filter by categoria', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        owner: user._id
      });
      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Impuestos',
        monto: 2000,
        descripcion: 'Test',
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses?categoria=Impuestos')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
    });

    it('should filter by esDeducibleImpuestos', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        esDeducibleImpuestos: true,
        owner: user._id
      });
      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Lavado',
        monto: 100,
        descripcion: 'Test',
        esDeducibleImpuestos: false,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses?esDeducibleImpuestos=true')
        .set(authHeader(token));

      expect(res.body.count).toBe(1);
      expect(res.body.data[0].categoria).toBe('Seguro');
    });
  });

  describe('GET /api/expenses/summary', () => {
    it('should return expense summary by category', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        owner: user._id
      });
      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 3000,
        descripcion: 'Test 2',
        owner: user._id
      });
      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Impuestos',
        monto: 2000,
        descripcion: 'Test',
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses/summary')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.totalGastos).toBe(10000);
      expect(res.body.data.categorias).toBe(2);
      expect(res.body.data.summary).toHaveLength(2);
    });
  });

  describe('GET /api/expenses/upcoming', () => {
    it('should return upcoming recurring expenses', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 500,
        descripcion: 'Mensual',
        esRecurrente: true,
        frecuenciaRecurrencia: 'Mensual',
        proximoPago: futureDate,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses/upcoming')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
    });

    it('should not return non-recurring expenses', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Pago único',
        esRecurrente: false,
        owner: user._id
      });

      const res = await request(app)
        .get('/api/expenses/upcoming')
        .set(authHeader(token));

      expect(res.body.count).toBe(0);
    });
  });

  describe('GET /api/expenses/:id', () => {
    it('should return expense by ID', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const expense = await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Estacionamiento',
        monto: 200,
        descripcion: 'Estacionamiento mensual',
        owner: user._id
      });

      const res = await request(app)
        .get(`/api/expenses/${expense._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.categoria).toBe('Estacionamiento');
    });

    it('should return 404 for non-existent expense', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/expenses/507f1f77bcf86cd799439011')
        .set(authHeader(token));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/expenses', () => {
    it('should create a new expense', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/expenses')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          categoria: 'Seguro',
          monto: 5000,
          descripcion: 'Seguro anual completo'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.categoria).toBe('Seguro');
      expect(res.body.data.monto).toBe(5000);
    });

    it('should fail for read-only user', async () => {
      const { user, token } = await createReadOnlyUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/expenses')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          categoria: 'Seguro',
          monto: 5000,
          descripcion: 'Test'
        });

      expect(res.status).toBe(403);
    });

    it('should fail with invalid categoria', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/expenses')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          categoria: 'CategoriaInvalida',
          monto: 5000,
          descripcion: 'Test'
        });

      expect(res.status).toBe(400);
    });

    it('should create recurring expense', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const res = await request(app)
        .post('/api/expenses')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          categoria: 'Estacionamiento',
          monto: 200,
          descripcion: 'Estacionamiento mensual',
          esRecurrente: true,
          frecuenciaRecurrencia: 'Mensual',
          proximoPago: futureDate
        });

      expect(res.status).toBe(201);
      expect(res.body.data.esRecurrente).toBe(true);
      expect(res.body.data.frecuenciaRecurrencia).toBe('Mensual');
    });

    it('should create tax-deductible expense', async () => {
      const { user, token } = await createTestUser();
      await createTestVehicle(user._id, { alias: 'CAR1' });

      const res = await request(app)
        .post('/api/expenses')
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR1',
          categoria: 'Seguro',
          monto: 5000,
          descripcion: 'Seguro comercial',
          esDeducibleImpuestos: true
        });

      expect(res.status).toBe(201);
      expect(res.body.data.esDeducibleImpuestos).toBe(true);
    });
  });

  describe('PUT /api/expenses/:id', () => {
    it('should update expense', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const expense = await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        owner: user._id
      });

      const res = await request(app)
        .put(`/api/expenses/${expense._id}`)
        .set(authHeader(token))
        .send({
          monto: 5500,
          notas: 'Precio actualizado'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.monto).toBe(5500);
      expect(res.body.data.notas).toBe('Precio actualizado');
    });

    it('should allow changing vehicle', async () => {
      const { user, token } = await createTestUser();
      const vehicle1 = await createTestVehicle(user._id, { alias: 'CAR1' });
      const vehicle2 = await createTestVehicle(user._id, { alias: 'CAR2' });

      const expense = await Expense.create({
        vehicleAlias: vehicle1.alias,
        vehicle: vehicle1._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        owner: user._id
      });

      const res = await request(app)
        .put(`/api/expenses/${expense._id}`)
        .set(authHeader(token))
        .send({
          vehicleAlias: 'CAR2'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.vehicleAlias).toBe('CAR2');
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    it('should permanently delete expense', async () => {
      const { user, token } = await createTestUser();
      const vehicle = await createTestVehicle(user._id, { alias: 'CAR1' });

      const expense = await Expense.create({
        vehicleAlias: vehicle.alias,
        vehicle: vehicle._id,
        categoria: 'Seguro',
        monto: 5000,
        descripcion: 'Test',
        owner: user._id
      });

      const res = await request(app)
        .delete(`/api/expenses/${expense._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);

      // Verify expense is deleted
      const deletedExpense = await Expense.findById(expense._id);
      expect(deletedExpense).toBeNull();
    });
  });
});
