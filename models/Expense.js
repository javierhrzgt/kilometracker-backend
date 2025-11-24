const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
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
  categoria: {
    type: String,
    required: [true, 'La categoría es requerida'],
    enum: [
      'Seguro',
      'Impuestos',
      'Registro',
      'Estacionamiento',
      'Peajes',
      'Lavado',
      'Multas',
      'Financiamiento',
      'Otro'
    ]
  },
  monto: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto debe ser mayor o igual a 0']
  },
  descripcion: {
    type: String,
    required: [true, 'La descripción es requerida'],
    trim: true
  },
  fecha: {
    type: Date,
    required: [true, 'La fecha es requerida'],
    default: Date.now
  },
  esRecurrente: {
    type: Boolean,
    default: false
  },
  frecuenciaRecurrencia: {
    type: String,
    enum: ['Mensual', 'Trimestral', 'Semestral', 'Anual', null],
    default: null
  },
  proximoPago: {
    type: Date,
    default: null
  },
  esDeducibleImpuestos: {
    type: Boolean,
    default: false
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
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas eficientes
expenseSchema.index({ vehicle: 1, fecha: -1 });
expenseSchema.index({ vehicle: 1, categoria: 1 });
expenseSchema.index({ owner: 1, esDeducibleImpuestos: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
