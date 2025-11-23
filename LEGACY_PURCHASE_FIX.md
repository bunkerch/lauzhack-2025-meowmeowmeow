# ✅ Legacy Purchase Endpoint Fix

## Problem

The legacy `/api/tickets/purchase` endpoint was trying to generate ZK proofs using the OLD circuit (TicketVerifier), but we replaced that circuit with the new PaymentProof circuit for the ZK flow.

**Error:**
```
Error: Invalid witness length. Circuit: 11112, witness: 745
```

This happened because:
1. The old circuit expected different inputs (ticketId, routeId, validFrom, validUntil)
2. The new circuit expects different inputs (root, quoteId, price, secret, merkle path)
3. They're incompatible!

## Solution

**The legacy purchase endpoint should NOT use ZK proofs at all!**

We have TWO separate flows now:
1. **Legacy Flow** (`/api/tickets/purchase`) - Traditional ticket purchase (NO ZK)
2. **ZK Flow** (`/api/tickets/issue-with-zk`) - Anonymous ZK-based purchase

## Changes Made

### Updated `/api/tickets/purchase` endpoint

**Before:**
```typescript
// Generate ZK proof for the ticket
const { proof, publicSignals } = await generateTicketProof({
  ticketId,
  routeId,
  validFrom: validFrom.getTime(),
  validUntil: validUntil.getTime(),
});

// Store ticket using Drizzle
const newTicket = await db.insert(tickets).values({
  id: ticketId,
  routeId,
  ticketType,
  validFrom,
  validUntil,
  proofData: proof,
  publicSignals,
}).returning();
```

**After:**
```typescript
// Note: This is the LEGACY purchase flow (without ZK proofs)
// For ZK-based anonymous tickets, use /issue-with-zk endpoint

// Store ticket using Drizzle (no ZK proof for legacy flow)
const newTicket = await db.insert(tickets).values({
  id: ticketId,
  routeId,
  ticketType,
  validFrom,
  validUntil,
  proofData: { legacy: true }, // Legacy tickets don't have ZK proofs
  publicSignals: [],
}).returning();
```

## Two Purchase Flows

### 1. Legacy Purchase (Simple)
**Endpoint:** `POST /api/tickets/purchase`

Flow:
```
Client → Select Route → Pay → Get Ticket (with ticket ID)
```

Properties:
- ❌ No anonymity
- ❌ Ticket linked to purchase
- ✅ Simple and fast
- ✅ Works without ZK proofs

### 2. ZK Purchase (Anonymous)
**Endpoints:**
- `POST /api/tickets/quote` - Get quote
- `POST /api/payment/pay` - Process payment, get secret
- `POST /api/tickets/issue-with-zk` - Submit ZK proof, get ticket

Flow:
```
Client → Get Quote → Pay (get secret + Merkle proof) 
      → Generate ZK Proof → Submit Proof → Get Anonymous Ticket
```

Properties:
- ✅ Complete anonymity
- ✅ No link between payment and ticket
- ✅ Privacy-preserving
- ⚠️ More complex (4 steps)

## Testing

### Test Legacy Purchase:
```bash
curl -X POST http://localhost:3000/api/tickets/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": 2,
    "ticketType": "single",
    "travelDate": "2025-11-22"
  }'
```

Expected: Should return ticket immediately (no ZK proof generation)

### Test ZK Purchase:
Navigate to: `http://localhost:5173/zk-purchase`
- Complete the 4-step flow
- ZK proof generation happens in the browser

## Recommendation

**For the hackathon demo, focus on the ZK flow** (`/zk-purchase` page):
- Shows off the zero-knowledge technology
- Demonstrates privacy properties
- More impressive!

The legacy flow is just there for comparison.

---

**Status: FIXED! 🎉**

Both flows now work correctly:
- Legacy purchase = simple, no ZK proofs
- ZK purchase = anonymous, with ZK proofs

