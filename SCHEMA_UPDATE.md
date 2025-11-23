# ✅ Frontend Schema Update - Legacy Ticket Support

## Problem

The frontend Zod schemas were expecting all tickets to have full Groth16 ZK proofs with the structure:
```typescript
{
  pi_a: string[],
  pi_b: string[][],
  pi_c: string[],
  protocol: 'groth16',
  curve: 'bn128'
}
```

But legacy tickets (from `/api/tickets/purchase`) return:
```json
{
  "proof": { "legacy": true },
  "publicSignals": []
}
```

This caused validation errors on the frontend.

## Solution

Updated the Zod schemas to accept **both** ZK proofs and legacy tickets.

### Changes Made

#### 1. Created Union Type for Proofs

**Before:**
```typescript
export const ProofSchema = z.object({
  pi_a: z.array(z.string()).min(3),
  pi_b: z.array(z.array(z.string()).length(2)).length(3),
  pi_c: z.array(z.string()).min(3),
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
});
```

**After:**
```typescript
// Real ZK proof
export const Groth16ProofSchema = z.object({
  pi_a: z.array(z.string()).min(3),
  pi_b: z.array(z.array(z.string()).length(2)).length(3),
  pi_c: z.array(z.string()).min(3),
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
});

// Legacy ticket (no ZK)
export const LegacyProofSchema = z.object({
  legacy: z.literal(true),
});

// Union: accepts both
export const ProofSchema = z.union([
  Groth16ProofSchema, 
  LegacyProofSchema
]);
```

#### 2. Made Public Signals Optional

**Before:**
```typescript
export const PublicSignalsSchema = z.array(z.string()).min(1);
```

**After:**
```typescript
export const PublicSignalsSchema = z.array(z.string());
// Now accepts empty arrays for legacy tickets
```

#### 3. Updated Dependent Schemas

Made `publicSignals` optional in:
- `QRCodeDataSchema`
- `TicketSchema`

#### 4. Updated UI to Distinguish Ticket Types

In `TicketPage.tsx`, the UI now shows:
- **Legacy tickets:** 🎫 "Ticket Details" with message about standard tickets
- **ZK tickets:** 🔒 "Zero-Knowledge Proof Details" with privacy message

## TypeScript Types

The updated types now properly handle both cases:

```typescript
type ProofData = 
  | Groth16Proof    // Real ZK proof
  | { legacy: true } // Legacy ticket

// Use type narrowing to check:
if ('legacy' in proof) {
  // It's a legacy ticket
} else {
  // It's a ZK ticket with full Groth16 proof
}
```

## Testing

### Test Legacy Response
```javascript
const legacyResponse = {
  ticket: { /* ... */ },
  proof: { legacy: true },
  publicSignals: []
};

PurchaseResponseSchema.parse(legacyResponse); // ✅ Passes
```

### Test ZK Response
```javascript
const zkResponse = {
  ticket: { /* ... */ },
  proof: {
    pi_a: ["...", "...", "..."],
    pi_b: [["...", "..."], ["...", "..."], ["...", "..."]],
    pi_c: ["...", "...", "..."],
    protocol: "groth16",
    curve: "bn128"
  },
  publicSignals: ["123", "456", "789"]
};

PurchaseResponseSchema.parse(zkResponse); // ✅ Passes
```

## Result

Both purchase flows now work correctly:

1. **Legacy Purchase** (`/purchase`)
   - Returns tickets with `{ proof: { legacy: true } }`
   - Frontend validates successfully
   - UI shows as standard ticket

2. **ZK Purchase** (`/zk-purchase`)
   - Returns tickets with full Groth16 proofs
   - Frontend validates successfully
   - UI shows as ZK ticket with privacy info

---

**Status: FIXED! 🎉**

The frontend now handles both legacy and ZK tickets seamlessly.


