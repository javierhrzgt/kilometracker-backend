const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');

// Obtener todas las rutas
router.get('/', protect, async (req, res) => {
  try {
    const { vehicleAlias, startDate, endDate } = req.query;
    let query = { owner: req.user.id };
    
    if (vehicleAlias) {
      query.vehicleAlias = vehicleAlias.toUpperCase();
    }
    
    if (startDate || endDate) {
      query.fecha = {};
      if (startDate) query.fecha.$gte = new Date(startDate);
      if (endDate) query.fecha.$lte = new Date(endDate);
    }
    
    const routes = await Route.find(query)
      .populate('vehicle', 'alias marca modelo')
      .sort({ fecha: -1 });
    
    res.json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener una ruta por ID
router.get('/:id', protect, async (req, res) => {
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
router.post('/', protect, authorize('write', 'admin'), async (req, res) => {
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
    
    // Actualizar kilometraje del vehículo
    vehicle.kilometrajeTotal += distanciaRecorrida;
    await vehicle.save();
    
    res.status(201).json({
      success: true,
      data: route,
      vehicleKilometraje: vehicle.kilometrajeTotal
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar ruta
router.put('/:id', protect, authorize('write', 'admin'), async (req, res) => {
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
      
      // Restar del vehículo anterior
      oldVehicle.kilometrajeTotal -= oldDistance;
      await oldVehicle.save();
      
      // Sumar al nuevo vehículo
      const newDistance = req.body.distanciaRecorrida || oldDistance;
      newVehicle.kilometrajeTotal += newDistance;
      await newVehicle.save();
      
      route.vehicle = newVehicle._id;
      route.vehicleAlias = newVehicle.alias;
    } else if (req.body.distanciaRecorrida && req.body.distanciaRecorrida !== oldDistance) {
      // Si solo cambió la distancia
      const difference = req.body.distanciaRecorrida - oldDistance;
      oldVehicle.kilometrajeTotal += difference;
      await oldVehicle.save();
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

// Eliminar ruta
router.delete('/:id', protect, authorize('write', 'admin'), async (req, res) => {
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
      // Restar la distancia del kilometraje total
      vehicle.kilometrajeTotal -= route.distanciaRecorrida;
      await vehicle.save();
    }
    
    await route.deleteOne();
    
    res.json({
      success: true,
      message: 'Ruta eliminada correctamente',
      vehicleKilometraje: vehicle ? vehicle.kilometrajeTotal : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;