const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  updateProfileValidation,
  updateRoleValidation,
  mongoIdValidation,
} = require('../middleware/validate');
const { logAudit } = require('../utils/logger');

// Generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Registro de usuario
router.post('/register', registerValidation, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'read'
    });

    const token = generateToken(user._id);

    logAudit('USER_REGISTERED', {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      requestId: req.requestId
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    if (!user.isActive) {
      logAudit('LOGIN_FAILED_INACTIVE', {
        email,
        userId: user._id,
        requestId: req.requestId
      });
      return res.status(401).json({
        success: false,
        error: 'Usuario inactivo'
      });
    }

    const token = generateToken(user._id);

    logAudit('USER_LOGIN', {
      userId: user._id,
      email: user.email,
      requestId: req.requestId
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener perfil actual
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Actualizar perfil
router.put('/updateprofile', protect, updateProfileValidation, async (req, res) => {
  try {
    const fieldsToUpdate = {
      username: req.body.username,
      email: req.body.email
    };
    
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar contraseña
router.put('/updatepassword', protect, updatePasswordValidation, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Contraseña actual incorrecta'
      });
    }

    user.password = newPassword;
    await user.save();

    logAudit('PASSWORD_CHANGED', {
      userId: req.user.id,
      requestId: req.requestId
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener todos los usuarios (solo admin)
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const { isActive } = req.query;
    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Obtener un usuario específico (solo admin)
router.get('/users/:id', protect, authorize('admin'), mongoIdValidation, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Actualizar rol (solo admin)
router.put('/users/:id/role', protect, authorize('admin'), mongoIdValidation, updateRoleValidation, async (req, res) => {
  try {
    const oldUser = await User.findById(req.params.id);
    const oldRole = oldUser?.role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: req.body.role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    logAudit('ROLE_CHANGED', {
      targetUserId: req.params.id,
      targetEmail: user.email,
      oldRole,
      newRole: req.body.role,
      changedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Desactivar usuario (soft delete, solo admin)
router.delete('/users/:id', protect, authorize('admin'), mongoIdValidation, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Prevenir que el admin se desactive a sí mismo
    if (user._id.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu propia cuenta'
      });
    }

    user.isActive = false;
    await user.save();

    logAudit('USER_DEACTIVATED', {
      targetUserId: req.params.id,
      targetEmail: user.email,
      deactivatedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      success: true,
      message: 'Usuario desactivado correctamente',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reactivar usuario (solo admin)
router.patch('/users/:id/reactivate', protect, authorize('admin'), mongoIdValidation, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    user.isActive = true;
    await user.save();

    logAudit('USER_REACTIVATED', {
      targetUserId: req.params.id,
      targetEmail: user.email,
      reactivatedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({
      success: true,
      message: 'Usuario reactivado correctamente',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;