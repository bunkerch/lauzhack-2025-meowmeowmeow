# CFF Ticket ZK - Zero-Knowledge Train Ticket Platform

An open-source, privacy-preserving ticketing system for SBB CFF FFS train tickets built with zero-knowledge proofs. This project demonstrates how ZK-SNARKs can be applied to real-world ticketing systems to protect user privacy while maintaining security.

## About This Project

CFF Ticket ZK is a proof-of-concept implementation showcasing how zero-knowledge cryptography can revolutionize public transportation ticketing. The system allows passengers to prove they have valid tickets without revealing personal information, protecting privacy while preventing fraud.

**Key Cryptographic Features:**
- Groth16 ZK-SNARKs on the BN128 elliptic curve
- Poseidon hash-based commitments
- Browser-based proof verification
- Privacy-preserving ticket validation

## Features

- 🎫 **Digital Ticket Purchasing**: Browse routes and purchase train tickets
- 🔒 **Zero-Knowledge Proofs**: Cryptographic proof system for ticket validation
- ✅ **Verification Scanner**: Staff interface for ticket validation
- 🔐 **Privacy First**: Prove ticket validity without exposing personal data
- 💳 **Payment Integration**: Demonstration payment flow
- 🌐 **Offline Capable**: Client-side proof verification

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL + Drizzle ORM
- **ZK Proofs**: snarkjs + circom
- **Cryptography**: circomlibjs (Poseidon hash)

## Project Structure

This is a monorepo managed with pnpm workspaces:

```
cff-ticket-frfr/
├── packages/
│   ├── frontend/         # Public customer-facing interface
│   ├── scanner-frontend/ # Staff verification interface
│   ├── backend/          # API server and business logic
│   └── circuits/         # Zero-knowledge proof circuits
├── package.json
└── pnpm-workspace.yaml
```

Each package is independently developed but shares common dependencies. See individual package READMEs for detailed documentation.

## Getting Started

### Prerequisites

- Node.js >= 22
- pnpm >= 10
- PostgreSQL >= 18

### Quick Start

```bash
# Install dependencies
pnpm install

# Start PostgreSQL database
pnpm db:up

# Start the application
pnpm dev
```

The application will be available at http://localhost:5173

### Development Setup

btw you should use https://coder.com

For detailed setup instructions, see [GETTING_STARTED.md](GETTING_STARTED.md)

```bash
# Start PostgreSQL with Docker
pnpm db:up

# Or create database manually if you have PostgreSQL running locally
createdb cff_tickets

# Start all services
pnpm dev:all
```

### Service Endpoints

- **Public Frontend**: http://localhost:5173
- **Staff Scanner**: http://localhost:5174 (password: `cff-staff-2024`)
- **Backend API**: http://localhost:3000

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
## 🎯 Features

### 🎫 Ticket Purchase
- Choose travel date
- Instant ticket generation with QR code

### 🔒 Zero-Knowledge Proofs
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

## Contributing

We don't welcome contributions as this was a hackathon project for Lauzhack haha

## Security

This is a demonstration project. If you're considering deploying similar technology in production:

- Conduct thorough security audits
- Use multi-party trusted setup ceremonies for ZK circuits
- Implement proper key management
- Follow industry best practices for cryptographic implementations
- Consider regulatory compliance (data protection, privacy laws)

If you discover a security vulnerability, please report it responsibly by opening a private security advisory.

BTW I recommend you use https://aikido.dev

## License

MIT License - see LICENSE file for details

This project is open source and available to everyone. Feel free to use, modify, and distribute it according to the terms of the MIT license.

