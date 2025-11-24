const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Refuel = require('../models/Refuel');
const { protect, authorize } = require('../middleware/auth');

// Obtener todos los vehículos
router.get('/', protect, async (req, res) => {
  try {
    // Por defecto devuelve TODOS (activos e inactivos)
    // ?isActive=true -> solo activos
    // ?isActive=false -> solo inactivos
    
    const { isActive } = req.query;
    let query = { owner: req.user.id };
    
    // Solo filtrar si se especifica explícitamente el parámetro isActive
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    // Si no hay parámetro, devuelve todos (activos + inactivos)
    
    const vehicles = await Vehicle.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener un vehículo por alias (sin filtro de activo, para poder ver detalles)
router.get('/:alias', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      alias: req.params.alias.toUpperCase(),
      owner: req.user.id
      // Removido isActive: true para poder ver vehículos inactivos
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear vehículo
router.post('/', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const vehicleData = {
      ...req.body,
      owner: req.user.id,
      alias: req.body.alias.toUpperCase()
    };
    
    const vehicle = await Vehicle.create(vehicleData);
    
    res.status(201).json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar vehículo
router.put('/:alias', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      alias: req.params.alias.toUpperCase(),
      owner: req.user.id
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    // No permitir cambiar kilometrajeTotal directamente
    delete req.body.kilometrajeTotal;
    delete req.body.owner;
    
    Object.assign(vehicle, req.body);
    await vehicle.save();
    
    res.json({
      success: true,
      data: vehicle
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Eliminar vehículo (soft delete)
router.delete('/:alias', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      alias: req.params.alias.toUpperCase(),
      owner: req.user.id
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    vehicle.isActive = false;
    await vehicle.save();
    
    res.json({
      success: true,
      message: 'Vehículo desactivado correctamente',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reactivar vehículo
router.patch('/:alias/reactivate', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      alias: req.params.alias.toUpperCase(),
      owner: req.user.id
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    vehicle.isActive = true;
    await vehicle.save();
    
    res.json({
      success: true,
      message: 'Vehículo reactivado correctamente',
      data: vehicle
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener estadísticas del vehículo
router.get('/:alias/stats', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      alias: req.params.alias.toUpperCase(),
      owner: req.user.id
      // Permitir stats de vehículos inactivos también
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    const routes = await Route.find({ vehicle: vehicle._id });
    const refuels = await Refuel.find({ vehicle: vehicle._id });
    
    const totalRoutes = routes.length;
    const totalRefuels = refuels.length;
    const totalDistancia = routes.reduce((sum, route) => sum + route.distanciaRecorrida, 0);
    const totalGastoCombustible = refuels.reduce((sum, refuel) => sum + refuel.cantidadGastada, 0);
    
    res.json({
      success: true,
      data: {
        vehicle: {
          alias: vehicle.alias,
          marca: vehicle.marca,
          modelo: vehicle.modelo,
          kilometrajeTotal: vehicle.kilometrajeTotal,
          isActive: vehicle.isActive
        },
        statistics: {
          totalRoutes,
          totalRefuels,
          totalDistancia,
          totalGastoCombustible,
          promedioDistanciaPorRuta: totalRoutes > 0 ? (totalDistancia / totalRoutes).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;