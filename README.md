# CFF Ticket ZK - Zero-Knowledge Train Ticket Platform

A proof-of-concept e-commerce platform for SBB CFF FFS that allows users to buy train tickets protected by zero-knowledge proofs, without storing personal data.

## Features

- 🎫 **Buy Train Tickets**: Browse and purchase train tickets
- 🔒 **Zero-Knowledge Proofs**: Tickets are protected using ZK-SNARKs without storing personal data
- ✅ **Scanner Verification**: Scanners can verify tickets without accessing personal information
- 💳 **POC Payment**: Simplified payment confirmation for demonstration

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL + Drizzle ORM
- **ZK Proofs**: snarkjs + circom

## Project Structure

```
cff-ticket-frfr/
├── packages/
│   ├── frontend/     # React TypeScript frontend
│   ├── backend/      # Node.js TypeScript backend
│   └── circuits/     # Circom ZK circuits
├── package.json
└── pnpm-workspace.yaml
```

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

- **Frontend**: http://localhost:5173
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
pnpm dev              # Start both frontend and backend
pnpm frontend         # Start only frontend
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

- **[GETTING_STARTED.md](GETTING_STARTED.md)** - Quick start guide (START HERE!)
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture deep dive
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview

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

