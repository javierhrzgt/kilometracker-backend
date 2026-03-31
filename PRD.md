# PRD — KilomeTracker Backend (v2)

**Repo:** `kilometracker-backend/`
**Fecha de redacción:** 2026-03-30
**Estado:** En progreso

---

## 1. Propósito

Documentar el estado actual, las decisiones de diseño y el trabajo pendiente del backend REST de KilomeTracker. Este archivo es la fuente de verdad para cualquier agente o desarrollador que trabaje en `kilometracker-backend/`.

---

## 2. Stack técnico

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | >= 18 |
| Framework | Express | ^4.18.2 |
| Base de datos | MongoDB | Atlas (cloud) |
| ODM | Mongoose | ^7.6.3 |
| Auth | jsonwebtoken + bcryptjs | ^9.0.2 / ^2.4.3 |
| Validación | express-validator | ^7.0.1 |
| Seguridad | helmet, cors | ^8.1.0 / ^2.8.5 |
| Logging | winston | ^3.19.0 |
| Email (pendiente) | @brevo/node-sdk | — |
| Tests | Jest + supertest + mongodb-memory-server | ^30 / ^7 / ^10 |
| Package manager | pnpm | — |
| Deploy | Railway / Render (producción actual) | — |

---

## 3. Variables de entorno requeridas

```env
MONGODB_URI=           # Connection string de MongoDB Atlas
JWT_SECRET=            # Clave para firmar tokens JWT
JWT_EXPIRE=7d          # Expiración del token
PORT=5000
NODE_ENV=development   # o production
```

---

## 4. Arquitectura

### 4.1 Arranque (`server.js`)

1. Configura seguridad (helmet, CORS con whitelist).
2. Aplica rate limiting global (`apiLimiter`) y estricto en `/api/auth` (`authLimiter`).
3. Conecta a MongoDB y ejecuta `migrateKilometraje()` — corrige `kilometrajeTotal` de todos los vehículos calculándolo desde las rutas reales (idempotente, solo se ejecuta al arrancar).
4. Monta todos los routers.
5. Maneja errores globalmente (ValidationError, CastError, JWT errors, 11000 duplicates).

### 4.2 Relaciones del modelo de datos

```
User (isActive, soft delete)
  └─ Vehicle (isActive, soft delete)
       ├─ Route   (permanent delete, actualiza kilometrajeTotal)
       ├─ Refuel  (permanent delete)
       ├─ Maintenance (permanent delete)
       └─ Expense (permanent delete)
```

Todos los modelos incluyen el campo `owner` (ref a User). Route, Refuel, Maintenance y Expense también incluyen `vehicle` (ObjectId) y `vehicleAlias` (String).

### 4.3 Identificación de vehículos

Los vehículos se identifican por `alias` (string uppercase único por owner), no por `_id`. Todas las rutas de API que referencian un vehículo usan el alias como parámetro de URL.

### 4.4 Formato de respuesta uniforme

```json
{ "success": true, "data": {}, "count": 0 }
{ "success": false, "error": "mensaje" }
```

---

## 5. Endpoints implementados

### 5.1 Auth — `/api/auth`

Rate limit estricto: 5 req / 15 min.

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/login` | No | Retorna JWT |
| POST | `/register` | No | Crea usuario con rol `read` |
| GET | `/me` | Sí | Perfil del usuario autenticado |
| PUT | `/updateprofile` | Sí | Actualiza username / email |
| PUT | `/updatepassword` | Sí | Cambia contraseña (valida contraseña actual, min 6 chars) |
| GET | `/users` | Admin | Lista todos los usuarios (`?isActive=true/false`) |
| GET | `/users/:id` | Admin | Detalle de usuario |
| PUT | `/users/:id/role` | Admin | Cambia rol (`read`, `write`, `admin`) |
| DELETE | `/users/:id` | Admin | Soft delete (no puede desactivarse a sí mismo) |
| PATCH | `/users/:id/reactivate` | Admin | Reactiva usuario |

### 5.2 Vehicles — `/api/vehicles`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Sí | Lista vehículos (`?isActive`) |
| POST | `/` | Write | Crea vehículo |
| GET | `/:alias` | Sí | Detalle |
| PUT | `/:alias` | Write | Actualiza |
| DELETE | `/:alias` | Write | Soft delete |
| PATCH | `/:alias/reactivate` | Write | Reactiva |
| GET | `/:alias/stats` | Sí | Stats completas (rutas, refuels, maintenance, expenses, eficiencia) |
| GET | `/:alias/fuel-efficiency` | Sí | Eficiencia de combustible (`?startDate&endDate`) |

### 5.3 Routes — `/api/routes`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Sí | Lista rutas (`?vehicleAlias`, `?startDate`, `?endDate`) |
| POST | `/` | Write | Crea ruta, incrementa `kilometrajeTotal` del vehículo |
| GET | `/:id` | Sí | Detalle |
| PUT | `/:id` | Write | Actualiza, recalcula diferencia en `kilometrajeTotal` |
| DELETE | `/:id` | Write | Permanent delete, decrementa `kilometrajeTotal` |

### 5.4 Refuels — `/api/refuels`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Sí | Lista (`?vehicleAlias`, `?startDate`, `?endDate`) |
| GET | `/vehicle/:alias/analysis` | Sí | Analisis de combustible para un vehículo |
| POST | `/` | Write | Crea registro de carga |
| GET | `/:id` | Sí | Detalle |
| PUT | `/:id` | Write | Actualiza |
| DELETE | `/:id` | Write | Permanent delete |

### 5.5 Maintenance — `/api/maintenance`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Sí | Lista (`?vehicleAlias`, `?tipo`, `?startDate`, `?endDate`) |
| GET | `/upcoming` | Sí | Servicios pendientes en 30 días o 500 km |
| POST | `/` | Write | Crea registro |
| GET | `/:id` | Sí | Detalle |
| PUT | `/:id` | Write | Actualiza |
| DELETE | `/:id` | Write | Permanent delete |

**Tipos de mantenimiento:** Cambio de aceite, Rotación de llantas, Frenos, Inspección, Reparación, Batería, Filtros, Transmisión, Suspensión, Alineación, Otro

### 5.6 Expenses — `/api/expenses`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/` | Sí | Lista (`?vehicleAlias`, `?categoria`, `?startDate`, `?endDate`, `?taxDeductible`) |
| GET | `/summary` | Sí | Agregación por categoría |
| GET | `/upcoming` | Sí | Gastos recurrentes en los próximos 30 días |
| POST | `/` | Write | Crea gasto |
| GET | `/:id` | Sí | Detalle |
| PUT | `/:id` | Write | Actualiza |
| DELETE | `/:id` | Write | Permanent delete |

**Categorías:** Seguro, Impuestos, Registro, Estacionamiento, Peajes, Lavado, Multas, Financiamiento, Otro
**Frecuencias de recurrencia:** Mensual, Trimestral, Semestral, Anual

---

## 6. Middlewares implementados

| Archivo | Función |
|---|---|
| `middleware/auth.js` | `protect` (valida JWT), `authorize(...roles)` (RBAC) |
| `middleware/rateLimiter.js` | `apiLimiter` (100 req/15 min), `authLimiter` (5 req/15 min) |
| `middleware/requestLogger.js` | Logging de requests con `requestId` único |

---

## 7. Utilidades implementadas

| Archivo | Función |
|---|---|
| `utils/logger.js` | Logger centralizado (Winston) |
| `utils/pagination.js` | `paginate(query, page, limit)` + `getPaginationData(...)` |

---

## 8. Seguridad

- Contraseñas hasheadas con bcrypt (cost factor 12) via Mongoose pre-save hook.
- Campo `password` con `select: false` en el esquema — requiere `.select('+password')` para autenticar.
- JWT en Bearer token (header `Authorization`).
- CORS con whitelist explícita: `https://kilometracker.vercel.app`, `http://localhost:3000`, `http://localhost:5173`.
- Rate limiting en memory (se limpia cada hora).
- Helmet para headers de seguridad HTTP.

---

## 9. Patrones de borrado

| Entidad | Tipo de borrado | Efecto colateral |
|---|---|---|
| User | Soft (isActive: false) | No puede desactivarse a sí mismo (admin) |
| Vehicle | Soft (isActive: false) | Ninguno |
| Route | Permanent | Decrementa `kilometrajeTotal` del vehículo |
| Refuel | Permanent | Ninguno |
| Maintenance | Permanent | Ninguno |
| Expense | Permanent | Ninguno |

---

## 10. Índices de base de datos

| Modelo | Índice |
|---|---|
| Route | Compound: `vehicle + fecha` |
| Maintenance | Compound: `vehicle + fecha`, `vehicle + tipo` |
| Expense | Compound: `vehicle + fecha`, `vehicle + categoria`, `owner + esDeducibleImpuestos` |

---

## 11. Trabajo pendiente (roadmap priorizado)

### P0 — Password reset con Brevo

- [ ] Instalar `@brevo/node-sdk`
- [ ] Agregar `BREVO_API_KEY` y `CLIENT_URL` a las variables de entorno
- [ ] Crear modelo o campo `resetPasswordToken` + `resetPasswordExpire` en User
- [ ] `POST /api/auth/forgotpassword` — genera token, envía email via Brevo
- [ ] `PUT /api/auth/resetpassword/:token` — valida token, actualiza contraseña
- [ ] El frontend ya tiene `/forgot-password` y `/reset-password/[token]` implementados

### P1 — Hardening y calidad

- [ ] Migrar de Express 4 a Express 5 (`package.json` declara `^4.18.2` pero CLAUDE.md menciona Express 5)
- [ ] Agregar validación con express-validator en todos los endpoints de escritura (actualmente parcial)
- [ ] Revisar que `scripts/seedRoot.js` funcione correctamente con la estructura actual
- [ ] Configurar Jest para CI (coverage mínimo objetivo: 70%)

### P2 — Tests con Jest + supertest

- [ ] Setup de mongodb-memory-server en `jest.config.js`
- [ ] Tests unitarios de middlewares (`auth`, `rateLimiter`)
- [ ] Tests de integración por router (auth, vehicles, routes, refuels, maintenance, expenses)
- [ ] Test específico para `migrateKilometraje` (idempotencia y corrección)

### P3 — Mejoras de API

- [ ] Paginación: aplicar `utils/pagination.js` en todos los endpoints GET de lista (actualmente no se usa en todos)
- [ ] Endpoint `GET /api/dashboard` — revisar qué agrega sobre stats individuales
- [ ] Documentación OpenAPI 3.1 (`openapi.yaml` en raíz del repo)

---

## 12. Estructura de archivos (sin node_modules)

```
kilometracker-backend/
├── server.js
├── package.json
├── .env.example
├── middleware/
│   ├── auth.js
│   ├── rateLimiter.js
│   └── requestLogger.js
├── models/
│   ├── User.js
│   ├── Vehicle.js
│   ├── Route.js
│   ├── Refuel.js
│   ├── Maintenance.js
│   └── Expense.js
├── routes/
│   ├── auth.js
│   ├── dashboard.js
│   ├── vehicles.js
│   ├── routesVehicle.js
│   ├── refuels.js
│   ├── maintenance.js
│   └── expenses.js
├── utils/
│   ├── logger.js
│   └── pagination.js
└── scripts/
    └── seedRoot.js
```

---

## 13. Convenciones de desarrollo

- Siempre buscar vehículos con alias en mayúsculas: `Vehicle.findOne({ alias: alias.toUpperCase(), owner: req.user.id })`
- Ordenar resultados por `fecha: -1` (más reciente primero) en todas las listas.
- No exponer mensajes de error internos en producción (el middleware global ya lo maneja).
- El campo `precioPorGalon` de Refuel es un virtual — no se almacena, se calcula en JSON/Object output.

---

## 14. Contexto de producción

- El backend actual sirve al frontend desplegado en `https://kilometracker.vercel.app`.
- La base de datos es MongoDB Atlas (no Prisma/PostgreSQL — ese era el plan v2, descartado o pospuesto).
- No hay un segundo backend legacy separado: este repositorio ES el backend de producción.
