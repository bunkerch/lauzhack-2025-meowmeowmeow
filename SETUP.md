# CFF Ticket ZK - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **PostgreSQL** >= 14 (or use Docker)

## Quick Start

### 1. Install Dependencies

All packages have already been installed. If you need to reinstall:

```bash
pnpm install
```

### 2. Start PostgreSQL

#### Option A: Using Docker (Recommended)

```bash
docker-compose up -d
```

This will start a PostgreSQL container with the database pre-configured.

#### Option B: Using Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Create database
createdb cff_tickets

# Update credentials in packages/backend/.env if needed
```

### 3. Configure Environment

The backend environment file is located at `packages/backend/.env`. 
It's already configured for local development with Docker.

If using a different PostgreSQL setup, update these values:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cff_tickets
DB_USER=postgres
DB_PASSWORD=postgres
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
pnpm dev
```

This will start:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

Or start them individually:

```bash
# Start only backend
pnpm --filter @cff/backend dev

# Start only frontend
pnpm --filter @cff/frontend dev
```

## Project Structure

```
cff-ticket-frfr/
├── packages/
│   ├── backend/              # Node.js + TypeScript backend
│   │   ├── src/
│   │   │   ├── index.ts      # Main server file
│   │   │   ├── database/     # Database setup & connection
│   │   │   ├── routes/       # API routes (tickets, routes, verification)
│   │   │   └── zk/           # Zero-knowledge proof logic
│   │   └── package.json
│   │
│   └── frontend/             # React + TypeScript frontend
│       ├── src/
│       │   ├── pages/        # Page components
│       │   │   ├── HomePage.tsx
│       │   │   ├── PurchasePage.tsx
│       │   │   ├── TicketPage.tsx
│       │   │   └── ScannerPage.tsx
│       │   ├── App.tsx       # Main app component
│       │   └── main.tsx      # Entry point
│       └── package.json
│
├── package.json              # Root package (monorepo)
├── pnpm-workspace.yaml       # Workspace configuration
├── docker-compose.yml        # PostgreSQL container
└── README.md
```

## Features

### 🎫 Ticket Purchase
- Browse available train routes
- Select ticket type (Single, Day Pass, Return)
- Choose travel date
- Receive ZK-proof protected ticket

### 🔒 Zero-Knowledge Proofs
- Tickets are protected using ZK-SNARKs (simulated with Poseidon hash for POC)
- No personal data stored in the database
- Only cryptographic proofs and public signals

### ✅ Scanner Verification
- Scanners can verify tickets via QR code
- Verification happens without revealing personal information
- Instant cryptographic proof validation

## API Endpoints

### Routes
- `GET /api/routes` - Get all available routes
- `GET /api/routes/:id` - Get specific route

### Tickets
- `POST /api/tickets/purchase` - Purchase a new ticket
- `GET /api/tickets/:id` - Get ticket details

### Verification
- `POST /api/verify` - Verify ticket with proof
- `POST /api/verify/scan` - Scanner verification endpoint

## Database Schema

### Routes Table
```sql
- id (SERIAL PRIMARY KEY)
- origin (VARCHAR)
- destination (VARCHAR)
- price (DECIMAL)
- duration_minutes (INTEGER)
- created_at (TIMESTAMP)
```

### Tickets Table
```sql
- id (UUID PRIMARY KEY)
- route_id (INTEGER FK)
- ticket_type (VARCHAR)
- valid_from (TIMESTAMP)
- valid_until (TIMESTAMP)
- proof_data (JSONB)        # ZK proof
- public_signals (JSONB)    # Public signals for verification
- is_used (BOOLEAN)
- created_at (TIMESTAMP)
- used_at (TIMESTAMP)
```

## Zero-Knowledge Proof System

### Current Implementation (POC)
For this proof-of-concept, we use:
- **Poseidon Hash** from circomlibjs for commitments
- **Mock Groth16 Proofs** with proper structure
- **Public Signals** that allow verification without revealing private data

### What's Proven
The ZK proof demonstrates:
- ✅ Ticket was legitimately purchased
- ✅ Ticket is valid for the specified time period
- ✅ Ticket matches the claimed route
- ✅ Without revealing any personal information

### Production Implementation
For production, you would:
1. Create Circom circuits defining the proof logic
2. Compile circuits to generate proving/verification keys
3. Use snarkjs to generate real ZK-SNARK proofs
4. Verify proofs using the verification key

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development (both frontend & backend)
pnpm dev

# Build all packages
pnpm build

# Clean build artifacts
pnpm clean

# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# Backend only
pnpm --filter @cff/backend dev
pnpm --filter @cff/backend build

# Frontend only
pnpm --filter @cff/frontend dev
pnpm --filter @cff/frontend build
```

## Testing the System

### 1. Purchase a Ticket
1. Navigate to http://localhost:5173
2. Click "Buy Tickets Now" or go to "/purchase"
3. Select a route (e.g., Zürich HB → Bern)
4. Choose ticket type
5. Select travel date
6. Click "Confirm Purchase"

### 2. View Your Ticket
- After purchase, you'll be redirected to the ticket page
- A QR code will be displayed
- Copy the Ticket ID for verification

### 3. Verify with Scanner
1. Navigate to "/scanner"
2. Paste the Ticket ID
3. Click "Verify Ticket"
4. See instant verification result

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker-compose ps

# Or if using local PostgreSQL
psql -U postgres -c "SELECT version();"

# Restart database
docker-compose restart
```

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Check what's using port 5173
lsof -i :5173

# Kill the process if needed
kill -9 <PID>
```

### Clear and Reinstall
```bash
# Remove all node_modules
pnpm -r clean
rm -rf node_modules

# Reinstall
pnpm install
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **ZK Proofs**: snarkjs, circomlibjs (Poseidon hash)
- **UI Icons**: Lucide React
- **QR Codes**: qrcode.react
- **Package Manager**: pnpm (workspaces)

## Security Notes

⚠️ **This is a POC (Proof of Concept)**

- No real payment processing
- Simplified ZK proof implementation
- No authentication/authorization
- Not production-ready

For production use, implement:
- Real ZK-SNARK circuits with Circom
- Proper key management
- Authentication & authorization
- Rate limiting
- Input validation & sanitization
- HTTPS/TLS
- Payment gateway integration

## Next Steps

To enhance this POC:

1. **Implement Real ZK Circuits**
   - Create Circom circuits for ticket validation
   - Generate proper proving/verification keys
   - Use snarkjs for actual proof generation

2. **Add Authentication**
   - User accounts (optional, privacy-preserving)
   - API key authentication for scanners

3. **Enhanced Features**
   - Multiple ticket classes (1st/2nd class)
   - Seat reservations (with privacy)
   - Mobile app with camera QR scanning
   - Offline verification capability

4. **Production Hardening**
   - Add comprehensive tests
   - Implement proper error handling
   - Add monitoring & logging
   - Set up CI/CD pipeline

## License

MIT

## Support

For questions or issues, please check the README.md or create an issue in the repository.

