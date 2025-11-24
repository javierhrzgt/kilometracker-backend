// ===== server.js =====
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Rate limiting
const { apiLimiter, authLimiter } = require("./middleware/rateLimiter");

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aplicar rate limiting general a todas las rutas
app.use("/api/", apiLimiter);

// Conexión a MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((err) => console.error("❌ Error de conexión:", err));

// Rutas
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/vehicles", require("./routes/vehicles"));
app.use("/api/routes", require("./routes/routesVehicle"));
app.use("/api/refuels", require("./routes/refuels"));
app.use("/api/maintenance", require("./routes/maintenance"));
app.use("/api/expenses", require("./routes/expenses"));

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Error del servidor",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo`);
});
