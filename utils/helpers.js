const Vehicle = require("../models/Vehicle");
const { NotFoundError } = require("./errors");

/**
 * Find a vehicle by alias for the authenticated user
 * @param {string} alias - Vehicle alias
 * @param {string} userId - User ID
 * @param {boolean} requireActive - Whether to only find active vehicles (default: true)
 * @returns {Promise<Vehicle>} - Vehicle document
 * @throws {NotFoundError} - If vehicle not found
 */
async function findVehicleByAlias(alias, userId, requireActive = true) {
  const query = {
    alias: alias.toUpperCase(),
    owner: userId,
  };

  if (requireActive) {
    query.isActive = true;
  }

  const vehicle = await Vehicle.findOne(query);

  if (!vehicle) {
    throw new NotFoundError("Vehículo");
  }

  return vehicle;
}

/**
 * Build a date range query object for MongoDB
 * @param {string} startDate - Start date string
 * @param {string} endDate - End date string
 * @returns {Object|null} - Date range query object or null
 */
function buildDateRangeQuery(startDate, endDate) {
  if (!startDate && !endDate) {
    return null;
  }

  const dateQuery = {};
  if (startDate) dateQuery.$gte = new Date(startDate);
  if (endDate) dateQuery.$lte = new Date(endDate);

  return dateQuery;
}

/**
 * Update allowed fields on an entity
 * @param {Object} entity - Mongoose document
 * @param {Object} body - Request body
 * @param {Array<string>} allowedFields - List of allowed field names
 */
function updateAllowedFields(entity, body, allowedFields) {
  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      entity[field] = body[field];
    }
  });
}

/**
 * Sanitize user output (remove sensitive fields)
 * @param {Object} user - User document
 * @returns {Object} - Sanitized user object
 */
function sanitizeUser(user) {
  const { password, __v, ...sanitized } = user.toObject
    ? user.toObject()
    : user;
  return sanitized;
}

/**
 * Format success response
 * @param {Object} data - Response data
 * @param {number} count - Optional count for list responses
 * @returns {Object} - Formatted response
 */
function successResponse(data, count = null) {
  const response = {
    success: true,
    data,
  };
  if (count !== null) {
    response.count = count;
  }
  return response;
}

/**
 * Format error response
 * @param {string} message - Error message
 * @returns {Object} - Formatted error response
 */
function errorResponse(message) {
  return {
    success: false,
    error: message,
  };
}

module.exports = {
  findVehicleByAlias,
  buildDateRangeQuery,
  updateAllowedFields,
  sanitizeUser,
  successResponse,
  errorResponse,
};
