const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
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
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now
  },
  distanciaRecorrida: {
    type: Number,
    required: [true, 'La distancia recorrida es requerida'],
    min: [0.1, 'La distancia debe ser mayor a 0']
  },
  notasAdicionales: {
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
routeSchema.index({ vehicle: 1, fecha: -1 });

module.exports = mongoose.model('Route', routeSchema);