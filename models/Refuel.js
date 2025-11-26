const mongoose = require('mongoose');

const refuelSchema = new mongoose.Schema({
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
  tipoCombustible: {
    type: String,
    required: [true, 'El tipo de combustible es requerido'],
    enum: ['Regular', 'Premium', 'Diesel', 'Eléctrico', 'Híbrido','V-Power'],
    trim: true
  },
  cantidadGastada: {
    type: Number,
    required: [true, 'La cantidad gastada es requerida'],
    min: [0, 'La cantidad debe ser mayor a 0']
  },
  galones: {
    type: Number,
    min: [0, 'Los galones deben ser mayor a 0'],
    default: null
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calcular precio por galón virtual
refuelSchema.virtual('precioPorGalon').get(function() {
  return this.galones ? (this.cantidadGastada / this.galones).toFixed(2) : null;
});

refuelSchema.set('toJSON', { virtuals: true });
refuelSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Refuel', refuelSchema);
