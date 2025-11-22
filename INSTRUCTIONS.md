# ZK Train Ticket PoC – Technical Specification

This document describes a **zero-knowledge payment proof**–based train ticketing PoC with:
- **Two microservices**: Payment Service & Ticket Backend.
- **ZK proof** that a valid payment exists, without revealing which payment.
- **Anonymous tickets** (QR/JWT) with offline-verifiable signatures.
- **Controller logging** via `ticketId` (no link back to payment).

The spec is written to be **implementable for a hackathon** using:
- **Circom 2 + circomlib** for circuits.
- **snarkjs** for Groth16 proofs.
- **TypeScript/Node** on backend + web frontend.

---

## 1. System Components

### 1.1. Payment Service (PS)

- Handles **real-world payment** (for PoC: mocked).
- For each successful payment:
  - Generates a random secret `secret`.
  - Computes a **commitment leaf** `leaf = Poseidon(secret, quoteIdField, priceCents)`.
  - Inserts `leaf` into a Merkle tree.
  - Returns to frontend:
    - `secret`
    - `quoteId`
    - `priceCents`
    - `merklePath` (siblings + direction bits)
    - `root` (Merkle root at that time)
- Publishes **current Merkle root** to Ticket Backend (e.g. via `/payment/root`).

> PS **knows user identity & payment details**, but Ticket Backend will never see them.

---

### 1.2. Ticket Backend (TB)

- Computes **journey quotes** (uses opentransportdata timetable).
- Issues **anonymous tickets** if and only if it receives a **valid ZK payment proof**.
- Tickets are signed JWTs and encoded as QRs.

Endpoints:

- `POST /quote` – given journey params ⇒ returns `{ quoteId, priceCents, dv, ... }`.
- `POST /issue-with-zk` – given `{ quoteId, priceCents, root, proof, publicSignals }` ⇒ verifies proof and, if valid, returns a signed ticket token (JWT string).
- `POST /validation/scan-log` – controllers submit `ticketId` for online double-use detection (optional for PoC).

> TB **never sees paymentId, userId, or secret**. Only `quoteId`, price, `root`, and ZK proof.

---

### 1.3. Frontend (Client / Wallet)

- Talks to both PS and TB.
- Stores:
  - `secret`
  - `quoteId`
  - `priceCents`
  - `merklePath`
  - `root`
- Runs the **Circom/SNARK prover** to produce:
  - `proof`
  - `publicSignals`
- Sends those to TB to **get an anonymous ticket**.

---

### 1.4. Controller App (Inspector)

- Has:
  - `PK_ticketIssuer` (public key).
  - Local timetable snapshot (from opentransportdata) for dataset version `dv`.
- Offline actions:
  - Scan QR → decode JWT → verify signature + validity window + route.
- Online actions:
  - Optionally `POST /validation/scan-log` with `ticketId` to log for double-use detection.

> Controller sees **origin, destination, validity, tripIds, ticketId**, but never payment information.

---

## 2. Data Formats

### 2.1. Ticket JWT Claims

**JWT payload** (this is what goes inside the QR, signed by TB):

```jsonc
{
    "tid": "uuid-or-random-128-192-bit-hex", // ticketId
    "dv": "GTFS_2025_11_22",                 // timetable dataset/version
    "tp": "single",                          // ticket type
    "origin": "8507000",                     // GTFS stop_id
    "dest": "8503000",                       // GTFS stop_id
    "tripIds": ["TRIP_1234"],                // optional: GTFS trip_ids
    "validFrom": 1732275600,                 // unix seconds
    "validUntil": 1732279200,                // unix seconds
    "iat": 1732275500,                       // issuedAt
    "productClass": "2"                      // 1st/2nd class, etc.
}
```

- Signed with a private key using **EdDSA (Ed25519)** or **ES256**.
- Controllers verify offline using the public key.

---

### 2.2. ZK Proof – Public Inputs

The ZK circuit will have the following **public inputs**:

- `root` – Merkle root of the Payment Service’s commitment tree.
- `quoteId` – numeric field encoding of the `quoteId` string (`quoteIdField`).
- `price` – ticket price in cents (e.g. `2000` for 20.00 CHF).

### 2.3. ZK Proof – Private Inputs

- `secret` – random scalar for this payment (known to PS + client).
- `pathElements[depth]` – sibling hashes of Merkle path.
- `pathIndices[depth]` – bits indicating left/right at each level.

The circuit enforces:

```text
leaf = Poseidon(secret, quoteId, price)
leaf is in Merkle tree with root = root, given (pathElements, pathIndices)
```

---

### 2.4. ZK Proof Payload (JSON over HTTP)

What frontend sends to TB at `/issue-with-zk`:

```jsonc
{
    "quoteId": "Q123",
    "priceCents": 2000,
    "root": "1234567890...",         // decimal string for field element
    "proof": { "...": "..." },       // snarkjs proof object
    "publicSignals": ["...", "..."]  // snarkjs public signals array
}
```

TB will locally recompute `quoteIdField` from `quoteId` and verify consistency with `publicSignals`.

---

## 3. Protocol Flows

### 3.1. Quote & Payment

1. **Client → TB** (`POST /quote`)
   - Body: journey parameters (origin, dest, datetime, etc.).
   - Response: `{ quoteId, priceCents, dv, ... }`.

2. **Client → PS** (`POST /pay`)
   - Body: `{ quoteId, priceCents, paymentMethod }`.
   - PS processes payment (mocked in PoC).
   - On success:
     - Generate `secret`.
     - Compute `quoteIdField = hashToField(quoteId)`.
     - Compute `leaf = Poseidon(secret, quoteIdField, priceCents)`.
     - Insert leaf into Merkle tree; get `leafIndex` and `merklePath`.
   - Returns (to client):

     ```jsonc
     {
         "secret": "bigint-as-decimal-string",
         "quoteId": "Q123",
         "priceCents": 2000,
         "root": "merkle-root-decimal",
         "merklePath": {
             "pathElements": ["..", ".."],
             "pathIndices": [0, 1, ...]
         }
     }
     ```

3. **PS → TB** (out-of-band or via polling)
   - TB retrieves current `root` (e.g. `/payment/root`).
   - Keeps it in memory / cache.

---

### 3.2. ZK Ticket Issuance

4. **Client (frontend)** – Build ZK proof

   Using `secret`, `quoteId`, `priceCents`, `merklePath`, `root`:
   - Compute `quoteIdField` as the same hash-to-field used by PS.
   - Run `snarkjs.groth16.fullProve(...)` with circuit `PaymentProof`.
   - Get `{ proof, publicSignals }`.

5. **Client → TB** (`POST /issue-with-zk`)

   ```jsonc
   {
       "quoteId": "Q123",
       "priceCents": 2000,
       "root": "merkle-root-decimal",
       "proof": { "...": "..." },
       "publicSignals": ["...", "..."]
   }
   ```

6. **TB verifies proof**

   - Use `snarkjs.groth16.verify(verificationKey, publicSignals, proof)`.
   - Ensure `publicSignals` match:
     - `out_root == root`
     - `out_price == priceCents`
     - `out_quoteId == hashToField(quoteId)`

   If valid:
   - Generate a random `ticketId = tid` (e.g. 128–192 bit).
   - Build JWT claims.
   - Sign with TB private key.
   - Return JWT string to client.

---

### 3.3. Controller Validation

- **Offline**:
  - Scan QR → get JWT.
  - Verify signature with `PK_ticketIssuer`.
  - Check `now ∈ [validFrom, validUntil]`.
  - Check `origin`, `dest`, `tripIds`, `dv` vs local timetable snapshot.
  - Optionally, keep a local in-memory set of seen `tid` to warn about reuse on same device.

- **Online (optional)**:
  - `POST /validation/scan-log` with `{ ticketId: tid, controllerId, tripId, scanTime }`.
  - TB checks if `tid` known, within validity window, and counts previous scans.
  - Respond with `VALID`, `EXPIRED`, `UNKNOWN_TICKET`, and possible `SUSPECT_REUSE` status.

---

## 4. Circom Circuit

File: `circuits/payment_proof.circom`

```circom
pragma circom 2.1.4;

include "circomlib/poseidon.circom";

// Simple Merkle path verifier using Poseidon as node hash
template MerklePathVerifier(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    // pathIndices[i] ∈ {0,1}. 0 = current is left child, 1 = current is right child.
    signal input pathIndices[depth];

    signal hash[depth + 1];
    signal left[depth];
    signal right[depth];

    component hashers[depth];

    // leaf at level 0
    hash[0] <== leaf;

    // Booleanity constraints for pathIndices
    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
    }

    // Compute root from leaf and path
    for (var i = 0; i < depth; i++) {
        hashers[i] = Poseidon(2);

        // if pathIndices[i] == 0:
        //   left  = hash[i]
        //   right = pathElements[i]
        // else:
        //   left  = pathElements[i]
        //   right = hash[i]

        left[i] <== (1 - pathIndices[i]) * hash[i] + pathIndices[i] * pathElements[i];
        right[i] <== pathIndices[i] * hash[i] + (1 - pathIndices[i]) * pathElements[i];

        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];

        hash[i + 1] <== hashers[i].out;
    }

    // Enforce that computed root matches public root
    root === hash[depth];
}

// Main payment proof circuit
template PaymentProof(depth) {
    // PUBLIC inputs
    signal input root;     // Merkle root
    signal input quoteId;  // field representation of quoteId
    signal input price;    // price in cents

    // PRIVATE inputs
    signal input secret;                       // payment secret
    signal input pathElements[depth];         // Merkle path siblings
    signal input pathIndices[depth];          // Merkle path directions

    // Compute leaf = Poseidon(secret, quoteId, price)
    component leafHasher = Poseidon(3);
    leafHasher.inputs[0] <== secret;
    leafHasher.inputs[1] <== quoteId;
    leafHasher.inputs[2] <== price;

    signal leaf;
    leaf <== leafHasher.out;

    // Verify Merkle inclusion
    component mp = MerklePathVerifier(depth);
    mp.leaf <== leaf;
    mp.root <== root;

    for (var i = 0; i < depth; i++) {
        mp.pathElements[i] <== pathElements[i];
        mp.pathIndices[i] <== pathIndices[i];
    }

    // Expose public outputs (for sanity checks in backend)
    signal output out_root;
    out_root <== root;

    signal output out_quoteId;
    out_quoteId <== quoteId;

    signal output out_price;
    out_price <== price;
}

// Adjust depth to match your Merkle tree (e.g. 20)
component main = PaymentProof(20);
```

---

## 5. Build & Integration Instructions

### 5.1. Directory Layout (suggested)

```text
project/
  circuits/
    payment_proof.circom
  build/
  backend/
    ticket-backend.ts
  payment-service/
    payment-service.ts
  frontend/
    src/
```

---

### 5.2. Install Tools

```bash
# Circom & snarkjs (global for convenience)
npm install -g circom
npm install -g snarkjs

# In your project:
npm install snarkjs
npm install circomlib
```

Get a Powers of Tau file (for hackathon, use a small one, e.g. `powersOfTau28_hez_final_10.ptau`), or generate your own.

---

### 5.3. Compile Circuit

```bash
cd circuits

circom payment_proof.circom \
  --r1cs \
  --wasm \
  --sym \
  -o ../build
```

Outputs:

- `../build/payment_proof.r1cs`
- `../build/payment_proof_js/payment_proof.wasm`
- Symbols file, etc.

---

### 5.4. Groth16 Trusted Setup

```bash
cd ../build

# Phase 2 (using existing ptau)
snarkjs groth16 setup payment_proof.r1cs \
  path/to/powersOfTau28_hez_final_10.ptau \
  payment_proof_0000.zkey

# Contribute entropy
snarkjs zkey contribute payment_proof_0000.zkey \
  payment_proof_final.zkey \
  -n "first contribution"

# Export verification key
snarkjs zkey export verificationkey \
  payment_proof_final.zkey \
  verification_key.json
```

Artifacts:

- `payment_proof_final.zkey` – proving key (frontend).
- `verification_key.json` – verification key (Ticket Backend).

---

### 5.5. Frontend: Generate Proof (TypeScript sketch)

```ts
// frontend/src/zk.ts
import * as snarkjs from "snarkjs";

type MerklePath = {
    pathElements: string[]; // decimal strings
    pathIndices: number[];  // 0/1
};

export async function generatePaymentProof(params: {
    secret: string;             // decimal string
    quoteIdField: string;       // decimal string
    priceCents: number;
    merklePath: MerklePath;
    root: string;               // decimal string
}) {
    const input = {
        root: params.root,
        quoteId: params.quoteIdField,
        price: params.priceCents.toString(),
        secret: params.secret,
        pathElements: params.merklePath.pathElements,
        pathIndices: params.merklePath.pathIndices
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/circuits/payment_proof_js/payment_proof.wasm",
        "/circuits/payment_proof_final.zkey"
    );

    return { proof, publicSignals };
}
```

Where `quoteIdField` is computed using the **same Poseidon hash-to-field** function as the Payment Service, something like:

```ts
import { poseidon2 } from "poseidon-lite"; // or circomlibjs

export function quoteIdToField(quoteId: string): string {
    // Convert string to bytes → BigInt → Poseidon → field
    const bytes = new TextEncoder().encode(quoteId);
    let acc = 0n;
    for (const b of bytes) {
        acc = acc * 256n + BigInt(b);
    }
    const field = poseidon2([acc]);
    return field.toString();
}
```

---

### 5.6. Backend: Verify Proof

```ts
// backend/zkVerify.ts
import * as snarkjs from "snarkjs";
import verificationKey from "../build/verification_key.json";
import { quoteIdToField } from "../shared/quoteIdToField";

type ZkIssueRequest = {
    quoteId: string;
    priceCents: number;
    root: string;
    proof: any;
    publicSignals: string[];
};

export async function verifyPaymentZk(req: ZkIssueRequest): Promise<boolean> {
    const { proof, publicSignals } = req;

    const ok = await snarkjs.groth16.verify(verificationKey as any, publicSignals, proof);
    if (!ok) return false;

    const [out_root, out_quoteId, out_price] = publicSignals;

    if (out_root !== req.root) return false;
    if (out_price !== req.priceCents.toString()) return false;

    const expectedQuoteField = quoteIdToField(req.quoteId);
    if (out_quoteId !== expectedQuoteField) return false;

    return true;
}
```

Then in your `/issue-with-zk` handler:

```ts
// backend/ticket-backend.ts (simplified)
import { verifyPaymentZk } from "./zkVerify";
import { signTicketJwt } from "./signTicketJwt";

app.post("/issue-with-zk", async (req, res) => {
    const body = req.body as {
        quoteId: string;
        priceCents: number;
        root: string;
        proof: any;
        publicSignals: string[];
    };

    const ok = await verifyPaymentZk(body);
    if (!ok) {
        return res.status(400).json({ error: "Invalid ZK proof" });
    }

    // Look up quote details, dv, origin, dest, tripIds from your DB by quoteId
    const quote = await db.getQuote(body.quoteId);
    if (!quote) {
        return res.status(404).json({ error: "Unknown quote" });
    }

    // Create ticket
    const ticketId = crypto.randomUUID(); // or random bytes
    const now = Math.floor(Date.now() / 1000);

    const claims = {
        tid: ticketId,
        dv: quote.dv,
        tp: "single",
        origin: quote.originStopId,
        dest: quote.destStopId,
        tripIds: quote.tripIds,
        validFrom: quote.validFrom,
        validUntil: quote.validUntil,
        iat: now,
        productClass: quote.productClass
    };

    const jwt = signTicketJwt(claims); // your EdDSA/ES256 signing

    return res.json({ token: jwt });
});
```

---

## 6. What This Guarantees (What You Can Say at the Hackathon)

- Each payment creates an **anonymous commitment** `leaf = Poseidon(secret, quoteId, price)` stored in a Merkle tree.
- The client proves, in zero-knowledge, that:
  - It knows a `secret` and Merkle path,
  - For which `leaf` is in the Payment Service’s Merkle tree,
  - And that `quoteId` and `price` match the journey being purchased.
- Ticket Backend sees **only**:
  - A valid ZK proof + `quoteId` + `price` + `root`.
  - It **cannot** tell which concrete payment / user produced it.
- Ticket IDs are random and **not linked** to payment IDs in any database schema.
- Controllers see only the ticket’s claims (origin/dest/trip/validity) + `ticketId` for scan logging.

You now have a **tight, end-to-end spec** + **circom circuit code** + **build steps** to show a working ZK-powered anonymous train ticket PoC at your hackathon.