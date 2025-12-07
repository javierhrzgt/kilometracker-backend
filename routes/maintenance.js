const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');
const {
  createMaintenanceValidation,
  updateMaintenanceValidation,
  mongoIdValidation,
  dateRangeQueryValidation,
} = require('../middleware/validate');
const { paginate, getPaginationData } = require('../utils/pagination');

// Obtener todos los mantenimientos
router.get('/', protect, dateRangeQueryValidation, async (req, res) => {
  try {
    const { vehicleAlias, tipo, startDate, endDate, page, limit } = req.query;
    let query = { owner: req.user.id };

    if (vehicleAlias) {
      query.vehicleAlias = vehicleAlias.toUpperCase();
    }

    if (tipo) {
      query.tipo = tipo;
    }

    if (startDate || endDate) {
      query.fecha = {};
      if (startDate) query.fecha.$gte = new Date(startDate);
      if (endDate) query.fecha.$lte = new Date(endDate);
    }

    // Get total count for pagination
    const total = await Maintenance.countDocuments(query);

    // Apply pagination
    const { query: paginatedQuery, page: currentPage, limit: currentLimit } = paginate(
      Maintenance.find(query)
        .populate('vehicle', 'alias marca modelo')
        .sort({ fecha: -1 }),
      page,
      limit
    );

    const maintenances = await paginatedQuery.lean();

    res.json({
      success: true,
      count: maintenances.length,
      data: maintenances,
      pagination: getPaginationData(total, currentPage, currentLimit)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener mantenimientos próximos (que necesitan atención)
router.get('/upcoming', protect, async (req, res) => {
  try {
    // Get all maintenance with a scheduled next service (by date or km)
    const maintenances = await Maintenance.find({
      owner: req.user.id,
      $or: [
        { proximoServicioFecha: { $ne: null } },
        { proximoServicioKm: { $ne: null } }
      ]
    })
    .populate('vehicle', 'alias marca modelo kilometrajeTotal')
    .sort({ proximoServicioFecha: 1 })
    .lean();

    res.json({
      success: true,
      count: maintenances.length,
      data: maintenances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener un mantenimiento por ID
router.get('/:id', protect, mongoIdValidation, async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('vehicle', 'alias marca modelo');

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Mantenimiento no encontrado'
      });
    }

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear mantenimiento
router.post('/', protect, authorize('write', 'admin'), createMaintenanceValidation, async (req, res) => {
  try {
    const {
      vehicleAlias,
      tipo,
      descripcion,
      costo,
      fecha,
      kilometraje,
      proveedor,
      proximoServicioFecha,
      proximoServicioKm,
      notas
    } = req.body;

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

    const maintenance = await Maintenance.create({
      vehicleAlias: vehicleAlias.toUpperCase(),
      vehicle: vehicle._id,
      tipo,
      descripcion,
      costo,
      fecha: fecha || Date.now(),
      kilometraje,
      proveedor: proveedor || '',
      proximoServicioFecha: proximoServicioFecha || null,
      proximoServicioKm: proximoServicioKm || null,
      notas: notas || '',
      owner: req.user.id
    });

    res.status(201).json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar mantenimiento
router.put('/:id', protect, authorize('write', 'admin'), mongoIdValidation, updateMaintenanceValidation, async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Mantenimiento no encontrado'
      });
    }

    // Si cambia el vehículo, verificar que existe
    if (req.body.vehicleAlias && req.body.vehicleAlias.toUpperCase() !== maintenance.vehicleAlias) {
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

      maintenance.vehicle = newVehicle._id;
      maintenance.vehicleAlias = newVehicle.alias;
    }

    // Actualizar otros campos
    const allowedFields = [
      'tipo',
      'descripcion',
      'costo',
      'fecha',
      'kilometraje',
      'proveedor',
      'proximoServicioFecha',
      'proximoServicioKm',
      'notas'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        maintenance[field] = req.body[field];
      }
    });

    await maintenance.save();

    res.json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Eliminar mantenimiento (permanent delete)
router.delete('/:id', protect, authorize('write', 'admin'), mongoIdValidation, async (req, res) => {
  try {
    const maintenance = await Maintenance.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!maintenance) {
      return res.status(404).json({
        success: false,
        error: 'Mantenimiento no encontrado'
      });
    }

    await Maintenance.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'Mantenimiento eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
