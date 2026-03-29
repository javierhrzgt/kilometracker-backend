require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedRoot = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const existing = await User.findOne({ role: 'root' });
    if (existing) {
      console.log('Root ya existe:', existing.email);
      process.exit(0);
    }
    const root = await User.create({
      username: process.env.ROOT_USERNAME || 'root',
      email: process.env.ROOT_EMAIL,
      password: process.env.ROOT_PASSWORD,
      role: 'root'
    });
    console.log('Root creado exitosamente:', root.email, '| id:', root._id);
    process.exit(0);
  } catch (error) {
    console.error('Error al crear root:', error.message);
    process.exit(1);
  }
};

seedRoot();
