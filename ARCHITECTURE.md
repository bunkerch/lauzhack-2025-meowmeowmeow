# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                   (React + TypeScript)                       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Purchase   │  │    Ticket    │  │   Scanner    │       │
│  │     Page     │  │     Page     │  │     Page     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  Features:                                                    │
│  - Route browsing & ticket purchase                          │
│  - QR code generation & display                              │
│  - Scanner verification interface                            │
│  - Zero-knowledge proof visualization                        │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP/JSON
                        │ REST API
┌───────────────────────▼─────────────────────────────────────┐
│                         Backend                              │
│                  (Node.js + Express)                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  API Routes                           │   │
│  │  • /api/routes  - Train routes                       │   │
│  │  • /api/tickets - Ticket management                  │   │
│  │  • /api/verify  - ZK proof verification              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              ZK Proof System                          │   │
│  │  • Proof generation (Poseidon hash)                  │   │
│  │  • Proof verification                                │   │
│  │  • Public signals management                         │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ PostgreSQL
                        │ Protocol
┌───────────────────────▼─────────────────────────────────────┐
│                       Database                               │
│                     (PostgreSQL)                             │
│                                                               │
│  ┌─────────────┐          ┌─────────────┐                   │
│  │   Routes    │          │   Tickets   │                   │
│  ├─────────────┤          ├─────────────┤                   │
│  │ id          │          │ id          │                   │
│  │ origin      │◄─────────┤ route_id    │                   │
│  │ destination │          │ ticket_type │                   │
│  │ price       │          │ valid_from  │                   │
│  │ duration    │          │ valid_until │                   │
│  └─────────────┘          │ proof_data  │ ◄── ZK Proof      │
│                           │ pub_signals │ ◄── Public Data   │
│                           │ is_used     │                   │
│                           └─────────────┘                   │
│                                                               │
│  Note: NO personal data stored!                              │
└─────────────────────────────────────────────────────────────┘
```

## Zero-Knowledge Proof Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    1. Ticket Purchase                         │
│                                                               │
│  User selects:                                                │
│  • Route (Zürich → Bern)                                     │
│  • Ticket type (Single/Day/Return)                           │
│  • Travel date                                               │
│                                                               │
│  ❌ No personal info required                                │
│  ❌ No payment details stored                                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  2. ZK Proof Generation                       │
│                                                               │
│  Backend generates:                                           │
│                                                               │
│  Private Inputs:                                              │
│  • Ticket ID (UUID)                                          │
│  • Route ID                                                  │
│  • Valid from timestamp                                      │
│  • Valid until timestamp                                     │
│                                                               │
│  ↓ Poseidon Hash                                             │
│                                                               │
│  Commitment = Hash(ticketId, routeId, validFrom, validUntil) │
│                                                               │
│  Public Outputs:                                              │
│  • Commitment                                                │
│  • Route ID (public)                                         │
│  • Validity timestamps (public)                              │
│                                                               │
│  ZK Proof:                                                    │
│  • pi_a, pi_b, pi_c (Groth16 structure)                     │
│  • Protocol: "groth16"                                       │
│  • Curve: "bn128"                                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   3. Database Storage                         │
│                                                               │
│  Stored in database:                                          │
│  ✅ Ticket ID                                                │
│  ✅ Route reference                                          │
│  ✅ Validity period                                          │
│  ✅ ZK Proof (JSON)                                          │
│  ✅ Public signals                                           │
│                                                               │
│  ❌ NO personal information                                  │
│  ❌ NO payment details                                       │
│  ❌ NO user identity                                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    4. Ticket Display                          │
│                                                               │
│  User receives:                                               │
│  • Ticket with QR code                                       │
│  • QR contains: {ticketId, proof, publicSignals}            │
│  • Visual ticket details                                     │
│  • Proof data (optional technical view)                      │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  5. Scanner Verification                      │
│                                                               │
│  Scanner scans QR code:                                       │
│  • Extracts ticket ID                                        │
│  • Sends verification request                                │
│                                                               │
│  Backend verifies:                                            │
│  1. Ticket exists in database                                │
│  2. Ticket not already used                                  │
│  3. Current time within validity period                      │
│  4. ZK proof is structurally valid                          │
│  5. Public signals match stored data                         │
│                                                               │
│  Verification happens WITHOUT:                                │
│  ❌ Accessing personal information                           │
│  ❌ Revealing private inputs                                 │
│  ❌ Compromising user privacy                                │
│                                                               │
│  Returns: ✅ Valid or ❌ Invalid                             │
└──────────────────────────────────────────────────────────────┘
```

## Data Privacy Model

### What Gets Stored
```typescript
interface StoredTicket {
  id: string;              // UUID (ticket identifier)
  route_id: number;        // Reference to route
  ticket_type: string;     // 'single' | 'day' | 'return'
  valid_from: timestamp;   // Start of validity
  valid_until: timestamp;  // End of validity
  proof_data: {            // Zero-knowledge proof
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: 'groth16';
    curve: 'bn128';
  };
  public_signals: string[]; // Public verification data
  is_used: boolean;         // Usage flag
  created_at: timestamp;
  used_at?: timestamp;
}
```

### What NEVER Gets Stored
- ❌ User name
- ❌ Email address
- ❌ Phone number
- ❌ Payment information
- ❌ Credit card details
- ❌ Billing address
- ❌ Personal identification
- ❌ Travel history linkable to identity

## Component Architecture

### Frontend Components

```
src/
├── App.tsx                 # Main application & routing
├── pages/
│   ├── HomePage.tsx        # Landing page with features
│   ├── PurchasePage.tsx    # Ticket purchase flow
│   ├── TicketPage.tsx      # Display ticket & QR code
│   └── ScannerPage.tsx     # Verification interface
└── index.css               # Global styles
```

### Backend Routes

```
src/
├── index.ts                # Express server setup
├── routes/
│   ├── routes.ts           # GET /api/routes
│   ├── tickets.ts          # POST /api/tickets/purchase
│   │                       # GET  /api/tickets/:id
│   └── verification.ts     # POST /api/verify
│                           # POST /api/verify/scan
├── database/
│   └── init.ts             # Database initialization
└── zk/
    ├── proof-generator.ts  # Generate ZK proofs
    └── proof-verifier.ts   # Verify ZK proofs
```

## Security Considerations

### Current Implementation (POC)
- ✅ No personal data storage
- ✅ ZK proof structure
- ✅ Basic validation
- ✅ Timestamp checks
- ⚠️  Mock proof generation (Poseidon hash-based)
- ⚠️  No authentication
- ⚠️  No rate limiting

### Production Enhancements Needed
1. **Real ZK-SNARKs**
   - Implement Circom circuits
   - Generate trusted setup (or use universal setup)
   - Use actual Groth16 proof system

2. **Authentication**
   - API key for scanner devices
   - Optional user accounts (privacy-preserving)

3. **Security Headers**
   - CORS properly configured
   - CSP headers
   - Rate limiting
   - Input sanitization

4. **Key Management**
   - Secure storage of verification keys
   - Key rotation policies
   - HSM for critical keys

5. **Audit Trail**
   - Verification logs (without personal data)
   - System monitoring
   - Anomaly detection

## Scalability

### Current Setup
- Single server architecture
- Direct database connection
- Suitable for POC/demo

### Production Scaling
1. **Horizontal Scaling**
   - Load balancer (Nginx/HAProxy)
   - Multiple backend instances
   - Connection pooling

2. **Database**
   - Read replicas
   - Connection pooling (PgBouncer)
   - Proper indexing

3. **Caching**
   - Redis for route data
   - CDN for frontend assets
   - Proof verification caching

4. **Microservices**
   - Separate proof generation service
   - Dedicated verification service
   - Route management service

## Technology Choices

### Why React?
- ✅ Component-based architecture
- ✅ Large ecosystem
- ✅ Great developer experience
- ✅ Easy to build interactive UIs

### Why Node.js?
- ✅ JavaScript/TypeScript throughout
- ✅ Excellent async I/O for API
- ✅ Native crypto library support
- ✅ Fast prototyping

### Why PostgreSQL?
- ✅ JSONB for proof data
- ✅ ACID compliance
- ✅ Excellent performance
- ✅ Rich query capabilities

### Why snarkjs/circomlibjs?
- ✅ Pure JavaScript ZK library
- ✅ Groth16 support
- ✅ Poseidon hash (ZK-friendly)
- ✅ Active development

## Future Enhancements

### Phase 1: Real ZK Implementation
- [ ] Create Circom circuits
- [ ] Generate proving/verification keys
- [ ] Integrate snarkjs for real proofs
- [ ] Browser-based proof generation

### Phase 2: Enhanced Features
- [ ] Multiple ticket classes
- [ ] Seat reservations (privacy-preserving)
- [ ] Group tickets
- [ ] Real-time train information

### Phase 3: Production Ready
- [ ] Authentication system
- [ ] Payment integration
- [ ] Mobile apps (iOS/Android)
- [ ] Offline verification
- [ ] Comprehensive testing
- [ ] CI/CD pipeline

### Phase 4: Advanced Privacy
- [ ] Anonymous credentials
- [ ] Selective disclosure
- [ ] Revocation schemes
- [ ] Privacy-preserving analytics

