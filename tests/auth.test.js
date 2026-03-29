// Mock must be hoisted before any require that triggers route loading
jest.mock('../utils/emailService', () => ({
  sendDeleteConfirmationEmail: jest.fn().mockResolvedValue({})
}));

const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { sendDeleteConfirmationEmail } = require('../utils/emailService');
const { createTestUser, createAdminUser, createReadOnlyUser, createRootUser, createTestVehicle, authHeader } = require('./helpers');

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.username).toBe('newuser');
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user.role).toBe('read');
      expect(res.body.data.token).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'newuser@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await User.create({
        username: 'logintest',
        email: 'login@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('login@example.com');
    });

    it('should fail with wrong password', async () => {
      await User.create({
        username: 'logintest',
        email: 'login@example.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail for inactive user', async () => {
      await User.create({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'password123',
        isActive: false
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Usuario inactivo');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const { token } = await createTestUser();

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBeDefined();
    });

    it('should fail without token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader('invalid-token'));

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/updatepassword', () => {
    it('should update password with correct current password', async () => {
      const { token } = await createTestUser({ password: 'oldpassword123' });

      const res = await request(app)
        .put('/api/auth/updatepassword')
        .set(authHeader(token))
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail with incorrect current password', async () => {
      const { token } = await createTestUser({ password: 'oldpassword123' });

      const res = await request(app)
        .put('/api/auth/updatepassword')
        .set(authHeader(token))
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Contraseña actual incorrecta');
    });
  });

  describe('Admin User Management', () => {
    describe('GET /api/auth/users', () => {
      it('should list all users for admin', async () => {
        const { token } = await createAdminUser();
        await createTestUser();
        await createTestUser();

        const res = await request(app)
          .get('/api/auth/users')
          .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.count).toBe(3); // admin + 2 test users
      });

      it('should filter by isActive', async () => {
        const { token } = await createAdminUser();
        await User.create({
          username: 'inactive',
          email: 'inactive@test.com',
          password: 'password123',
          isActive: false
        });

        const res = await request(app)
          .get('/api/auth/users?isActive=false')
          .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
      });

      it('should deny access to non-admin users', async () => {
        const { token } = await createTestUser();

        const res = await request(app)
          .get('/api/auth/users')
          .set(authHeader(token));

        expect(res.status).toBe(403);
      });
    });

    describe('PUT /api/auth/users/:id/role', () => {
      it('should update user role', async () => {
        const { token } = await createAdminUser();
        const { user: targetUser } = await createReadOnlyUser();

        const res = await request(app)
          .put(`/api/auth/users/${targetUser._id}/role`)
          .set(authHeader(token))
          .send({ role: 'write' });

        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe('write');
      });

      it('should fail with invalid role', async () => {
        const { token } = await createAdminUser();
        const { user: targetUser } = await createTestUser();

        const res = await request(app)
          .put(`/api/auth/users/${targetUser._id}/role`)
          .set(authHeader(token))
          .send({ role: 'invalid' });

        expect(res.status).toBe(400);
      });
    });

    describe('DELETE /api/auth/users/:id', () => {
      it('should deactivate user', async () => {
        const { token } = await createAdminUser();
        const { user: targetUser } = await createTestUser();

        const res = await request(app)
          .delete(`/api/auth/users/${targetUser._id}`)
          .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.isActive).toBe(false);
      });

      it('should prevent admin from deactivating self', async () => {
        const { user: admin, token } = await createAdminUser();

        const res = await request(app)
          .delete(`/api/auth/users/${admin._id}`)
          .set(authHeader(token));

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('No puedes desactivar tu propia cuenta');
      });
    });

    describe('PATCH /api/auth/users/:id/reactivate', () => {
      it('should reactivate user', async () => {
        const { token } = await createAdminUser();
        const user = await User.create({
          username: 'inactive',
          email: 'inactive@test.com',
          password: 'password123',
          isActive: false
        });

        const res = await request(app)
          .patch(`/api/auth/users/${user._id}/reactivate`)
          .set(authHeader(token));

        expect(res.status).toBe(200);
        expect(res.body.data.isActive).toBe(true);
      });
    });
  });

  describe('Root tiene acceso a endpoints de admin', () => {
    it('root puede listar todos los usuarios', async () => {
      const { token } = await createRootUser();
      await createTestUser();

      const res = await request(app)
        .get('/api/auth/users')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(2);
    });

    it('root puede ver un usuario específico', async () => {
      const { token } = await createRootUser();
      const { user: targetUser } = await createTestUser();

      const res = await request(app)
        .get(`/api/auth/users/${targetUser._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id.toString()).toBe(targetUser._id.toString());
    });

    it('root puede reactivar usuarios', async () => {
      const { token } = await createRootUser();
      const inactiveUser = await User.create({
        username: 'inactivereact',
        email: 'inactivereact@test.com',
        password: 'password123',
        isActive: false
      });

      const res = await request(app)
        .patch(`/api/auth/users/${inactiveUser._id}/reactivate`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('DELETE /api/auth/users/:id - protecciones de jerarquía', () => {
    it('admin no puede desactivar a un usuario root', async () => {
      const { token } = await createAdminUser();
      const { user: rootUser } = await createRootUser();

      const res = await request(app)
        .delete(`/api/auth/users/${rootUser._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No tienes permisos para desactivar este usuario');
    });

    it('admin no puede desactivar a otro admin', async () => {
      const { token } = await createAdminUser();
      const { user: otherAdmin } = await createAdminUser();

      const res = await request(app)
        .delete(`/api/auth/users/${otherAdmin._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No tienes permisos para desactivar este usuario');
    });

    it('root puede desactivar a un admin', async () => {
      const { token } = await createRootUser();
      const { user: adminUser } = await createAdminUser();

      const res = await request(app)
        .delete(`/api/auth/users/${adminUser._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('root puede desactivar a un usuario read', async () => {
      const { token } = await createRootUser();
      const { user: readUser } = await createReadOnlyUser();

      const res = await request(app)
        .delete(`/api/auth/users/${readUser._id}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  describe('PUT /api/auth/users/:id/role - protecciones de jerarquía', () => {
    it('admin no puede cambiar rol de un root', async () => {
      const { token } = await createAdminUser();
      const { user: rootUser } = await createRootUser();

      const res = await request(app)
        .put(`/api/auth/users/${rootUser._id}/role`)
        .set(authHeader(token))
        .send({ role: 'read' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No tienes permisos para modificar el rol de este usuario');
    });

    it('admin no puede cambiar rol de otro admin', async () => {
      const { token } = await createAdminUser();
      const { user: otherAdmin } = await createAdminUser();

      const res = await request(app)
        .put(`/api/auth/users/${otherAdmin._id}/role`)
        .set(authHeader(token))
        .send({ role: 'read' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No tienes permisos para modificar el rol de este usuario');
    });

    it('root puede cambiar rol de un admin', async () => {
      const { token } = await createRootUser();
      const { user: adminUser } = await createAdminUser();

      const res = await request(app)
        .put(`/api/auth/users/${adminUser._id}/role`)
        .set(authHeader(token))
        .send({ role: 'write' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('write');
    });

    it('no se puede asignar rol root via este endpoint', async () => {
      const { token } = await createRootUser();
      const { user: targetUser } = await createTestUser();

      const res = await request(app)
        .put(`/api/auth/users/${targetUser._id}/role`)
        .set(authHeader(token))
        .send({ role: 'root' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Hard delete con verificación (solo root)', () => {
    beforeEach(() => {
      sendDeleteConfirmationEmail.mockClear();
      sendDeleteConfirmationEmail.mockResolvedValue({});
    });

    it('root no puede solicitar eliminación de su propia cuenta', async () => {
      const { user: root, token } = await createRootUser();

      const res = await request(app)
        .post(`/api/auth/users/${root._id}/permanent/request`)
        .set(authHeader(token));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No puedes eliminar tu propia cuenta');
    });

    it('solicitar código para usuario inexistente retorna 404', async () => {
      const { token } = await createRootUser();
      const fakeId = '000000000000000000000001';

      const res = await request(app)
        .post(`/api/auth/users/${fakeId}/permanent/request`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Usuario no encontrado');
    });

    it('admin no puede solicitar código de eliminación', async () => {
      const { token } = await createAdminUser();
      const { user: targetUser } = await createTestUser();

      const res = await request(app)
        .post(`/api/auth/users/${targetUser._id}/permanent/request`)
        .set(authHeader(token));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('DELETE sin haber solicitado código retorna 400', async () => {
      const { token } = await createRootUser();
      const { user: targetUser } = await createTestUser();

      const res = await request(app)
        .delete(`/api/auth/users/${targetUser._id}/permanent`)
        .set(authHeader(token))
        .send({ code: '123456', confirmWord: 'ELIMINAR' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('No hay una solicitud de eliminación activa. Inicia el proceso nuevamente.');
    });

    it('DELETE con palabra de confirmación incorrecta retorna 400', async () => {
      const { token } = await createRootUser();
      const { user: targetUser } = await createTestUser();

      // Solicitar código primero
      await request(app)
        .post(`/api/auth/users/${targetUser._id}/permanent/request`)
        .set(authHeader(token));

      const res = await request(app)
        .delete(`/api/auth/users/${targetUser._id}/permanent`)
        .set(authHeader(token))
        .send({ code: '123456', confirmWord: 'BORRAR' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Palabra de confirmación incorrecta. Escribe ELIMINAR');
    });

    it('DELETE con código incorrecto retorna 400', async () => {
      const { token } = await createRootUser();
      const { user: targetUser } = await createTestUser();

      // Solicitar código para poblar el Map
      await request(app)
        .post(`/api/auth/users/${targetUser._id}/permanent/request`)
        .set(authHeader(token));

      const res = await request(app)
        .delete(`/api/auth/users/${targetUser._id}/permanent`)
        .set(authHeader(token))
        .send({ code: '000000', confirmWord: 'ELIMINAR' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Código incorrecto.');
    });

    it('root puede eliminar permanentemente un usuario con cascade delete', async () => {
      const { user: root, token } = await createRootUser();
      const { user: targetUser } = await createTestUser();

      // Crear un vehículo para el usuario objetivo para probar el cascade
      await createTestVehicle(targetUser._id);

      // Capturar el código generado a través del mock
      let capturedCode;
      sendDeleteConfirmationEmail.mockImplementation(async (_email, _name, _target, code) => {
        capturedCode = code;
      });

      // Solicitar código
      const requestRes = await request(app)
        .post(`/api/auth/users/${targetUser._id}/permanent/request`)
        .set(authHeader(token));

      expect(requestRes.status).toBe(200);
      expect(requestRes.body.success).toBe(true);
      expect(sendDeleteConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(capturedCode).toBeDefined();

      // Confirmar eliminación
      const deleteRes = await request(app)
        .delete(`/api/auth/users/${targetUser._id}/permanent`)
        .set(authHeader(token))
        .send({ code: capturedCode, confirmWord: 'ELIMINAR' });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(deleteRes.body.message).toContain('eliminado permanentemente');

      // Verificar que el usuario ya no existe en la BD
      const deletedUser = await User.findById(targetUser._id);
      expect(deletedUser).toBeNull();

      // Verificar que sus vehículos tampoco existen
      const vehicles = await Vehicle.find({ owner: targetUser._id });
      expect(vehicles).toHaveLength(0);
    });
  });
});
