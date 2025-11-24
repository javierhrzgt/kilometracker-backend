const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  alias: {
    type: String,
    required: [true, 'El alias es requerido'],
    unique: true,
    trim: true,
    uppercase: true
  },
  marca: {
    type: String,
    required: [true, 'La marca es requerida'],
    trim: true
  },
  modelo: {
    type: Number,
    required: [true, 'El año de fabricación es requerido'],
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  plates: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  kilometrajeInicial: {
    type: Number,
    required: [true, 'El kilometraje inicial es requerido'],
    min: 0,
    default: 0
  },
  kilometrajeTotal: {
    type: Number,
    default: 0,
    min: 0
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

// Inicializar kilometraje total con el inicial
vehicleSchema.pre('save', function(next) {
  if (this.isNew) {
    this.kilometrajeTotal = this.kilometrajeInicial;
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);