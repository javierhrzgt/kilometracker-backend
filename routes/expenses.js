const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Vehicle = require('../models/Vehicle');
const { protect, authorize } = require('../middleware/auth');

// Obtener todos los gastos
router.get('/', protect, async (req, res) => {
  try {
    const { vehicleAlias, categoria, startDate, endDate, esDeducibleImpuestos, isActive } = req.query;
    let query = { owner: req.user.id };

    if (vehicleAlias) {
      query.vehicleAlias = vehicleAlias.toUpperCase();
    }

    if (categoria) {
      query.categoria = categoria;
    }

    if (esDeducibleImpuestos !== undefined) {
      query.esDeducibleImpuestos = esDeducibleImpuestos === 'true';
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (startDate || endDate) {
      query.fecha = {};
      if (startDate) query.fecha.$gte = new Date(startDate);
      if (endDate) query.fecha.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('vehicle', 'alias marca modelo')
      .sort({ fecha: -1 });

    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener resumen de gastos por categoría
router.get('/summary', protect, async (req, res) => {
  try {
    const { vehicleAlias, startDate, endDate } = req.query;
    let matchQuery = { owner: req.user.id, isActive: true };

    if (vehicleAlias) {
      matchQuery.vehicleAlias = vehicleAlias.toUpperCase();
    }

    if (startDate || endDate) {
      matchQuery.fecha = {};
      if (startDate) matchQuery.fecha.$gte = new Date(startDate);
      if (endDate) matchQuery.fecha.$lte = new Date(endDate);
    }

    const summary = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$categoria',
          totalMonto: { $sum: '$monto' },
          cantidad: { $sum: 1 }
        }
      },
      { $sort: { totalMonto: -1 } }
    ]);

    const totalGastos = summary.reduce((sum, item) => sum + item.totalMonto, 0);

    res.json({
      success: true,
      data: {
        summary,
        totalGastos,
        categorias: summary.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener gastos recurrentes próximos
router.get('/upcoming', protect, async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const expenses = await Expense.find({
      owner: req.user.id,
      isActive: true,
      esRecurrente: true,
      proximoPago: {
        $gte: today,
        $lte: thirtyDaysFromNow
      }
    })
    .populate('vehicle', 'alias marca modelo')
    .sort({ proximoPago: 1 });

    res.json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener un gasto por ID
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('vehicle', 'alias marca modelo');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Gasto no encontrado'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Crear gasto
router.post('/', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const {
      vehicleAlias,
      categoria,
      monto,
      descripcion,
      fecha,
      esRecurrente,
      frecuenciaRecurrencia,
      proximoPago,
      esDeducibleImpuestos,
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

    const expense = await Expense.create({
      vehicleAlias: vehicleAlias.toUpperCase(),
      vehicle: vehicle._id,
      categoria,
      monto,
      descripcion,
      fecha: fecha || Date.now(),
      esRecurrente: esRecurrente || false,
      frecuenciaRecurrencia: frecuenciaRecurrencia || null,
      proximoPago: proximoPago || null,
      esDeducibleImpuestos: esDeducibleImpuestos || false,
      notas: notas || '',
      owner: req.user.id
    });

    res.status(201).json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar gasto
router.put('/:id', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Gasto no encontrado'
      });
    }

    // Si cambia el vehículo, verificar que existe
    if (req.body.vehicleAlias && req.body.vehicleAlias.toUpperCase() !== expense.vehicleAlias) {
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

      expense.vehicle = newVehicle._id;
      expense.vehicleAlias = newVehicle.alias;
    }

    // Actualizar otros campos
    const allowedFields = [
      'categoria',
      'monto',
      'descripcion',
      'fecha',
      'esRecurrente',
      'frecuenciaRecurrencia',
      'proximoPago',
      'esDeducibleImpuestos',
      'notas'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });

    await expense.save();

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Eliminar gasto (soft delete)
router.delete('/:id', protect, authorize('write', 'admin'), async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Gasto no encontrado'
      });
    }

    expense.isActive = false;
    await expense.save();

    res.json({
      success: true,
      message: 'Gasto eliminado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
