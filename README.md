# KilomeTracker — Backend API

> API REST para gestión vehicular: kilómetros, combustible, mantenimiento y gastos.

![Estado](https://img.shields.io/badge/estado-en%20producci%C3%B3n-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933)
![Express](https://img.shields.io/badge/Express-4.x-000000)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)

---

## ¿Qué es KilomeTracker?

KilomeTracker es una aplicación web de gestión vehicular orientada al mercado guatemalteco. Permite a conductores individuales y flotas pequeñas llevar un control completo de sus vehículos: kilómetros recorridos, consumo de combustible, historial de mantenimientos y gastos asociados.

Este repositorio contiene la **API REST** que alimenta al frontend. Está completamente implementado y en producción — no es un esqueleto. Expone más de 40 endpoints organizados por recurso, con autenticación JWT, control de acceso por roles y paginación en todos los listados.

La moneda del sistema es el **Quetzal guatemalteco (Q)** y los registros pueden filtrarse por vehículo, rango de fechas y otras dimensiones específicas de cada recurso.

---

## Funcionalidades

- 🔐 **Autenticación JWT** con cuatro niveles de rol: `read`, `write`, `admin`, `root`
- 🚗 **Gestión de vehículos** con odómetro actualizado automáticamente usando operaciones atómicas (`$inc`)
- 🛣️ **Registro de rutas/viajes** — cada ruta incrementa el `kilometrajeTotal` del vehículo en tiempo real
- ⛽ **Control de recargas de combustible** con análisis de eficiencia: km/litro, km/galón, costo/km
- 🔧 **Mantenimiento preventivo** — alertas por fecha y kilometraje, registro de proveedores y próximo servicio
- 💰 **Gastos vehiculares** — seguros, impuestos, estacionamiento, peajes y más; soporte de gastos recurrentes y deducibles fiscales
- 📊 **Estadísticas y analíticas** — costo total de propiedad, eficiencia por período, resumen por categoría

---

## Stack técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | >= 18 |
| Framework | Express | ^4.18.2 |
| Base de datos | MongoDB Atlas | Cloud |
| ODM | Mongoose | ^7.6.3 |
| Autenticación | jsonwebtoken + bcryptjs | ^9.0.2 / ^2.4.3 |
| Validación | express-validator | ^7.0.1 |
| Seguridad | helmet + cors | ^8.1.0 / ^2.8.5 |
| Logging | Winston | ^3.19.0 |
| Tests | Jest + Supertest + mongodb-memory-server | ^30 / ^7 / ^10 |
| Package manager | pnpm | — |
| Deploy | Railway / Render | — |

---

## Prerrequisitos

- **Node.js** >= 18
- **pnpm** (`npm install -g pnpm`)
- Cuenta en **MongoDB Atlas** (o instancia local de MongoDB)

---

## Setup local

1. **Clona el repositorio:**
   ```bash
   git clone <url-del-repo>
   cd kilometracker-backend
   ```

2. **Instala las dependencias:**
   ```bash
   pnpm install
   ```

3. **Crea el archivo de entorno:**
   ```bash
   cp .env.example .env
   ```

4. **Configura las variables de entorno** (ver sección siguiente).

5. **Inicia el servidor en modo desarrollo:**
   ```bash
   pnpm run dev
   ```

   El servidor estará disponible en `http://localhost:5000`.

> **Opcional:** Para crear el usuario `root` inicial ejecuta `node scripts/seedRoot.js`.

---

## Variables de entorno

```env
# Conexión a MongoDB Atlas (o local)
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/kilometracker

# Clave secreta para firmar tokens JWT (usa una cadena larga y aleatoria)
JWT_SECRET=tu_clave_secreta_aqui

# Tiempo de expiración del token
JWT_EXPIRE=7d

# Puerto del servidor
PORT=5000

# Entorno de ejecución
NODE_ENV=development
```

---

## Estructura del proyecto

```
kilometracker-backend/
├── server.js              # Entry point — seguridad, middlewares, rutas, error handling
├── middleware/
│   ├── auth.js            # protect (JWT) + authorize (RBAC)
│   ├── rateLimiter.js     # 100 req/15min general · 5 req/15min auth
│   └── requestLogger.js   # Logging con requestId único
├── models/
│   ├── User.js
│   ├── Vehicle.js
│   ├── Route.js
│   ├── Refuel.js
│   ├── Maintenance.js
│   └── Expense.js
├── routes/
│   ├── auth.js            # Login, registro, perfil, gestión de usuarios
│   ├── vehicles.js        # CRUD + stats + fuel-efficiency
│   ├── routesVehicle.js   # CRUD rutas/viajes
│   ├── refuels.js         # CRUD recargas + análisis
│   ├── maintenance.js     # CRUD mantenimiento + upcoming
│   ├── expenses.js        # CRUD gastos + summary + upcoming
│   └── dashboard.js       # Estadísticas generales
├── utils/
│   ├── logger.js          # Logger centralizado (Winston)
│   └── pagination.js      # paginate() + getPaginationData()
└── scripts/
    └── seedRoot.js        # Crea el usuario root inicial
```

---

## Tests

```bash
pnpm test              # Ejecuta todos los tests
pnpm test --coverage   # Con reporte de cobertura
```

Los tests usan `mongodb-memory-server` — no requieren una instancia real de MongoDB.

---

## Documentación técnica

Para información detallada sobre modelos de datos, todos los endpoints, sistema de roles, decisiones de diseño y roadmap, ver **[PRD.md](./PRD.md)**.

---

## Repo relacionado

**[kilometracker-front](../kilometracker-front)** — Frontend Next.js 16 que consume esta API. Desplegado en Vercel en `https://kilometracker.vercel.app`.
