const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  createRouteValidation,
  updateRouteValidation,
  mongoIdValidation,
  dateRangeQueryValidation,
} = require('../middleware/validate');
const { paginate, getPaginationData } = require('../utils/pagination');

// Obtener todas las rutas
router.get('/', protect, apiLimiter, dateRangeQueryValidation, async (req, res) => {
  try {
    const { vehicleAlias, startDate, endDate, page, limit } = req.query;
    let query = { owner: req.user.id };

    if (vehicleAlias) {
      query.vehicleAlias = vehicleAlias.toUpperCase();
    }

    if (startDate || endDate) {
      query.fecha = {};
      if (startDate) query.fecha.$gte = new Date(startDate);
      if (endDate) query.fecha.$lte = new Date(endDate);
    }

    // Get total count for pagination
    const total = await Route.countDocuments(query);

    // Apply pagination
    const { query: paginatedQuery, page: currentPage, limit: currentLimit } = paginate(
      Route.find(query)
        .populate('vehicle', 'alias marca modelo')
        .sort({ fecha: -1 }),
      page,
      limit
    );

    const routes = await paginatedQuery.lean();

    res.json({
      success: true,
      count: routes.length,
      data: routes,
      pagination: getPaginationData(total, currentPage, currentLimit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener una ruta por ID
router.get('/:id', protect, apiLimiter, mongoIdValidation, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('vehicle', 'alias marca modelo');
    
    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear ruta
router.post('/', protect, authorize('write', 'admin', 'root'), apiLimiter, createRouteValidation, async (req, res) => {
  try {
    const { vehicleAlias, distanciaRecorrida, fecha, notasAdicionales } = req.body;
    
    const vehicle = await Vehicle.findOne({
      alias: vehicleAlias.toUpperCase(),
      owner: req.user.id,
      isActive: true
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    const route = await Route.create({
      vehicleAlias: vehicleAlias.toUpperCase(),
      vehicle: vehicle._id,
      distanciaRecorrida,
      fecha: fecha || Date.now(),
      notasAdicionales: notasAdicionales || '',
      owner: req.user.id
    });
    
    // Actualizar kilometraje del vehículo (atomic increment)
    await Vehicle.findByIdAndUpdate(vehicle._id, { $inc: { kilometrajeTotal: distanciaRecorrida } });

    res.status(201).json({
      success: true,
      data: route,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar ruta
router.put('/:id', protect, authorize('write', 'admin', 'root'), apiLimiter, mongoIdValidation, updateRouteValidation, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      owner: req.user.id
    });
    
    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
      });
    }
    
    const oldVehicle = await Vehicle.findById(route.vehicle);
    const oldDistance = route.distanciaRecorrida;
    
    // Si cambió el vehículo
    if (req.body.vehicleAlias && req.body.vehicleAlias.toUpperCase() !== route.vehicleAlias) {
      const newVehicle = await Vehicle.findOne({
        alias: req.body.vehicleAlias.toUpperCase(),
        owner: req.user.id,
        isActive: true
      });
      
      if (!newVehicle) {
        return res.status(404).json({
          success: false,
          error: 'Nuevo vehículo no encontrado'
        });
      }
      
      // Restar del vehículo anterior y sumar al nuevo (atomic)
      const newDistance = req.body.distanciaRecorrida || oldDistance;
      await Vehicle.findByIdAndUpdate(oldVehicle._id, { $inc: { kilometrajeTotal: -oldDistance } });
      await Vehicle.findByIdAndUpdate(newVehicle._id, { $inc: { kilometrajeTotal: newDistance } });
      
      route.vehicle = newVehicle._id;
      route.vehicleAlias = newVehicle.alias;
    } else if (req.body.distanciaRecorrida && req.body.distanciaRecorrida !== oldDistance) {
      // Si solo cambió la distancia (atomic)
      const difference = req.body.distanciaRecorrida - oldDistance;
      await Vehicle.findByIdAndUpdate(oldVehicle._id, { $inc: { kilometrajeTotal: difference } });
    }
    
    // Actualizar otros campos
    if (req.body.fecha) route.fecha = req.body.fecha;
    if (req.body.distanciaRecorrida) route.distanciaRecorrida = req.body.distanciaRecorrida;
    if (req.body.notasAdicionales !== undefined) route.notasAdicionales = req.body.notasAdicionales;
    
    await route.save();
    
    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Eliminar ruta (permanent delete)
router.delete('/:id', protect, authorize('write', 'admin', 'root'), apiLimiter, mongoIdValidation, async (req, res) => {
  try {
    const route = await Route.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
      });
    }

    const vehicle = await Vehicle.findById(route.vehicle);

    if (vehicle) {
      // Restar la distancia del kilometraje total (atomic)
      await Vehicle.findByIdAndUpdate(vehicle._id, { $inc: { kilometrajeTotal: -route.distanciaRecorrida } });
    }

    await Route.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Ruta eliminada correctamente',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;