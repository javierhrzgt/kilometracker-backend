const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const Refuel = require('../models/Refuel');
const Maintenance = require('../models/Maintenance');
const Expense = require('../models/Expense');
const { protect, authorize } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');
const { sendDeleteConfirmationEmail } = require('../utils/emailService');
const { loginLimiter, registerLimiter, passwordResetLimiter, apiLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  updateProfileValidation,
  updateRoleValidation,
  mongoIdValidation,
} = require('../middleware/validate');
const { logAudit } = require('../utils/logger');

// Pending hard-delete requests keyed by root user id
const deleteRequests = new Map();

// Generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Registro de usuario
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
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
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
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
router.get('/me', protect, apiLimiter, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// Actualizar perfil
router.put('/updateprofile', protect, apiLimiter, updateProfileValidation, async (req, res) => {
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
router.put('/updatepassword', protect, apiLimiter, updatePasswordValidation, async (req, res) => {
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

// Solicitar recuperación de contraseña
router.post('/forgotpassword', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'El email es requerido' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Siempre responder 200 para no revelar si el email existe
    if (!user || !user.isActive) {
      return res.json({
        success: true,
        message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
      });
    }

    // Generar token crudo y guardar el hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, user.username, resetUrl);
    } catch (emailError) {
      // Limpiar el token si el email falla
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, error: 'Error al enviar el email. Intenta de nuevo.' });
    }

    res.json({
      success: true,
      message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Restablecer contraseña con token
router.put('/resetpassword/:token', passwordResetLimiter, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({ success: false, error: 'Token inválido o expirado' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    logAudit('PASSWORD_RESET', { userId: user._id });

    res.json({
      success: true,
      data: {
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todos los usuarios (solo admin)
router.get('/users', protect, authorize('admin', 'root'), apiLimiter, async (req, res) => {
  try {
    const { isActive } = req.query;
    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Admins cannot see root users — only root sees everyone
    if (req.user.role !== 'root') {
      query.role = { $ne: 'root' };
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
router.get('/users/:id', protect, authorize('admin', 'root'), apiLimiter, mongoIdValidation, async (req, res) => {
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
router.put('/users/:id/role', protect, authorize('admin', 'root'), apiLimiter, mongoIdValidation, updateRoleValidation, async (req, res) => {
  try {
    const oldUser = await User.findById(req.params.id);
    const oldRole = oldUser?.role;

    // Admin no puede modificar el rol de admin ni de root
    if ((oldUser?.role === 'root' || oldUser?.role === 'admin') && req.user.role !== 'root') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para modificar el rol de este usuario'
      });
    }

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
router.delete('/users/:id', protect, authorize('admin', 'root'), apiLimiter, mongoIdValidation, async (req, res) => {
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

    // Admin no puede desactivar a admin ni a root
    if ((user.role === 'root' || user.role === 'admin') && req.user.role !== 'root') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para desactivar este usuario'
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

// Solicitar código para eliminación permanente (solo root)
router.post('/users/:id/permanent/request', protect, authorize('root'), apiLimiter, mongoIdValidation, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);

    if (!target) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (target._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ success: false, error: 'No puedes eliminar tu propia cuenta' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    deleteRequests.set(req.user.id.toString(), {
      code,
      targetUserId: req.params.id,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    await sendDeleteConfirmationEmail(req.user.email, req.user.username, target.username, code);

    logAudit('PERMANENT_DELETE_REQUESTED', {
      requestedBy: req.user.id,
      targetUserId: req.params.id,
      requestId: req.requestId
    });

    res.json({ success: true, message: 'Código de confirmación enviado a tu correo' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Eliminación permanente con cascade delete (solo root)
router.delete('/users/:id/permanent', protect, authorize('root'), apiLimiter, mongoIdValidation, async (req, res) => {
  try {
    const { code, confirmWord } = req.body;

    if (confirmWord !== 'ELIMINAR') {
      return res.status(400).json({ success: false, error: 'Palabra de confirmación incorrecta. Escribe ELIMINAR' });
    }

    const pending = deleteRequests.get(req.user.id.toString());
    if (!pending) {
      return res.status(400).json({ success: false, error: 'No hay una solicitud de eliminación activa. Inicia el proceso nuevamente.' });
    }
    if (Date.now() > pending.expiresAt) {
      deleteRequests.delete(req.user.id.toString());
      return res.status(400).json({ success: false, error: 'El código ha expirado. Inicia el proceso nuevamente.' });
    }
    if (pending.targetUserId !== req.params.id) {
      return res.status(400).json({ success: false, error: 'El código no corresponde a este usuario.' });
    }
    if (pending.code !== code) {
      return res.status(400).json({ success: false, error: 'Código incorrecto.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      deleteRequests.delete(req.user.id.toString());
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    // Cascade delete
    deleteRequests.delete(req.user.id.toString());
    const vehicleIds = await Vehicle.find({ owner: req.params.id }).distinct('_id');
    await Route.deleteMany({ vehicle: { $in: vehicleIds } });
    await Refuel.deleteMany({ vehicle: { $in: vehicleIds } });
    await Maintenance.deleteMany({ vehicle: { $in: vehicleIds } });
    await Expense.deleteMany({ vehicle: { $in: vehicleIds } });
    await Vehicle.deleteMany({ owner: req.params.id });
    await User.deleteOne({ _id: req.params.id });

    logAudit('USER_PERMANENTLY_DELETED', {
      targetUserId: req.params.id,
      targetEmail: user.email,
      targetUsername: user.username,
      targetRole: user.role,
      deletedBy: req.user.id,
      requestId: req.requestId
    });

    res.json({ success: true, message: `Usuario ${user.username} eliminado permanentemente` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reactivar usuario (solo admin)
router.patch('/users/:id/reactivate', protect, authorize('admin', 'root'), apiLimiter, mongoIdValidation, async (req, res) => {
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