# Offline Verification System

## Overview

The scanner now performs **proper zero-knowledge proof verification** using the full QR code content, with support for **offline/constrained network** scenarios.

## 🔐 Security Fix

### ❌ Before (Insecure)
```typescript
// Scanner only sent ticket ID
body: JSON.stringify({ ticketId: "..." })

// Backend looked up proof from database
const ticket = await db.select().from(tickets).where(eq(tickets.id, ticketId));
// Verified stored proof, not QR code proof!
```

**Problem**: 
- Trusted database instead of cryptographic proof
- Couldn't verify offline
- Ticket could be forged by manipulating database

### ✅ After (Secure)
```typescript
// Scanner sends FULL QR code content
body: JSON.stringify({
  ticketId: "...",
  proof: {...},          // ZK proof from QR code
  publicSignals: [...],  // Public signals from QR code
  validFrom: "...",      // Validity dates
  validUntil: "...",
  routeId: 123           // Route reference
})

// Backend verifies the ACTUAL proof from QR code
const isProofValid = await verifyTicketProof(proof, publicSignals);
```

## 📡 Verification Modes

### 1. Online Mode (Full Verification)
```
┌─────────────────────────────────────────────────────┐
│ STEP 1: Verify ZK Proof (Offline)                  │
│ ✓ Cryptographic proof verification                 │
│ ✓ No database required                             │
├─────────────────────────────────────────────────────┤
│ STEP 2: Check Validity Period (Offline)            │
│ ✓ Current time vs validFrom/validUntil             │
│ ✓ No database required                             │
├─────────────────────────────────────────────────────┤
│ STEP 3: Check "Already Used" Status (Online)       │
│ ✓ Query database for ticket usage                  │
│ ✓ Requires network connection                      │
│ ✓ Prevents ticket reuse                            │
└─────────────────────────────────────────────────────┘

Result: Most secure verification
```

### 2. Offline Mode (Cryptographic Only)
```
┌─────────────────────────────────────────────────────┐
│ STEP 1: Verify ZK Proof (Offline)                  │
│ ✓ Cryptographic proof verification                 │
│ ✓ No database required                             │
├─────────────────────────────────────────────────────┤
│ STEP 2: Check Validity Period (Offline)            │
│ ✓ Current time vs validFrom/validUntil             │
│ ✓ No database required                             │
├─────────────────────────────────────────────────────┤
│ STEP 3: Skip Database Check                        │
│ ⚠️ Cannot detect if ticket was already used        │
└─────────────────────────────────────────────────────┘

Result: Works without network, cryptographically secure
Warning: Cannot prevent ticket reuse
```

### 3. Offline Fallback (Network Failure)
```
┌─────────────────────────────────────────────────────┐
│ STEP 1: Verify ZK Proof (Offline)                  │
│ ✓ Cryptographic proof verification                 │
├─────────────────────────────────────────────────────┤
│ STEP 2: Check Validity Period (Offline)            │
│ ✓ Current time vs validFrom/validUntil             │
├─────────────────────────────────────────────────────┤
│ STEP 3: Try Database Check (Online)                │
│ ❌ Network/Database error                          │
│ ⚠️ Fallback to offline mode                        │
└─────────────────────────────────────────────────────┘

Result: Graceful degradation when network fails
```

## 🎫 QR Code Content

### Full QR Code Structure
```json
{
  "ticketId": "uuid-string",
  "proof": {
    "pi_a": ["0x...", "0x...", "0x1"],
    "pi_b": [["0x2", "0x3"], ["0x4", "0x5"], ["0x1", "0x0"]],
    "pi_c": ["0x...", "0x6", "0x1"],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "publicSignals": ["123...", "456...", "789...", "012..."],
  "validFrom": "2024-01-15T10:00:00.000Z",
  "validUntil": "2024-01-16T10:00:00.000Z",
  "routeId": 1
}
```

### Why Each Field is Needed

- **ticketId**: Unique identifier (optional for offline, required for "already used" check)
- **proof**: Zero-knowledge proof that verifies authenticity
- **publicSignals**: Public data linked to the proof
- **validFrom/validUntil**: Validity period (verified offline)
- **routeId**: Route reference (for display in offline mode)

## 🔧 API Endpoints

### POST /api/verify/scan
**Primary scanner endpoint with flexible verification**

Request:
```json
{
  "ticketId": "uuid",
  "proof": {...},
  "publicSignals": [...],
  "validFrom": "ISO date",
  "validUntil": "ISO date",
  "routeId": 123,
  "offline": false  // Optional: force offline mode
}
```

Response (Valid - Online):
```json
{
  "valid": true,
  "message": "Ticket is valid",
  "verificationMethod": "online",
  "ticket": {
    "route": "Zürich HB → Bern",
    "type": "single",
    "validUntil": "..."
  }
}
```

Response (Valid - Offline):
```json
{
  "valid": true,
  "message": "Ticket is valid (offline verification)",
  "verificationMethod": "offline",
  "ticket": {
    "route": "Route 1",
    "validUntil": "..."
  },
  "warning": "Cannot verify if ticket was already used (offline mode)"
}
```

Response (Invalid):
```json
{
  "valid": false,
  "message": "Ticket has expired"
}
```

### POST /api/verify/verify-offline
**Pure offline verification endpoint**

Request:
```json
{
  "proof": {...},
  "publicSignals": [...],
  "validFrom": "ISO date",
  "validUntil": "ISO date"
}
```

Response:
```json
{
  "valid": true,
  "message": "Ticket cryptographically valid",
  "note": "Offline verification only - cannot check if ticket was already used"
}
```

## 🎨 Scanner UI Features

### Mode Toggle
- Switch between Online and Offline modes
- Visual indicators (WiFi icons)
- Color-coded (blue for online, orange for offline)

### QR Code Input
- Textarea for pasting full JSON QR code data
- Validation of QR code structure
- Clear error messages for invalid format

### Verification Results
- Verification method badge (Online/Offline/Offline-fallback)
- Warning messages for offline limitations
- Color-coded results (green for valid, red for invalid)

## 🔒 Security Benefits

### Cryptographic Verification
✅ **Tamper-Proof**: Cannot forge a valid proof
✅ **Self-Contained**: Proof contains all verification data
✅ **Offline Capable**: Works without database

### Privacy Preserving
✅ **No Personal Data**: QR code contains no personal information
✅ **Zero-Knowledge**: Proof reveals nothing about ticket holder
✅ **Public Verifiable**: Anyone can verify proof authenticity

### Operational Benefits
✅ **Works Offline**: Scanners work without network
✅ **Graceful Degradation**: Falls back to offline if network fails
✅ **Fast Verification**: Cryptographic proof verification is instant
✅ **Scalable**: No database query for basic verification

## ⚠️ Limitations

### Offline Mode Limitations

**Cannot Prevent Double-Spending**
- In offline mode, same ticket can be scanned multiple times
- Online mode required to mark ticket as "used"

**Limited Route Information**
- Only route ID available offline
- Full route details (origin/destination) require database lookup

**No Audit Trail**
- Cannot record when/where ticket was scanned in offline mode

### Solutions

1. **Hybrid Approach**: 
   - Use offline verification during initial scan (fast)
   - Sync with database later when network available
   
2. **Local Storage**: 
   - Scanner can cache verified tickets locally
   - Prevents immediate reuse even in offline mode
   
3. **Batch Sync**: 
   - Queue offline verifications
   - Sync with server when network restored

## 📊 Verification Flow Diagram

```
Scanner Scans QR Code
         │
         ▼
Parse QR Code JSON
         │
         ▼
┌────────┴────────┐
│ Offline Mode?   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  YES        NO
    │         │
    │         ▼
    │    ┌─────────────────┐
    │    │ Verify Proof    │
    │    └────────┬─────────┘
    │             │
    │             ▼
    │    ┌─────────────────┐
    │    │ Check Validity  │
    │    └────────┬─────────┘
    │             │
    │             ▼
    │    ┌─────────────────┐
    │    │ Query Database  │◄─── Network Required
    │    │ (Used Status)   │
    │    └────────┬─────────┘
    │             │
    │      ┌──────┴──────┐
    │      │ Network OK? │
    │      └──────┬──────┘
    │             │
    │        ┌────┴────┐
    │       YES       NO
    │        │         │
    ▼        ▼         ▼
┌─────────────────────────┐
│   Show Result with      │
│   Verification Method   │
└─────────────────────────┘
```

## 🚀 Usage Examples

### Example 1: Online Verification (Full Security)
```javascript
// Scanner sends full QR data
const response = await fetch('/api/verify/scan', {
  method: 'POST',
  body: JSON.stringify({
    ticketId: qrData.ticketId,
    proof: qrData.proof,
    publicSignals: qrData.publicSignals,
    validFrom: qrData.validFrom,
    validUntil: qrData.validUntil,
    routeId: qrData.routeId,
    offline: false  // Online mode
  })
});

// Result:
// ✓ Proof verified cryptographically
// ✓ Validity period checked
// ✓ Database checked for "already used"
// = Most secure
```

### Example 2: Offline Verification (Constrained Network)
```javascript
const response = await fetch('/api/verify/scan', {
  method: 'POST',
  body: JSON.stringify({
    ticketId: qrData.ticketId,
    proof: qrData.proof,
    publicSignals: qrData.publicSignals,
    validFrom: qrData.validFrom,
    validUntil: qrData.validUntil,
    routeId: qrData.routeId,
    offline: true  // Offline mode
  })
});

// Result:
// ✓ Proof verified cryptographically
// ✓ Validity period checked
// ✗ Database NOT checked
// ⚠️ Cannot detect ticket reuse
```

### Example 3: Graceful Degradation
```javascript
try {
  // Try online verification
  const response = await fetch('/api/verify/scan', {
    method: 'POST',
    body: JSON.stringify({...qrData, offline: false})
  });
} catch (networkError) {
  // Network failed - fallback to offline
  const response = await fetch('/api/verify/scan', {
    method: 'POST',
    body: JSON.stringify({...qrData, offline: true})
  });
}

// Result: Always works, even with network issues
```

## 📝 Best Practices

### For Scanner Operators

1. **Use Online Mode by Default**
   - Provides full security including "already used" check
   - Only use offline mode when network unavailable

2. **Watch for Warnings**
   - Pay attention to verification method badge
   - Note warnings about offline limitations

3. **Validate QR Code**
   - Ensure QR code scans completely
   - Check for valid JSON structure

### For Developers

1. **Always Verify the Proof**
   - Don't trust database alone
   - Verify cryptographic proof from QR code

2. **Include All Data in QR Code**
   - Don't rely on database lookups
   - QR code should be self-contained

3. **Handle Network Failures Gracefully**
   - Implement offline fallback
   - Queue operations for later sync

4. **Log Verification Events**
   - Track online vs offline verifications
   - Monitor for potential abuse

## 🎯 Summary

✅ **Scanner now verifies actual ZK proof from QR code**
✅ **Supports offline verification in constrained networks**
✅ **Online mode provides full security**
✅ **Graceful degradation when network fails**
✅ **Cryptographically secure - cannot forge tickets**
✅ **Self-contained QR codes - no database dependency**

The system now properly implements zero-knowledge proof verification while supporting both online and offline scenarios!

