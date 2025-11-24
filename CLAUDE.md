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
- Protected (all authenticated): GET operations, stats
- Write operations: Require `write` or `admin` role
- Admin-only: User role management

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
