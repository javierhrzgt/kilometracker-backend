// ===== routes/refuels.js =====
const express = require('express');
const router = express.Router();
const Refuel = require('../models/Refuel');
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');
const {
  createRefuelValidation,
  updateRefuelValidation,
  mongoIdValidation,
  aliasParamValidation,
} = require('../middleware/validate');
const { paginate, getPaginationData } = require('../utils/pagination');

// Obtener todos los reabastecimientos
router.get('/', protect, async (req, res) => {
  try {
    const { vehicleAlias, page, limit } = req.query;
    let query = { owner: req.user.id };

    if (vehicleAlias) {
      query.vehicleAlias = vehicleAlias.toUpperCase();
    }

    // Get total count for pagination
    const total = await Refuel.countDocuments(query);

    // Apply pagination
    const { query: paginatedQuery, page: currentPage, limit: currentLimit } = paginate(
      Refuel.find(query)
        .populate('vehicle', 'alias marca modelo')
        .sort({ fecha: -1 }),
      page,
      limit
    );

    const refuels = await paginatedQuery.lean({ virtuals: true });

    res.json({
      success: true,
      count: refuels.length,
      data: refuels,
      pagination: getPaginationData(total, currentPage, currentLimit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener un reabastecimiento por ID
router.get('/:id', protect, mongoIdValidation, async (req, res) => {
  try {
    const refuel = await Refuel.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('vehicle', 'alias marca modelo');
    
    if (!refuel) {
      return res.status(404).json({
        success: false,
        error: 'Reabastecimiento no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: refuel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear reabastecimiento
router.post('/', protect, authorize('write', 'admin'), createRefuelValidation, async (req, res) => {
  try {
    const { vehicleAlias, tipoCombustible, cantidadGastada, galones, fecha } = req.body;
    
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
    
    const refuel = await Refuel.create({
      vehicleAlias: vehicleAlias.toUpperCase(),
      vehicle: vehicle._id,
      tipoCombustible,
      cantidadGastada,
      galones: galones || null,
      fecha: fecha || Date.now(),
      owner: req.user.id
    });
    
    res.status(201).json({
      success: true,
      data: refuel
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar reabastecimiento
router.put('/:id', protect, authorize('write', 'admin'), mongoIdValidation, updateRefuelValidation, async (req, res) => {
  try {
    const refuel = await Refuel.findOne({
      _id: req.params.id,
      owner: req.user.id
    });
    
    if (!refuel) {
      return res.status(404).json({
        success: false,
        error: 'Reabastecimiento no encontrado'
      });
    }
    
    // Si cambió el vehículo
    if (req.body.vehicleAlias && req.body.vehicleAlias.toUpperCase() !== refuel.vehicleAlias) {
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
      
      refuel.vehicle = newVehicle._id;
      refuel.vehicleAlias = newVehicle.alias;
    }
    
    // Actualizar otros campos
    if (req.body.tipoCombustible) refuel.tipoCombustible = req.body.tipoCombustible;
    if (req.body.cantidadGastada) refuel.cantidadGastada = req.body.cantidadGastada;
    if (req.body.galones !== undefined) refuel.galones = req.body.galones;
    if (req.body.fecha !== undefined) refuel.fecha = req.body.fecha;

    await refuel.save();
    
    res.json({
      success: true,
      data: refuel
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Eliminar reabastecimiento (permanent delete)
router.delete('/:id', protect, authorize('write', 'admin'), mongoIdValidation, async (req, res) => {
  try {
    const refuel = await Refuel.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!refuel) {
      return res.status(404).json({
        success: false,
        error: 'Reabastecimiento no encontrado'
      });
    }

    await Refuel.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Reabastecimiento eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener análisis de consumo de combustible
router.get('/vehicle/:alias/analysis', protect, aliasParamValidation, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      alias: req.params.alias.toUpperCase(),
      owner: req.user.id,
      isActive: true
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado'
      });
    }
    
    const refuels = await Refuel.find({ vehicle: vehicle._id });
    
    const totalGastado = refuels.reduce((sum, r) => sum + r.cantidadGastada, 0);
    const totalGalones = refuels.reduce((sum, r) => sum + (r.galones || 0), 0);
    const promedioGalonPrice = totalGalones > 0 ? totalGastado / totalGalones : 0;
    
    // Agrupar por tipo de combustible
    const porTipo = {};
    refuels.forEach(r => {
      if (!porTipo[r.tipoCombustible]) {
        porTipo[r.tipoCombustible] = {
          cantidad: 0,
          gasto: 0,
          galones: 0
        };
      }
      porTipo[r.tipoCombustible].cantidad++;
      porTipo[r.tipoCombustible].gasto += r.cantidadGastada;
      porTipo[r.tipoCombustible].galones += r.galones || 0;
    });
    
    res.json({
      success: true,
      data: {
        vehicle: {
          alias: vehicle.alias,
          marca: vehicle.marca,
          modelo: vehicle.modelo
        },
        summary: {
          totalReabastecimientos: refuels.length,
          totalGastado: totalGastado.toFixed(2),
          totalGalones: totalGalones.toFixed(2),
          promedioGalonPrice: promedioGalonPrice.toFixed(2)
        },
        porTipoCombustible: porTipo
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