const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

/**
 * Create a test user and return user object with token
 */
const createTestUser = async (overrides = {}) => {
  const userData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    role: 'write',
    ...overrides
  };

  const user = await User.create(userData);
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  return { user, token };
};

/**
 * Create an admin user
 */
const createAdminUser = async (overrides = {}) => {
  return createTestUser({ role: 'admin', ...overrides });
};

/**
 * Create a read-only user
 */
const createReadOnlyUser = async (overrides = {}) => {
  return createTestUser({ role: 'read', ...overrides });
};

/**
 * Create a test vehicle
 */
const createTestVehicle = async (ownerId, overrides = {}) => {
  const vehicleData = {
    alias: `TEST${Date.now()}`,
    marca: 'Toyota',
    modelo: 2020,
    plates: 'ABC123',
    kilometrajeInicial: 10000,
    owner: ownerId,
    ...overrides
  };

  return Vehicle.create(vehicleData);
};

/**
 * Generate auth header
 */
const authHeader = (token) => ({
  Authorization: `Bearer ${token}`
});

module.exports = {
  createTestUser,
  createAdminUser,
  createReadOnlyUser,
  createTestVehicle,
  authHeader
};
