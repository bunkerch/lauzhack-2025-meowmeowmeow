# Zod Validation Implementation

This document describes the comprehensive Zod validation implementation across the CFF Ticket platform.

## Overview

Zod validation has been added to all schemas, API requests, and responses throughout the application to ensure type safety and data integrity.

## Backend Validation

### Schema File
**Location**: `packages/backend/src/schemas/validation.ts`

#### Schemas Defined:
1. **ProofSchema** - Validates zero-knowledge proof structure
   - `pi_a`: Array of 3 strings
   - `pi_b`: Array of 3 arrays (each containing 2 strings)
   - `pi_c`: Array of 3 strings
   - `protocol`: Must be "groth16"
   - `curve`: Must be "bn128"

2. **PublicSignalsSchema** - Validates public signals array
   - Array of strings with minimum 1 element

3. **PurchaseTicketRequestSchema** - Validates ticket purchase requests
   - `routeId`: Positive integer
   - `ticketType`: Enum ['single', 'day', 'return']
   - `travelDate`: Date or datetime string

4. **VerifyTicketRequestSchema** - Validates ticket verification requests
   - `ticketId`: UUID string
   - `proof`: ProofSchema
   - `publicSignals`: PublicSignalsSchema

5. **ScanTicketRequestSchema** - Validates QR code scanning requests
   - `ticketId`: UUID string
   - `proof`: ProofSchema
   - `publicSignals`: PublicSignalsSchema
   - `validFrom`: Date or datetime string
   - `validUntil`: Date or datetime string
   - `routeId`: Positive integer
   - `offline`: Optional boolean

6. **VerifyOfflineRequestSchema** - Validates offline verification requests
   - `proof`: ProofSchema
   - `publicSignals`: PublicSignalsSchema
   - `validFrom`: Date or datetime string
   - `validUntil`: Date or datetime string

7. **RouteIdParamSchema** - Validates route ID URL parameters
   - String containing digits, transformed to number

8. **TicketIdParamSchema** - Validates ticket ID URL parameters
   - UUID string

### API Routes with Validation

#### 1. Ticket Routes (`packages/backend/src/routes/tickets.ts`)
- **POST /api/tickets/purchase**
  - Validates: `PurchaseTicketRequestSchema`
  - Returns 400 with error details on validation failure

- **GET /api/tickets/:id**
  - Validates: `TicketIdParamSchema`
  - Returns 400 with error details on invalid UUID

#### 2. Verification Routes (`packages/backend/src/routes/verification.ts`)
- **POST /api/verify**
  - Validates: `VerifyTicketRequestSchema`
  - Returns 400 with error details on validation failure

- **POST /api/verify/scan**
  - Validates: `ScanTicketRequestSchema`
  - Returns 400 with error details on validation failure

- **POST /api/verify/verify-offline**
  - Validates: `VerifyOfflineRequestSchema`
  - Returns 400 with error details on validation failure

#### 3. Route Routes (`packages/backend/src/routes/routes.ts`)
- **GET /api/routes/:id**
  - Validates: `RouteIdParamSchema`
  - Returns 400 with error details on invalid route ID

## Frontend Validation

### Schema File
**Location**: `packages/frontend/src/schemas/validation.ts`

#### Schemas Defined:
1. **ProofSchema** - Same as backend proof validation

2. **PublicSignalsSchema** - Same as backend public signals validation

3. **QRCodeDataSchema** - Validates QR code data structure
   - `ticketId`: UUID string
   - `proof`: ProofSchema
   - `publicSignals`: PublicSignalsSchema
   - `validFrom`: Date or datetime string
   - `validUntil`: Date or datetime string
   - `routeId`: Non-negative integer

4. **RouteSchema** - Validates route data
   - `id`: Positive integer
   - `origin`: Non-empty string
   - `destination`: Non-empty string
   - `price`: String
   - `durationMinutes`: Positive integer (camelCase from Drizzle ORM)
   - `createdAt`: Optional nullable date/string

5. **TicketSchema** - Validates ticket data
   - `id`: UUID string
   - `route`: Object with origin and destination
   - `routeId`: Optional non-negative integer
   - `ticketType`: Enum ['single', 'day', 'return']
   - `validFrom`: Date or datetime string
   - `validUntil`: Date or datetime string
   - `price`: String
   - `isUsed`: Boolean
   - `proof`: ProofSchema
   - `publicSignals`: PublicSignalsSchema

6. **ScanResultSchema** - Validates scan verification results
   - `valid`: Boolean
   - `message`: String
   - `verificationMethod`: Optional enum ['offline-browser', 'offline', 'online', 'offline-fallback']
   - `warning`: Optional string
   - `ticket`: Optional object with route info
   - `error`: Optional string

7. **PurchaseResponseSchema** - Validates ticket purchase responses
   - `ticket`: Object with complete ticket information
   - `proof`: ProofSchema
   - `publicSignals`: PublicSignalsSchema

### Pages with Validation

#### 1. ScannerPage (`packages/frontend/src/pages/ScannerPage.tsx`)
- **QR Code Parsing**
  - Validates: `QRCodeDataSchema`
  - Shows user-friendly error on invalid QR code structure
  - Validates QR code before online or offline verification

- **API Response Validation**
  - Validates: `ScanResultSchema`
  - Validates response from `/api/verify/scan`
  - Falls back to offline verification on network error

#### 2. PurchasePage (`packages/frontend/src/pages/PurchasePage.tsx`)
- **Routes List**
  - Validates: `Array<RouteSchema>`
  - Validates routes fetched from `/api/routes`
  - Shows error if route data is invalid

- **Purchase Response**
  - Validates: `PurchaseResponseSchema`
  - Validates response from `/api/tickets/purchase`
  - Shows error if response data is invalid

#### 3. TicketPage (`packages/frontend/src/pages/TicketPage.tsx`)
- **Ticket Data**
  - Validates: `TicketSchema`
  - Validates ticket data from `/api/tickets/:id`
  - Shows error if ticket data is invalid

#### 4. zkVerifier Utility (`packages/frontend/src/utils/zkVerifier.ts`)
- **verifyTicketOffline Function**
  - Now accepts: `QRCodeData` type
  - Ensures type safety for offline verification

## Benefits

### 1. **Type Safety**
- All API requests and responses are validated at runtime
- TypeScript types are inferred from Zod schemas
- Eliminates type mismatches between frontend and backend

### 2. **Data Integrity**
- Ensures QR codes contain all required fields
- Validates proof structure before cryptographic operations
- Prevents invalid data from reaching business logic

### 3. **Security**
- Validates UUID formats for IDs
- Ensures proof data matches expected structure
- Prevents injection attacks through strict validation

### 4. **Error Handling**
- Detailed error messages for validation failures
- User-friendly error messages in frontend
- Debugging information in console for developers

### 5. **Maintainability**
- Single source of truth for data structures
- Easy to update validation rules
- Self-documenting schemas

## Error Response Format

All validation errors return a consistent format:

```json
{
  "error": "Invalid request data",
  "details": {
    "_errors": [],
    "fieldName": {
      "_errors": ["Error message"]
    }
  }
}
```

## Testing

To test the validation:

1. **Backend**: Send invalid data to any endpoint
   ```bash
   curl -X POST http://localhost:3000/api/tickets/purchase \
     -H "Content-Type: application/json" \
     -d '{"routeId": "invalid"}'
   ```

2. **Frontend**: Try scanning an invalid QR code
   - Paste incomplete JSON in scanner
   - Paste JSON with wrong field types
   - Paste JSON with missing required fields

## Future Enhancements

- Add custom error messages for better UX
- Add validation for specific date ranges
- Add rate limiting validation
- Add request size validation
- Add custom validators for business rules

