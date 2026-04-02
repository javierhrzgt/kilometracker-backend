const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Refuel = require('../models/Refuel');
const Maintenance = require('../models/Maintenance');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

// GET /api/dashboard — Resumen global del usuario
router.get('/', protect, apiLimiter, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Obtener todos los vehículos activos del usuario
    const vehicles = await Vehicle.find({ owner: userId, isActive: true }).lean();
    const vehicleIds = vehicles.map((v) => v._id);
    const totalVehicles = vehicles.length;

    if (totalVehicles === 0) {
      return res.json({
        success: true,
        data: {
          summary: {
            totalVehicles: 0,
            totalKmAllVehicles: 0,
            totalSpentLast30Days: 0,
            kmThisMonth: 0,
          },
          vehicles: [],
          alerts: [],
        },
      });
    }

    // Km este mes (rutas del mes actual de todos los vehículos)
    const kmThisMonthAgg = await Route.aggregate([
      {
        $match: {
          vehicle: { $in: vehicleIds },
          fecha: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$distanciaRecorrida' },
        },
      },
    ]);
    const kmThisMonth = kmThisMonthAgg[0]?.total || 0;

    // Km totales de todos los vehículos activos
    const totalKmAllVehicles = vehicles.reduce(
      (sum, v) => sum + (v.kilometrajeTotal || 0),
      0
    );

    // Gasto total últimos 30 días (combustible + mantenimiento + gastos)
    const [fuelLast30, maintLast30, expLast30] = await Promise.all([
      Refuel.aggregate([
        {
          $match: {
            vehicle: { $in: vehicleIds },
            fecha: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$cantidadGastada' } } },
      ]),
      Maintenance.aggregate([
        {
          $match: {
            vehicle: { $in: vehicleIds },
            fecha: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$costo' } } },
      ]),
      Expense.aggregate([
        {
          $match: {
            vehicle: { $in: vehicleIds },
            fecha: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$monto' } } },
      ]),
    ]);
    const totalSpentLast30Days =
      (fuelLast30[0]?.total || 0) +
      (maintLast30[0]?.total || 0) +
      (expLast30[0]?.total || 0);

    // Datos por vehículo: gasto este mes + eficiencia
    const vehicleStats = await Promise.all(
      vehicles.map(async (vehicle) => {
        const [fuelMonth, refuelsAll, routesAll] = await Promise.all([
          Refuel.aggregate([
            {
              $match: {
                vehicle: vehicle._id,
                fecha: { $gte: startOfMonth },
              },
            },
            { $group: { _id: null, total: { $sum: '$cantidadGastada' }, galones: { $sum: '$galones' } } },
          ]),
          Refuel.find({ vehicle: vehicle._id }, 'galones').lean(),
          Route.find({ vehicle: vehicle._id }, 'distanciaRecorrida').lean(),
        ]);

        const totalGalones = refuelsAll.reduce((s, r) => s + (r.galones || 0), 0);
        const totalDistancia = routesAll.reduce((s, r) => s + (r.distanciaRecorrida || 0), 0);
        const kmPorLitro =
          totalGalones > 0
            ? parseFloat((totalDistancia / (totalGalones * 3.78541)).toFixed(2))
            : 0;

        return {
          alias: vehicle.alias,
          marca: vehicle.marca,
          modelo: vehicle.modelo,
          kilometrajeTotal: vehicle.kilometrajeTotal,
          spentThisMonth: parseFloat((fuelMonth[0]?.total || 0).toFixed(2)),
          efficiency: { kmPorLitro },
        };
      })
    );

    // Alertas: mantenimientos próximos (30 días o 500 km)
    const upcomingMaint = await Maintenance.find({
      vehicle: { $in: vehicleIds },
      $or: [
        {
          proximoServicioFecha: {
            $gte: now,
            $lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      ],
    })
      .sort({ proximoServicioFecha: 1 })
      .limit(5)
      .lean();

    const vehicleAliasMap = vehicles.reduce((map, v) => {
      map[v._id.toString()] = v.alias;
      return map;
    }, {});

    const alerts = upcomingMaint.map((m) => {
      const daysUntil = m.proximoServicioFecha
        ? Math.ceil(
            (new Date(m.proximoServicioFecha) - now) / (1000 * 60 * 60 * 24)
          )
        : null;
      const message =
        daysUntil !== null
          ? `${m.tipo} vence en ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`
          : `${m.tipo} próximo`;
      return {
        type: 'maintenance',
        vehicleAlias: vehicleAliasMap[m.vehicle.toString()] || '',
        message,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalVehicles,
          totalKmAllVehicles: parseFloat(totalKmAllVehicles.toFixed(2)),
          totalSpentLast30Days: parseFloat(totalSpentLast30Days.toFixed(2)),
          kmThisMonth: parseFloat(kmThisMonth.toFixed(2)),
        },
        vehicles: vehicleStats,
        alerts,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
