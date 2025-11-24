# ENDPOINTS PRINCIPALES:

## === AUTENTICACIÓN ===
- POST   /api/auth/register          - Registrar usuario
- POST   /api/auth/login             - Iniciar sesión
- GET    /api/auth/me                - Obtener perfil (requiere auth)
- PUT    /api/auth/updateprofile     - Actualizar perfil (requiere auth)
- PUT    /api/auth/users/:id/role    - Cambiar rol usuario (solo admin)

## === VEHÍCULOS ===
- GET    /api/vehicles               - Listar vehículos (requiere auth)
- GET    /api/vehicles/:alias        - Obtener vehículo específico (requiere auth)
- POST   /api/vehicles               - Crear vehículo (requiere write/admin)
- PUT    /api/vehicles/:alias        - Actualizar vehículo (requiere write/admin)
- DELETE /api/vehicles/:alias        - Eliminar vehículo (requiere write/admin)
- GET    /api/vehicles/:alias/stats  - Obtener estadísticas (requiere auth)

## === RUTAS ===
- GET    /api/routes                 - Listar rutas (requiere auth)
       Query params: ?vehicleAlias=XXX&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
- GET    /api/routes/:id             - Obtener ruta específica (requiere auth)
- POST   /api/routes                 - Crear ruta (requiere write/admin)
- PUT    /api/routes/:id             - Actualizar ruta (requiere write/admin)
- DELETE /api/routes/:id             - Eliminar ruta (requiere write/admin)

## === REABASTECIMIENTOS ===
- GET    /api/refuels                - Listar reabastecimientos (requiere auth)
       Query params: ?vehicleAlias=XXX
- GET    /api/refuels/:id            - Obtener reabastecimiento (requiere auth)
- POST   /api/refuels                - Crear reabastecimiento (requiere write/admin)
- PUT    /api/refuels/:id            - Actualizar reabastecimiento (requiere write/admin)
- DELETE /api/refuels/:id            - Eliminar reabastecimiento (requiere write/admin)
- GET    /api/refuels/vehicle/:alias/analysis - Análisis de consumo (requiere auth)

## EJEMPLOS DE USO CON CURL:

1. Registrar usuario:
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{\
    "username": "usuario1",\
    "email": "usuario1@example.com",\
    "password": "password123",\
    "role": "write"\
  }'

2. Login:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ \
    "email": "usuario1@example.com",\
    "password": "password123" \
  }'

3. Crear vehículo (usar el token del login):
curl -X POST http://localhost:5000/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{ \
    "alias": "CAR01", \
    "marca": "Toyota", \
    "modelo": 2020, \
    "plates": "ABC123", \
    "kilometrajeInicial": 50000 \
  }'

4. Crear ruta:
curl -X POST http://localhost:5000/api/routes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{ \
    "vehicleAlias": "CAR01", \
    "distanciaRecorrida": 150.5, \
    "fecha": "2024-11-20", \
    "notasAdicionales": "Viaje a la ciudad" \
  }'

5. Crear reabastecimiento:
curl -X POST http://localhost:5000/api/refuels \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{ \
    "vehicleAlias": "CAR01", \
    "tipoCombustible": "Premium", \
    "cantidadGastada": 500, \
    "galones": 10.5 \
  }'

## ROLES DE USUARIO:
- read: Solo lectura (GET)
- write: Lectura y escritura (GET, POST, PUT, DELETE)
- admin: Todas las operaciones + gestión de usuarios

## CARACTERÍSTICAS PRINCIPALES:
✅ Actualización automática de kilometraje total al agregar/modificar/eliminar rutas  \
✅ Manejo dinámico al cambiar vehículo asociado a una ruta \
✅ Protección de endpoints con JWT \
✅ Sistema de roles y permisos \
✅ Validación de datos con Mongoose \
✅ Soft delete en vehículos \
✅ Estadísticas y análisis \
✅ Filtrado por fechas y vehículos \
✅ Cálculo automático de precio por galón