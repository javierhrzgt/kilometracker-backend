const { body, param, query, validationResult } = require("express-validator");

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    return res.status(400).json({
      success: false,
      error: errorMessages.join(", "),
      details: errors.array(),
    });
  }
  next();
};

// ==================== AUTH VALIDATIONS ====================

const registerValidation = [
  body("username")
    .trim()
    .notEmpty()
    .withMessage("El nombre de usuario es requerido")
    .isLength({ min: 3 })
    .withMessage("El nombre de usuario debe tener al menos 3 caracteres")
    .isLength({ max: 50 })
    .withMessage("El nombre de usuario no puede exceder 50 caracteres"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es requerido")
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("La contraseña es requerida")
    .isLength({ min: 6 })
    .withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("role")
    .optional()
    .isIn(["read", "write", "admin"])
    .withMessage("Rol inválido"),
  handleValidationErrors,
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("El email es requerido")
    .isEmail()
    .withMessage("Email inválido"),
  body("password").notEmpty().withMessage("La contraseña es requerida"),
  handleValidationErrors,
];

const updatePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("La contraseña actual es requerida"),
  body("newPassword")
    .notEmpty()
    .withMessage("La nueva contraseña es requerida")
    .isLength({ min: 6 })
    .withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
  handleValidationErrors,
];

const updateProfileValidation = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("El nombre de usuario debe tener al menos 3 caracteres")
    .isLength({ max: 50 })
    .withMessage("El nombre de usuario no puede exceder 50 caracteres"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Email inválido")
    .normalizeEmail(),
  handleValidationErrors,
];

const updateRoleValidation = [
  body("role")
    .notEmpty()
    .withMessage("El rol es requerido")
    .isIn(["read", "write", "admin"])
    .withMessage("Rol inválido"),
  handleValidationErrors,
];

// ==================== VEHICLE VALIDATIONS ====================

const createVehicleValidation = [
  body("alias")
    .trim()
    .notEmpty()
    .withMessage("El alias es requerido")
    .isLength({ max: 20 })
    .withMessage("El alias no puede exceder 20 caracteres"),
  body("marca")
    .trim()
    .notEmpty()
    .withMessage("La marca es requerida")
    .isLength({ max: 50 })
    .withMessage("La marca no puede exceder 50 caracteres"),
  body("modelo")
    .notEmpty()
    .withMessage("El año de fabricación es requerido")
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage(
      `El año debe estar entre 1900 y ${new Date().getFullYear() + 1}`
    ),
  body("plates")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Las placas no pueden exceder 20 caracteres"),
  body("kilometrajeInicial")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El kilometraje inicial debe ser mayor o igual a 0"),
  handleValidationErrors,
];

const updateVehicleValidation = [
  body("alias")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("El alias no puede exceder 20 caracteres"),
  body("marca")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("La marca no puede exceder 50 caracteres"),
  body("modelo")
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage(
      `El año debe estar entre 1900 y ${new Date().getFullYear() + 1}`
    ),
  body("plates")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Las placas no pueden exceder 20 caracteres"),
  body("kilometrajeInicial")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El kilometraje inicial debe ser mayor o igual a 0"),
  handleValidationErrors,
];

// ==================== ROUTE VALIDATIONS ====================

const createRouteValidation = [
  body("vehicleAlias")
    .trim()
    .notEmpty()
    .withMessage("El alias del vehículo es requerido"),
  body("distanciaRecorrida")
    .notEmpty()
    .withMessage("La distancia recorrida es requerida")
    .isFloat({ min: 0.1 })
    .withMessage("La distancia debe ser mayor a 0"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  body("notasAdicionales")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las notas no pueden exceder 500 caracteres"),
  handleValidationErrors,
];

const updateRouteValidation = [
  body("vehicleAlias")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("El alias del vehículo no puede estar vacío"),
  body("distanciaRecorrida")
    .optional()
    .isFloat({ min: 0.1 })
    .withMessage("La distancia debe ser mayor a 0"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  body("notasAdicionales")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las notas no pueden exceder 500 caracteres"),
  handleValidationErrors,
];

// ==================== REFUEL VALIDATIONS ====================

const fuelTypes = [
  "Regular",
  "Premium",
  "Diesel",
  "Eléctrico",
  "Híbrido",
  "V-Power",
];

const createRefuelValidation = [
  body("vehicleAlias")
    .trim()
    .notEmpty()
    .withMessage("El alias del vehículo es requerido"),
  body("tipoCombustible")
    .notEmpty()
    .withMessage("El tipo de combustible es requerido")
    .isIn(fuelTypes)
    .withMessage(`Tipo de combustible inválido. Debe ser: ${fuelTypes.join(", ")}`),
  body("cantidadGastada")
    .notEmpty()
    .withMessage("La cantidad gastada es requerida")
    .isFloat({ min: 0 })
    .withMessage("La cantidad debe ser mayor o igual a 0"),
  body("galones")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Los galones deben ser mayor o igual a 0"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  handleValidationErrors,
];

const updateRefuelValidation = [
  body("vehicleAlias").optional().trim(),
  body("tipoCombustible")
    .optional()
    .isIn(fuelTypes)
    .withMessage(`Tipo de combustible inválido. Debe ser: ${fuelTypes.join(", ")}`),
  body("cantidadGastada")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("La cantidad debe ser mayor o igual a 0"),
  body("galones")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Los galones deben ser mayor o igual a 0"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  handleValidationErrors,
];

// ==================== MAINTENANCE VALIDATIONS ====================

const maintenanceTypes = [
  "Cambio de aceite",
  "Rotación de llantas",
  "Frenos",
  "Inspección",
  "Reparación",
  "Batería",
  "Filtros",
  "Transmisión",
  "Suspensión",
  "Alineación",
  "Otro",
];

const createMaintenanceValidation = [
  body("vehicleAlias")
    .trim()
    .notEmpty()
    .withMessage("El alias del vehículo es requerido"),
  body("tipo")
    .notEmpty()
    .withMessage("El tipo de mantenimiento es requerido")
    .isIn(maintenanceTypes)
    .withMessage(`Tipo inválido. Debe ser: ${maintenanceTypes.join(", ")}`),
  body("descripcion")
    .trim()
    .notEmpty()
    .withMessage("La descripción es requerida")
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
  body("costo")
    .notEmpty()
    .withMessage("El costo es requerido")
    .isFloat({ min: 0 })
    .withMessage("El costo debe ser mayor o igual a 0"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  body("kilometraje")
    .notEmpty()
    .withMessage("El kilometraje es requerido")
    .isFloat({ min: 0 })
    .withMessage("El kilometraje debe ser mayor o igual a 0"),
  body("proveedor")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("El proveedor no puede exceder 100 caracteres"),
  body("proximoServicioFecha")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Fecha de próximo servicio inválida"),
  body("proximoServicioKm")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("El kilometraje de próximo servicio debe ser mayor o igual a 0"),
  body("notas")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las notas no pueden exceder 500 caracteres"),
  handleValidationErrors,
];

const updateMaintenanceValidation = [
  body("vehicleAlias").optional().trim(),
  body("tipo")
    .optional()
    .isIn(maintenanceTypes)
    .withMessage(`Tipo inválido. Debe ser: ${maintenanceTypes.join(", ")}`),
  body("descripcion")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
  body("costo")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El costo debe ser mayor o igual a 0"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  body("kilometraje")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El kilometraje debe ser mayor o igual a 0"),
  body("proveedor")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("El proveedor no puede exceder 100 caracteres"),
  body("proximoServicioFecha")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Fecha de próximo servicio inválida"),
  body("proximoServicioKm")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("El kilometraje de próximo servicio debe ser mayor o igual a 0"),
  body("notas")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las notas no pueden exceder 500 caracteres"),
  handleValidationErrors,
];

// ==================== EXPENSE VALIDATIONS ====================

const expenseCategories = [
  "Seguro",
  "Impuestos",
  "Registro",
  "Estacionamiento",
  "Peajes",
  "Lavado",
  "Multas",
  "Financiamiento",
  "Otro",
];

const recurrenceFrequencies = ["Mensual", "Trimestral", "Semestral", "Anual"];

const createExpenseValidation = [
  body("vehicleAlias")
    .trim()
    .notEmpty()
    .withMessage("El alias del vehículo es requerido"),
  body("categoria")
    .notEmpty()
    .withMessage("La categoría es requerida")
    .isIn(expenseCategories)
    .withMessage(`Categoría inválida. Debe ser: ${expenseCategories.join(", ")}`),
  body("monto")
    .notEmpty()
    .withMessage("El monto es requerido")
    .isFloat({ min: 0 })
    .withMessage("El monto debe ser mayor o igual a 0"),
  body("descripcion")
    .trim()
    .notEmpty()
    .withMessage("La descripción es requerida")
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  body("esRecurrente")
    .optional()
    .isBoolean()
    .withMessage("esRecurrente debe ser un valor booleano"),
  body("frecuenciaRecurrencia")
    .optional({ nullable: true })
    .isIn(recurrenceFrequencies)
    .withMessage(`Frecuencia inválida. Debe ser: ${recurrenceFrequencies.join(", ")}`),
  body("proximoPago")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Fecha de próximo pago inválida"),
  body("esDeducibleImpuestos")
    .optional()
    .isBoolean()
    .withMessage("esDeducibleImpuestos debe ser un valor booleano"),
  body("notas")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las notas no pueden exceder 500 caracteres"),
  handleValidationErrors,
];

const updateExpenseValidation = [
  body("vehicleAlias").optional().trim(),
  body("categoria")
    .optional()
    .isIn(expenseCategories)
    .withMessage(`Categoría inválida. Debe ser: ${expenseCategories.join(", ")}`),
  body("monto")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El monto debe ser mayor o igual a 0"),
  body("descripcion")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("La descripción no puede exceder 500 caracteres"),
  body("fecha").optional().isISO8601().withMessage("Fecha inválida"),
  body("esRecurrente")
    .optional()
    .isBoolean()
    .withMessage("esRecurrente debe ser un valor booleano"),
  body("frecuenciaRecurrencia")
    .optional({ nullable: true })
    .isIn(recurrenceFrequencies)
    .withMessage(`Frecuencia inválida. Debe ser: ${recurrenceFrequencies.join(", ")}`),
  body("proximoPago")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Fecha de próximo pago inválida"),
  body("esDeducibleImpuestos")
    .optional()
    .isBoolean()
    .withMessage("esDeducibleImpuestos debe ser un valor booleano"),
  body("notas")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Las notas no pueden exceder 500 caracteres"),
  handleValidationErrors,
];

// ==================== COMMON VALIDATIONS ====================

const mongoIdValidation = [
  param("id").isMongoId().withMessage("ID inválido"),
  handleValidationErrors,
];

const aliasParamValidation = [
  param("alias")
    .trim()
    .notEmpty()
    .withMessage("El alias es requerido"),
  handleValidationErrors,
];

const dateRangeQueryValidation = [
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("startDate debe ser una fecha válida"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("endDate debe ser una fecha válida"),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  // Auth
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  updateProfileValidation,
  updateRoleValidation,
  // Vehicle
  createVehicleValidation,
  updateVehicleValidation,
  // Route
  createRouteValidation,
  updateRouteValidation,
  // Refuel
  createRefuelValidation,
  updateRefuelValidation,
  // Maintenance
  createMaintenanceValidation,
  updateMaintenanceValidation,
  // Expense
  createExpenseValidation,
  updateExpenseValidation,
  // Common
  mongoIdValidation,
  aliasParamValidation,
  dateRangeQueryValidation,
};
