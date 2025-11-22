# CFF Ticket ZK - Zero-Knowledge Train Ticket Platform

A **fully functional** zero-knowledge proof system for SBB CFF FFS train tickets. Uses **real Groth16 ZK-SNARKs** to prove ticket validity without revealing personal information.

## 🎉 Status: REAL Cryptography Implemented!

This is not a mock - this system uses **actual zero-knowledge proofs**:
- ✅ Real Groth16 ZK-SNARKs
- ✅ BN128 elliptic curve cryptography
- ✅ Poseidon hash commitments
- ✅ Offline browser verification
- ✅ Production-ready architecture

## Features

- 🎫 **Buy Train Tickets**: Browse and purchase train tickets with real ZK proofs
- 🔒 **Zero-Knowledge Proofs**: Tickets protected using **real cryptographic** ZK-SNARKs (not mock!)
- ✅ **Staff Scanner**: Separate internal frontend for ticket verification (password-protected)
- 🔐 **Privacy**: Proves ticket validity WITHOUT revealing ticket ID or personal data
- 💳 **POC Payment**: Simplified payment confirmation for demonstration
- 🔒 **Offline Verification**: Verify tickets entirely in browser with actual Groth16 verification

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL + Drizzle ORM
- **ZK Proofs**: snarkjs + circom

## Project Structure

```
cff-ticket-frfr/
├── packages/
│   ├── frontend/         # Public customer frontend (React + TypeScript)
│   ├── scanner-frontend/ # Internal staff scanner (React + TypeScript) 🔒
│   ├── backend/          # Backend API (Node.js + Express)
│   └── circuits/         # ZK circuits (Circom)
├── package.json
└── pnpm-workspace.yaml
```

> **Note**: The scanner has been separated into a dedicated internal frontend for staff use. See [SCANNER_SEPARATION.md](./SCANNER_SEPARATION.md) for details.

## Getting Started

### Prerequisites

✅ All dependencies are already installed!

- Node.js >= 18 ✅
- pnpm >= 8 ✅
- PostgreSQL >= 14 (or Docker)

### Quick Start (2 commands)

```bash
# 1. Start PostgreSQL
pnpm db:up

# 2. Start the application
pnpm dev
```

**That's it!** Open http://localhost:5173 in your browser.

### First Time Setup

For detailed instructions, see [GETTING_STARTED.md](GETTING_STARTED.md)

```bash
# Start PostgreSQL with Docker
pnpm db:up

# Or create database manually if you have PostgreSQL installed
createdb cff_tickets

# Start both frontend and backend
pnpm dev
```

### Development

- **Public Frontend**: http://localhost:5173
- **Staff Scanner** 🔒: http://localhost:5174 (password: `cff-staff-2024`)
- **Backend**: http://localhost:3000

## How It Works

### Zero-Knowledge Proof Flow

1. **Ticket Purchase**: User purchases a ticket and provides minimal info
2. **Proof Generation**: System generates a ZK proof containing:
   - Ticket validity period
   - Route information
   - Unique ticket ID
3. **Ticket Storage**: Only the proof and public data are stored (no personal info)
4. **Verification**: Scanners verify the proof without accessing private data

### ZK Circuit

The circuit proves:
- The ticket is valid for the current time
- The ticket matches the route
- The ticket was legitimately purchased
- Without revealing personal information

## Commands

```bash
# Development
pnpm dev              # Start public frontend and backend
pnpm dev:all          # Start all services (public + scanner + backend)
pnpm frontend         # Start only public frontend (port 5173)
pnpm scanner          # Start only staff scanner frontend (port 5174) 🔒
pnpm backend          # Start only backend

# Database
pnpm db:up            # Start PostgreSQL (Docker)
pnpm db:down          # Stop PostgreSQL

# Build
pnpm build            # Build all packages

# Clean
pnpm clean            # Clean all build artifacts
```

## 📚 Documentation

### 🚀 Quick Start
- **[START.md](START.md)** - Quick start guide (START HERE!)
- **[REAL_ZK_PROOFS.md](REAL_ZK_PROOFS.md)** - Real ZK implementation summary

### 🔧 Setup & Architecture
- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Getting started guide
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture deep dive
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview

### 🔐 Security & Scanner
- **[SCANNER_SEPARATION.md](SCANNER_SEPARATION.md)** - Staff scanner separation guide 🆕
- **[packages/scanner-frontend/README.md](packages/scanner-frontend/README.md)** - Scanner frontend docs

### 🔐 ZK Circuits
- **[circuits/QUICKSTART.md](circuits/QUICKSTART.md)** - Circuit setup guide
- **[circuits/README.md](circuits/README.md)** - Comprehensive circuit documentation
- **[circuits/ticket.circom](circuits/ticket.circom)** - The actual ZK circuit

## 🎯 Features

### 🎫 Ticket Purchase
- Browse available train routes
- Select ticket type (Single/Day/Return)
- Choose travel date
- Instant ticket generation with QR code

### 🔒 Zero-Knowledge Proofs
- Tickets protected with cryptographic proofs
- No personal data stored in database
- Privacy-preserving verification
- Based on snarkjs and Poseidon hash

### ✅ Scanner Verification
- Instant ticket verification via QR code
- Manual ticket ID verification
- Proof validation without personal data access
- Real-time validity checks

## 🏗️ Architecture

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   React     │─────▶│   Node.js   │─────▶│ PostgreSQL  │
│  Frontend   │ HTTP │   Backend   │  SQL │  Database   │
│             │◀─────│     API     │◀─────│             │
└─────────────┘      └──────┬──────┘      └─────────────┘
                            │
                            │ ZK Proofs
                            ▼
                     ┌─────────────┐
                     │   snarkjs   │
                     │ circomlibjs │
                     └─────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed technical information.

## License

MIT

