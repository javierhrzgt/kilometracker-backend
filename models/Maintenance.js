const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  vehicleAlias: {
    type: String,
    required: [true, 'El alias del vehículo es requerido'],
    uppercase: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  tipo: {
    type: String,
    required: [true, 'El tipo de mantenimiento es requerido'],
    enum: [
      'Cambio de aceite',
      'Rotación de llantas',
      'Frenos',
      'Inspección',
      'Reparación',
      'Batería',
      'Filtros',
      'Transmisión',
      'Suspensión',
      'Alineación',
      'Otro'
    ]
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true
  },
  costo: {
    type: Number,
    required: [true, 'El costo es requerido'],
    min: [0, 'El costo debe ser mayor o igual a 0']
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now
  },
  kilometraje: {
    type: Number,
    required: [true, 'El kilometraje es requerido'],
    min: [0, 'El kilometraje debe ser mayor o igual a 0']
  },
  proveedor: {
    type: String,
    trim: true,
    default: ''
  },
  proximoServicioFecha: {
    type: Date,
    default: null
  },
  proximoServicioKm: {
    type: Number,
    min: 0,
    default: null
  },
  notas: {
    type: String,
    trim: true,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
maintenanceSchema.index({ vehicle: 1, fecha: -1 });
maintenanceSchema.index({ vehicle: 1, tipo: 1 });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
