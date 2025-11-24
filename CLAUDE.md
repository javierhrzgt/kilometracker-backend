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

**User** → owns → **Vehicle** → contains → **Route** and **Refuel**

- All models include `owner` field referencing User
- Vehicle has `alias` (unique uppercase identifier) instead of _id for routes
- Routes and Refuels reference both `vehicle` (ObjectId) and `vehicleAlias` (String)
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

Routes have compound index on `vehicle` and `fecha` for efficient queries (models/Route.js:39).

## Password Security

User passwords hashed with bcrypt (cost factor: 12) via Mongoose pre-save hook. Always use `select('+password')` when retrieving for authentication since password field has `select: false`.
