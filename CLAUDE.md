# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a REST API for the Kilometracker vehicle management application. It tracks vehicles, routes (trips), and refuels with user authentication and role-based authorization.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start
```

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRE`: Token expiration time (e.g., "7d")
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode

## Architecture

### Authentication Flow

- JWT-based authentication using Bearer tokens
- User roles: `read`, `write`, `admin`
- Auth middleware (`middleware/auth.js`) exports:
  - `protect`: Validates JWT token and attaches user to `req.user`
  - `authorize(...roles)`: Role-based access control middleware

### Data Model Relationships

**User** → owns → **Vehicle** → contains → **Route**, **Refuel**, **Maintenance**, and **Expense**

- All models include `owner` field referencing User
- All models use soft delete pattern with `isActive` field (default: true)
- Vehicle has `alias` (unique uppercase identifier) instead of _id for routes
- Routes, Refuels, Maintenance, and Expenses reference both `vehicle` (ObjectId) and `vehicleAlias` (String)
- Vehicle `kilometrajeTotal` is automatically updated when routes are created/updated/deleted

### Key Business Logic

**Vehicle Lifecycle:**
- Soft delete pattern: `isActive` flag instead of actual deletion
- `kilometrajeTotal` initialized from `kilometrajeInicial` on creation (see Vehicle model pre-save hook at models/Vehicle.js:53)
- Queries can filter by `isActive` or return all vehicles

**Route Management:**
- Creating a route increments vehicle's `kilometrajeTotal` (routes/routesVehicle.js:95)
- Updating a route recalculates distance difference and updates vehicle (routes/routesVehicle.js:155-160)
- Deleting a route decrements vehicle's `kilometrajeTotal` (routes/routesVehicle.js:200)
- Only active vehicles can have new routes created

**Refuel Tracking:**
- Virtual field `precioPorGalon` calculated from `cantidadGastada / galones`
- Virtuals enabled in JSON/Object responses (models/Refuel.js:48-49)
- Soft delete: DELETE sets `isActive` to false instead of removing document

**Maintenance Tracking:**
- Track service types: oil changes, tire rotations, brakes, inspections, repairs, etc.
- Record cost, date, kilometraje, and service provider
- Support for scheduled maintenance with `proximoServicioFecha` and `proximoServicioKm`
- GET /api/maintenance/upcoming returns maintenance due within 30 days or 500km

**Expense Management:**
- Additional expense categories beyond fuel: insurance, taxes, parking, tolls, etc.
- Support for recurring expenses with frequency (monthly, quarterly, etc.)
- Flag tax-deductible expenses with `esDeducibleImpuestos`
- GET /api/expenses/summary provides aggregated spending by category
- GET /api/expenses/upcoming shows recurring expenses due in next 30 days

### API Response Format

All responses follow this structure:
```javascript
{
  success: true/false,
  data: {...},        // on success
  error: "message",   // on failure
  count: number       // for list endpoints
}
```

### Route Protection Patterns

- Public: `/api/auth/register`, `/api/auth/login`
- Protected (all authenticated): GET operations, stats, password change
- Write operations: Require `write` or `admin` role
- Admin-only: User management (list users, view user details, update roles, deactivate/reactivate users)

### User Management (Admin Endpoints)

**List All Users:**
- `GET /api/auth/users?isActive=true` - Filter by active status (optional)
- Returns all users sorted by creation date (newest first)

**View Specific User:**
- `GET /api/auth/users/:id` - Get user details by ID

**Update User Role:**
- `PUT /api/auth/users/:id/role` - Body: `{ role: "read" | "write" | "admin" }`

**Deactivate User:**
- `DELETE /api/auth/users/:id` - Soft delete (sets isActive to false)
- Prevents admins from deactivating themselves

**Reactivate User:**
- `PATCH /api/auth/users/:id/reactivate` - Restores isActive to true

### Password Management

**Change Password:**
- `PUT /api/auth/updatepassword` - Any authenticated user
- Body: `{ currentPassword: string, newPassword: string }`
- Validates current password before allowing change
- Enforces minimum 6 character length

### Fuel Efficiency Analytics

**Fuel Efficiency Endpoint:**
- `GET /api/vehicles/:alias/fuel-efficiency?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- Calculates km/liter and km/gallon based on refuels and routes
- Calculates cost per kilometer
- Supports date range filtering

**Enhanced Vehicle Statistics:**
- `GET /api/vehicles/:alias/stats` - Comprehensive vehicle analytics
- Returns totals for routes, refuels, maintenance, and expenses
- Breakdown of costs by category (fuel, maintenance, other expenses)
- Efficiency metrics (km/liter, km/gallon, average distance per route)
- Total cost of ownership and cost per kilometer

### Maintenance & Expense Endpoints

**Maintenance:**
- `GET /api/maintenance` - List all maintenance records (filter by vehicleAlias, tipo, date range)
- `GET /api/maintenance/upcoming` - Maintenance due within 30 days or 500km
- `GET /api/maintenance/:id` - Get specific maintenance record
- `POST /api/maintenance` - Create maintenance record
- `PUT /api/maintenance/:id` - Update maintenance record
- `DELETE /api/maintenance/:id` - Soft delete maintenance record

**Expenses:**
- `GET /api/expenses` - List all expenses (filter by vehicleAlias, categoria, date range, tax deductible)
- `GET /api/expenses/summary` - Aggregated spending by category
- `GET /api/expenses/upcoming` - Recurring expenses due in next 30 days
- `GET /api/expenses/:id` - Get specific expense
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Soft delete expense

## Common Patterns

### Finding Vehicles
Always use uppercase alias: `Vehicle.findOne({ alias: alias.toUpperCase(), owner: req.user.id })`

### Query Filtering
Routes support filtering by:
- `vehicleAlias`: Filter by vehicle
- `startDate`, `endDate`: Date range for `fecha` field
- All results sorted by `fecha: -1` (newest first)

### Error Handling
Global error middleware in server.js:27-33 catches all errors. Route handlers return status codes:
- 400: Bad request / validation errors
- 401: Unauthorized / invalid credentials
- 403: Forbidden / insufficient role
- 404: Resource not found
- 500: Server errors

## Database Indexes

- Routes: Compound index on `vehicle` and `fecha` (models/Route.js:43)
- Maintenance: Compound indexes on `vehicle + fecha` and `vehicle + tipo` (models/Maintenance.js:68-69)
- Expenses: Compound indexes on `vehicle + fecha`, `vehicle + categoria`, and `owner + esDeducibleImpuestos` (models/Expense.js:61-63)

## API Improvements

### Rate Limiting

Rate limiting is applied to prevent abuse:
- General API rate limit: 100 requests per 15 minutes (middleware/rateLimiter.js)
- Auth endpoints: 5 requests per 15 minutes (stricter for login/register)
- Returns 429 status with `retryAfter` seconds when limit exceeded
- In-memory implementation (clears old entries every hour)

### Soft Delete Pattern

All main entities (User, Vehicle, Route, Refuel, Maintenance, Expense) use soft delete:
- DELETE operations set `isActive: false` instead of removing documents
- Allows data recovery and maintains referential integrity
- List endpoints can filter by `?isActive=true` or `?isActive=false`
- Stats endpoints typically filter for active records only

### Pagination Utility

Pagination helper available in `utils/pagination.js`:
- `paginate(query, page, limit)` - Apply pagination to Mongoose query
- `getPaginationData(total, page, limit)` - Generate pagination metadata
- Default limit: 10, max limit: 100
- Returns: total, page, limit, totalPages, hasNextPage, hasPrevPage, nextPage, prevPage

## Password Security

User passwords hashed with bcrypt (cost factor: 12) via Mongoose pre-save hook. Always use `select('+password')` when retrieving for authentication since password field has `select: false`.
