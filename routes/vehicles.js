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

// Obtener eficiencia de combustible
router.get('/:alias/fuel-efficiency', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

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

    let refuelQuery = { vehicle: vehicle._id };
    let routeQuery = { vehicle: vehicle._id };

    if (startDate || endDate) {
      const dateFilter = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      refuelQuery.fecha = dateFilter;
      routeQuery.fecha = dateFilter;
    }

    const refuels = await Refuel.find(refuelQuery).sort({ fecha: 1 });
    const routes = await Route.find(routeQuery).sort({ fecha: 1 });

    const totalGalones = refuels.reduce((sum, refuel) => sum + (refuel.galones || 0), 0);
    const totalDistancia = routes.reduce((sum, route) => sum + route.distanciaRecorrida, 0);
    const totalGastoCombustible = refuels.reduce((sum, refuel) => sum + refuel.cantidadGastada, 0);

    const kmPorLitro = totalGalones > 0 ? (totalDistancia / (totalGalones * 3.78541)).toFixed(2) : 0;
    const kmPorGalon = totalGalones > 0 ? (totalDistancia / totalGalones).toFixed(2) : 0;
    const costoPorKm = totalDistancia > 0 ? (totalGastoCombustible / totalDistancia).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        vehicle: {
          alias: vehicle.alias,
          marca: vehicle.marca,
          modelo: vehicle.modelo
        },
        efficiency: {
          kmPorLitro: parseFloat(kmPorLitro),
          kmPorGalon: parseFloat(kmPorGalon),
          costoPorKm: parseFloat(costoPorKm),
          totalDistancia,
          totalGalones,
          totalGastoCombustible
        },
        period: {
          startDate: startDate || 'Inicio',
          endDate: endDate || 'Presente',
          totalRefuels: refuels.length,
          totalRoutes: routes.length
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

// Obtener estadísticas completas del vehículo
router.get('/:alias/stats', protect, async (req, res) => {
  try {
    const Maintenance = require('../models/Maintenance');
    const Expense = require('../models/Expense');

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

    const routes = await Route.find({ vehicle: vehicle._id, isActive: true });
    const refuels = await Refuel.find({ vehicle: vehicle._id, isActive: true });
    const maintenances = await Maintenance.find({ vehicle: vehicle._id, isActive: true });
    const expenses = await Expense.find({ vehicle: vehicle._id, isActive: true });

    const totalRoutes = routes.length;
    const totalRefuels = refuels.length;
    const totalDistancia = routes.reduce((sum, route) => sum + route.distanciaRecorrida, 0);
    const totalGastoCombustible = refuels.reduce((sum, refuel) => sum + refuel.cantidadGastada, 0);
    const totalGastoMantenimiento = maintenances.reduce((sum, m) => sum + m.costo, 0);
    const totalGastosOtros = expenses.reduce((sum, e) => sum + e.monto, 0);
    const totalGalones = refuels.reduce((sum, refuel) => sum + (refuel.galones || 0), 0);

    // Cálculos de eficiencia
    const kmPorLitro = totalGalones > 0 ? (totalDistancia / (totalGalones * 3.78541)).toFixed(2) : 0;
    const kmPorGalon = totalGalones > 0 ? (totalDistancia / totalGalones).toFixed(2) : 0;

    // Costo total de operación
    const costoTotal = totalGastoCombustible + totalGastoMantenimiento + totalGastosOtros;
    const costoPorKm = totalDistancia > 0 ? (costoTotal / totalDistancia).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        vehicle: {
          alias: vehicle.alias,
          marca: vehicle.marca,
          modelo: vehicle.modelo,
          plates: vehicle.plates,
          kilometrajeInicial: vehicle.kilometrajeInicial,
          kilometrajeTotal: vehicle.kilometrajeTotal,
          isActive: vehicle.isActive
        },
        statistics: {
          totalRoutes,
          totalRefuels,
          totalMaintenances: maintenances.length,
          totalExpenses: expenses.length,
          totalDistancia: parseFloat(totalDistancia.toFixed(2))
        },
        costs: {
          combustible: parseFloat(totalGastoCombustible.toFixed(2)),
          mantenimiento: parseFloat(totalGastoMantenimiento.toFixed(2)),
          gastosOtros: parseFloat(totalGastosOtros.toFixed(2)),
          total: parseFloat(costoTotal.toFixed(2)),
          costoPorKm: parseFloat(costoPorKm)
        },
        efficiency: {
          kmPorLitro: parseFloat(kmPorLitro),
          kmPorGalon: parseFloat(kmPorGalon),
          promedioDistanciaPorRuta: totalRoutes > 0 ? parseFloat((totalDistancia / totalRoutes).toFixed(2)) : 0
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