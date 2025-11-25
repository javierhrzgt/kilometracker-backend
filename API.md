# API Documentation - Kilometracker

Complete API reference with request/response schemas for all endpoints.

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Auth Endpoints

### Register User
**POST** `/api/auth/register`

**Request Body:**
```json
{
  "username": "string (required, min 3 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)",
  "role": "string (optional, default: 'read', enum: ['read', 'write', 'admin'])"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "string"
    },
    "token": "string"
  }
}
```

---

### Login
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "string"
    },
    "token": "string"
  }
}
```

---

### Get Current User Profile
**GET** `/api/auth/me`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "isActive": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Update Profile
**PUT** `/api/auth/updateprofile`

**Auth Required:** Yes

**Request Body:**
```json
{
  "username": "string (optional)",
  "email": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "isActive": true
  }
}
```

---

### Change Password
**PUT** `/api/auth/updatepassword`

**Auth Required:** Yes

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 6 chars)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

---

### List All Users (Admin Only)
**GET** `/api/auth/users?isActive=true`

**Auth Required:** Yes (Admin only)

**Query Parameters:**
- `isActive` (optional): "true" | "false"

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "string",
      "username": "string",
      "email": "string",
      "role": "string",
      "isActive": true,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

### Get User by ID (Admin Only)
**GET** `/api/auth/users/:id`

**Auth Required:** Yes (Admin only)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "isActive": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Update User Role (Admin Only)
**PUT** `/api/auth/users/:id/role`

**Auth Required:** Yes (Admin only)

**Request Body:**
```json
{
  "role": "string (required, enum: ['read', 'write', 'admin'])"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "isActive": true
  }
}
```

---

### Deactivate User (Admin Only)
**DELETE** `/api/auth/users/:id`

**Auth Required:** Yes (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Usuario desactivado correctamente",
  "data": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "role": "string",
    "isActive": false
  }
}
```

---

### Reactivate User (Admin Only)
**PATCH** `/api/auth/users/:id/reactivate`

**Auth Required:** Yes (Admin only)

**Response (200):**
```json
{
  "success": true,
  "message": "Usuario reactivado correctamente",
  "data": {
    "_id": "string",
    "isActive": true
  }
}
```

---

## Vehicle Endpoints

### List All Vehicles
**GET** `/api/vehicles?isActive=true`

**Auth Required:** Yes

**Query Parameters:**
- `isActive` (optional): "true" | "false"

**Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "string",
      "alias": "string",
      "marca": "string",
      "modelo": 2023,
      "plates": "string",
      "kilometrajeInicial": 0,
      "kilometrajeTotal": 15000,
      "owner": "string",
      "isActive": true,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

### Get Vehicle by Alias
**GET** `/api/vehicles/:alias`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "alias": "string",
    "marca": "string",
    "modelo": 2023,
    "plates": "string",
    "kilometrajeInicial": 0,
    "kilometrajeTotal": 15000,
    "owner": "string",
    "isActive": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Create Vehicle
**POST** `/api/vehicles`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "alias": "string (required, will be uppercased)",
  "marca": "string (required)",
  "modelo": "number (required, year between 1900 and current+1)",
  "plates": "string (optional)",
  "kilometrajeInicial": "number (required, min: 0, default: 0)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "alias": "STRING",
    "marca": "string",
    "modelo": 2023,
    "plates": "string",
    "kilometrajeInicial": 0,
    "kilometrajeTotal": 0,
    "owner": "string",
    "isActive": true,
    "createdAt": "date",
    "updatedAt": "date"
  }
}
```

---

### Update Vehicle
**PUT** `/api/vehicles/:alias`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "marca": "string (optional)",
  "modelo": "number (optional)",
  "plates": "string (optional)",
  "kilometrajeInicial": "number (optional)"
}
```

**Note:** Cannot update `kilometrajeTotal` or `owner` directly.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "alias": "string",
    "marca": "string",
    "modelo": 2023,
    "plates": "string",
    "kilometrajeInicial": 0,
    "kilometrajeTotal": 15000,
    "isActive": true
  }
}
```

---

### Deactivate Vehicle (Soft Delete)
**DELETE** `/api/vehicles/:alias`

**Auth Required:** Yes (Write or Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Vehículo desactivado correctamente",
  "data": {
    "_id": "string",
    "alias": "string",
    "isActive": false
  }
}
```

---

### Reactivate Vehicle
**PATCH** `/api/vehicles/:alias/reactivate`

**Auth Required:** Yes (Write or Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Vehículo reactivado correctamente",
  "data": {
    "_id": "string",
    "alias": "string",
    "isActive": true
  }
}
```

---

### Get Vehicle Fuel Efficiency
**GET** `/api/vehicles/:alias/fuel-efficiency?startDate=2024-01-01&endDate=2024-12-31`

**Auth Required:** Yes

**Query Parameters:**
- `startDate` (optional): "YYYY-MM-DD"
- `endDate` (optional): "YYYY-MM-DD"

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "alias": "string",
      "marca": "string",
      "modelo": 2023
    },
    "efficiency": {
      "kmPorLitro": 12.5,
      "kmPorGalon": 47.32,
      "costoPorKm": 0.85,
      "totalDistancia": 5000,
      "totalGalones": 105.7,
      "totalGastoCombustible": 4250
    },
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "totalRefuels": 25,
      "totalRoutes": 120
    }
  }
}
```

---

### Get Vehicle Complete Statistics
**GET** `/api/vehicles/:alias/stats`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "alias": "string",
      "marca": "string",
      "modelo": 2023,
      "plates": "string",
      "kilometrajeInicial": 0,
      "kilometrajeTotal": 15000,
      "isActive": true
    },
    "statistics": {
      "totalRoutes": 120,
      "totalRefuels": 25,
      "totalMaintenances": 5,
      "totalExpenses": 10,
      "totalDistancia": 15000
    },
    "costs": {
      "combustible": 4250.5,
      "mantenimiento": 1500,
      "gastosOtros": 800,
      "total": 6550.5,
      "costoPorKm": 0.44
    },
    "efficiency": {
      "kmPorLitro": 12.5,
      "kmPorGalon": 47.32,
      "promedioDistanciaPorRuta": 125
    }
  }
}
```

---

## Route Endpoints

### List All Routes
**GET** `/api/routes?vehicleAlias=CAR1&startDate=2024-01-01&endDate=2024-12-31`

**Auth Required:** Yes

**Query Parameters:**
- `vehicleAlias` (optional): Filter by vehicle alias
- `startDate` (optional): "YYYY-MM-DD"
- `endDate` (optional): "YYYY-MM-DD"

**Response (200):**
```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "_id": "string",
      "vehicleAlias": "CAR1",
      "vehicle": {
        "_id": "string",
        "alias": "CAR1",
        "marca": "Toyota",
        "modelo": 2023
      },
      "fecha": "2024-11-24T10:30:00.000Z",
      "distanciaRecorrida": 150.5,
      "notasAdicionales": "Viaje a la playa",
      "owner": "string",
      "isActive": true,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

### Get Route by ID
**GET** `/api/routes/:id`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": {
      "_id": "string",
      "alias": "CAR1",
      "marca": "Toyota",
      "modelo": 2023
    },
    "fecha": "2024-11-24T10:30:00.000Z",
    "distanciaRecorrida": 150.5,
    "notasAdicionales": "string",
    "owner": "string",
    "isActive": true
  }
}
```

---

### Create Route
**POST** `/api/routes`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "vehicleAlias": "string (required)",
  "distanciaRecorrida": "number (required, min: 0.1)",
  "fecha": "date (optional, default: now)",
  "notasAdicionales": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": "string",
    "fecha": "date",
    "distanciaRecorrida": 150.5,
    "notasAdicionales": "string",
    "owner": "string",
    "isActive": true
  },
  "vehicleKilometraje": 15150.5
}
```

---

### Update Route
**PUT** `/api/routes/:id`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "vehicleAlias": "string (optional)",
  "distanciaRecorrida": "number (optional)",
  "fecha": "date (optional)",
  "notasAdicionales": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "string",
    "distanciaRecorrida": 150.5,
    "fecha": "date",
    "notasAdicionales": "string"
  }
}
```

---

### Delete Route (Soft Delete)
**DELETE** `/api/routes/:id`

**Auth Required:** Yes (Write or Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Ruta eliminada correctamente",
  "vehicleKilometraje": 15000
}
```

---

## Refuel Endpoints

### List All Refuels
**GET** `/api/refuels?vehicleAlias=CAR1`

**Auth Required:** Yes

**Query Parameters:**
- `vehicleAlias` (optional): Filter by vehicle alias

**Response (200):**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "string",
      "vehicleAlias": "CAR1",
      "vehicle": {
        "_id": "string",
        "alias": "CAR1",
        "marca": "Toyota",
        "modelo": 2023
      },
      "tipoCombustible": "Premium",
      "cantidadGastada": 500,
      "galones": 10,
      "fecha": "2024-11-24T10:30:00.000Z",
      "owner": "string",
      "isActive": true,
      "precioPorGalon": "50.00",
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

### Get Refuel by ID
**GET** `/api/refuels/:id`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": {
      "_id": "string",
      "alias": "CAR1",
      "marca": "Toyota",
      "modelo": 2023
    },
    "tipoCombustible": "Premium",
    "cantidadGastada": 500,
    "galones": 10,
    "fecha": "date",
    "owner": "string",
    "isActive": true,
    "precioPorGalon": "50.00"
  }
}
```

---

### Create Refuel
**POST** `/api/refuels`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "vehicleAlias": "string (required)",
  "tipoCombustible": "string (required, enum: ['Regular', 'Premium', 'Diesel', 'Eléctrico', 'Híbrido', 'V-Power'])",
  "cantidadGastada": "number (required, min: 0)",
  "galones": "number (optional, min: 0)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": "string",
    "tipoCombustible": "Premium",
    "cantidadGastada": 500,
    "galones": 10,
    "fecha": "date",
    "owner": "string",
    "isActive": true,
    "precioPorGalon": "50.00"
  }
}
```

---

### Update Refuel
**PUT** `/api/refuels/:id`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "vehicleAlias": "string (optional)",
  "tipoCombustible": "string (optional)",
  "cantidadGastada": "number (optional)",
  "galones": "number (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "string",
    "tipoCombustible": "string",
    "cantidadGastada": 500,
    "galones": 10
  }
}
```

---

### Delete Refuel (Soft Delete)
**DELETE** `/api/refuels/:id`

**Auth Required:** Yes (Write or Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Reabastecimiento eliminado correctamente"
}
```

---

### Get Fuel Analysis by Vehicle
**GET** `/api/refuels/vehicle/:alias/analysis`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "alias": "CAR1",
      "marca": "Toyota",
      "modelo": 2023
    },
    "summary": {
      "totalReabastecimientos": "25",
      "totalGastado": "12500.50",
      "totalGalones": "250.00",
      "promedioGalonPrice": "50.00"
    },
    "porTipoCombustible": {
      "Premium": {
        "cantidad": 20,
        "gasto": 10000,
        "galones": 200
      },
      "Regular": {
        "cantidad": 5,
        "gasto": 2500,
        "galones": 50
      }
    }
  }
}
```

---

## Maintenance Endpoints

### List All Maintenance Records
**GET** `/api/maintenance?vehicleAlias=CAR1&tipo=Cambio de aceite&startDate=2024-01-01&endDate=2024-12-31&isActive=true`

**Auth Required:** Yes

**Query Parameters:**
- `vehicleAlias` (optional): Filter by vehicle alias
- `tipo` (optional): Filter by maintenance type
- `startDate` (optional): "YYYY-MM-DD"
- `endDate` (optional): "YYYY-MM-DD"
- `isActive` (optional): "true" | "false"

**Response (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "string",
      "vehicleAlias": "CAR1",
      "vehicle": {
        "_id": "string",
        "alias": "CAR1",
        "marca": "Toyota",
        "modelo": 2023
      },
      "tipo": "Cambio de aceite",
      "descripcion": "Cambio de aceite sintético 5W-30",
      "costo": 350,
      "fecha": "2024-11-24T10:30:00.000Z",
      "kilometraje": 15000,
      "proveedor": "Taller Mecánico XYZ",
      "proximoServicioFecha": "2025-05-24T00:00:00.000Z",
      "proximoServicioKm": 20000,
      "notas": "Incluye cambio de filtro",
      "owner": "string",
      "isActive": true,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

### Get Upcoming Maintenance
**GET** `/api/maintenance/upcoming`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "string",
      "vehicleAlias": "CAR1",
      "vehicle": {
        "_id": "string",
        "alias": "CAR1",
        "marca": "Toyota",
        "modelo": 2023,
        "kilometrajeTotal": 19500
      },
      "tipo": "Cambio de aceite",
      "proximoServicioFecha": "2024-12-15T00:00:00.000Z",
      "proximoServicioKm": 20000
    }
  ]
}
```

---

### Get Maintenance by ID
**GET** `/api/maintenance/:id`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": {
      "_id": "string",
      "alias": "CAR1",
      "marca": "Toyota",
      "modelo": 2023
    },
    "tipo": "Cambio de aceite",
    "descripcion": "string",
    "costo": 350,
    "fecha": "date",
    "kilometraje": 15000,
    "proveedor": "string",
    "proximoServicioFecha": "date",
    "proximoServicioKm": 20000,
    "notas": "string",
    "isActive": true
  }
}
```

---

### Create Maintenance Record
**POST** `/api/maintenance`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "vehicleAlias": "string (required)",
  "tipo": "string (required, enum: ['Cambio de aceite', 'Rotación de llantas', 'Frenos', 'Inspección', 'Reparación', 'Batería', 'Filtros', 'Transmisión', 'Suspensión', 'Alineación', 'Otro'])",
  "descripcion": "string (required)",
  "costo": "number (required, min: 0)",
  "fecha": "date (optional, default: now)",
  "kilometraje": "number (required, min: 0)",
  "proveedor": "string (optional)",
  "proximoServicioFecha": "date (optional)",
  "proximoServicioKm": "number (optional, min: 0)",
  "notas": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": "string",
    "tipo": "Cambio de aceite",
    "descripcion": "string",
    "costo": 350,
    "fecha": "date",
    "kilometraje": 15000,
    "proveedor": "string",
    "proximoServicioFecha": "date",
    "proximoServicioKm": 20000,
    "notas": "string",
    "owner": "string",
    "isActive": true
  }
}
```

---

### Update Maintenance Record
**PUT** `/api/maintenance/:id`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "tipo": "string (optional)",
  "descripcion": "string (optional)",
  "costo": "number (optional)",
  "fecha": "date (optional)",
  "kilometraje": "number (optional)",
  "proveedor": "string (optional)",
  "proximoServicioFecha": "date (optional)",
  "proximoServicioKm": "number (optional)",
  "notas": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "string",
    "tipo": "string",
    "descripcion": "string",
    "costo": 350
  }
}
```

---

### Delete Maintenance (Soft Delete)
**DELETE** `/api/maintenance/:id`

**Auth Required:** Yes (Write or Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Mantenimiento eliminado correctamente"
}
```

---

## Expense Endpoints

### List All Expenses
**GET** `/api/expenses?vehicleAlias=CAR1&categoria=Seguro&startDate=2024-01-01&endDate=2024-12-31&esDeducibleImpuestos=true&isActive=true`

**Auth Required:** Yes

**Query Parameters:**
- `vehicleAlias` (optional): Filter by vehicle alias
- `categoria` (optional): Filter by expense category
- `startDate` (optional): "YYYY-MM-DD"
- `endDate` (optional): "YYYY-MM-DD"
- `esDeducibleImpuestos` (optional): "true" | "false"
- `isActive` (optional): "true" | "false"

**Response (200):**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "string",
      "vehicleAlias": "CAR1",
      "vehicle": {
        "_id": "string",
        "alias": "CAR1",
        "marca": "Toyota",
        "modelo": 2023
      },
      "categoria": "Seguro",
      "monto": 1500,
      "descripcion": "Pago semestral del seguro de auto",
      "fecha": "2024-11-24T10:30:00.000Z",
      "esRecurrente": true,
      "frecuenciaRecurrencia": "Semestral",
      "proximoPago": "2025-05-24T00:00:00.000Z",
      "esDeducibleImpuestos": true,
      "notas": "Incluye cobertura amplia",
      "owner": "string",
      "isActive": true,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

---

### Get Expense Summary
**GET** `/api/expenses/summary?vehicleAlias=CAR1&startDate=2024-01-01&endDate=2024-12-31`

**Auth Required:** Yes

**Query Parameters:**
- `vehicleAlias` (optional): Filter by vehicle alias
- `startDate` (optional): "YYYY-MM-DD"
- `endDate` (optional): "YYYY-MM-DD"

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "_id": "Seguro",
        "totalMonto": 3000,
        "cantidad": 2
      },
      {
        "_id": "Estacionamiento",
        "totalMonto": 450,
        "cantidad": 15
      }
    ],
    "totalGastos": 3450,
    "categorias": 2
  }
}
```

---

### Get Upcoming Recurring Expenses
**GET** `/api/expenses/upcoming`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "string",
      "vehicleAlias": "CAR1",
      "vehicle": {
        "_id": "string",
        "alias": "CAR1",
        "marca": "Toyota",
        "modelo": 2023
      },
      "categoria": "Seguro",
      "monto": 1500,
      "descripcion": "string",
      "esRecurrente": true,
      "frecuenciaRecurrencia": "Semestral",
      "proximoPago": "2024-12-15T00:00:00.000Z"
    }
  ]
}
```

---

### Get Expense by ID
**GET** `/api/expenses/:id`

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": {
      "_id": "string",
      "alias": "CAR1",
      "marca": "Toyota",
      "modelo": 2023
    },
    "categoria": "Seguro",
    "monto": 1500,
    "descripcion": "string",
    "fecha": "date",
    "esRecurrente": true,
    "frecuenciaRecurrencia": "Semestral",
    "proximoPago": "date",
    "esDeducibleImpuestos": true,
    "notas": "string",
    "isActive": true
  }
}
```

---

### Create Expense
**POST** `/api/expenses`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "vehicleAlias": "string (required)",
  "categoria": "string (required, enum: ['Seguro', 'Impuestos', 'Registro', 'Estacionamiento', 'Peajes', 'Lavado', 'Multas', 'Financiamiento', 'Otro'])",
  "monto": "number (required, min: 0)",
  "descripcion": "string (required)",
  "fecha": "date (optional, default: now)",
  "esRecurrente": "boolean (optional, default: false)",
  "frecuenciaRecurrencia": "string (optional, enum: ['Mensual', 'Trimestral', 'Semestral', 'Anual'])",
  "proximoPago": "date (optional)",
  "esDeducibleImpuestos": "boolean (optional, default: false)",
  "notas": "string (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "CAR1",
    "vehicle": "string",
    "categoria": "Seguro",
    "monto": 1500,
    "descripcion": "string",
    "fecha": "date",
    "esRecurrente": true,
    "frecuenciaRecurrencia": "Semestral",
    "proximoPago": "date",
    "esDeducibleImpuestos": true,
    "notas": "string",
    "owner": "string",
    "isActive": true
  }
}
```

---

### Update Expense
**PUT** `/api/expenses/:id`

**Auth Required:** Yes (Write or Admin role)

**Request Body:**
```json
{
  "categoria": "string (optional)",
  "monto": "number (optional)",
  "descripcion": "string (optional)",
  "fecha": "date (optional)",
  "esRecurrente": "boolean (optional)",
  "frecuenciaRecurrencia": "string (optional)",
  "proximoPago": "date (optional)",
  "esDeducibleImpuestos": "boolean (optional)",
  "notas": "string (optional)"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "string",
    "vehicleAlias": "string",
    "categoria": "string",
    "monto": 1500,
    "descripcion": "string"
  }
}
```

---

### Delete Expense (Soft Delete)
**DELETE** `/api/expenses/:id`

**Auth Required:** Yes (Write or Admin role)

**Response (200):**
```json
{
  "success": true,
  "message": "Gasto eliminado correctamente"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "No autorizado - Token inválido"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "El rol read no tiene permisos para esta acción"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Resource no encontrado"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": "Demasiadas solicitudes, por favor intenta de nuevo más tarde",
  "retryAfter": 900
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Error del servidor"
}
```

---

## Enums Reference

### User Roles
- `read` - Can view data only
- `write` - Can create, update, and delete own data
- `admin` - Full access including user management

### Fuel Types (tipoCombustible)
- `Regular`
- `Premium`
- `Diesel`
- `Eléctrico`
- `Híbrido`
- `V-Power`

### Maintenance Types (tipo)
- `Cambio de aceite`
- `Rotación de llantas`
- `Frenos`
- `Inspección`
- `Reparación`
- `Batería`
- `Filtros`
- `Transmisión`
- `Suspensión`
- `Alineación`
- `Otro`

### Expense Categories (categoria)
- `Seguro`
- `Impuestos`
- `Registro`
- `Estacionamiento`
- `Peajes`
- `Lavado`
- `Multas`
- `Financiamiento`
- `Otro`

### Recurrence Frequency (frecuenciaRecurrencia)
- `Mensual`
- `Trimestral`
- `Semestral`
- `Anual`

---

## Rate Limits

- **Auth Endpoints** (`/api/auth/*`): 50 requests per 15 minutes
- **All Other Endpoints**: 100 requests per 15 minutes

When rate limit is exceeded, you'll receive a 429 status code with `retryAfter` in seconds.
