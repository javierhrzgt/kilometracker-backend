const request = require('supertest');
const app = require('./app');
const User = require('../models/User');
const { createTestUser, createAdminUser, createReadOnlyUser, authHeader } = require('./helpers');

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
});
