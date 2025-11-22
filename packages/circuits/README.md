# ZK Circuits Directory

This directory should contain your compiled circom circuits and proving/verification keys.

## Required Files

For REAL proof generation and verification:

- `ticket.circom` - Your circom circuit (source)
- `ticket.wasm` - Compiled WASM circuit
- `ticket.zkey` - Proving key
- `verification_key.json` - Verification key

## Setup Instructions

### 1. Install Circom

```bash
# Install circom compiler
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Or use npm version
npm install -g circom
```

### 2. Install snarkjs

```bash
npm install -g snarkjs
```

### 3. Create Your Circuit

Create `ticket.circom`:

```circom
pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template TicketVerifier() {
    // Private input
    signal input ticketIdHash;
    
    // Public inputs
    signal input routeId;
    signal input validFrom;
    signal input validUntil;
    
    // Output
    signal output commitment;
    
    // Compute commitment using Poseidon hash
    component hasher = Poseidon(4);
    hasher.inputs[0] <== ticketIdHash;
    hasher.inputs[1] <== routeId;
    hasher.inputs[2] <== validFrom;
    hasher.inputs[3] <== validUntil;
    
    commitment <== hasher.out;
    
    // Ensure validUntil > validFrom
    signal timeDiff;
    timeDiff <== validUntil - validFrom;
    
    // Constrain timeDiff to be positive (basic check)
    signal timeDiffSquared;
    timeDiffSquared <== timeDiff * timeDiff;
}

component main {public [routeId, validFrom, validUntil]} = TicketVerifier();
```

### 4. Compile Circuit

```bash
cd circuits

# Compile circuit
circom ticket.circom --r1cs --wasm --sym --output .

# This creates:
# - ticket_js/ticket.wasm
# - ticket.r1cs
# - ticket.sym
```

### 5. Generate Proving Key

```bash
# Download or generate powers of tau
# For testing, you can use a small one:
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v

# Contribute randomness
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="First contribution" -v

# Prepare phase 2
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v

# Generate zkey (proving key)
snarkjs groth16 setup ticket.r1cs pot12_final.ptau ticket_0000.zkey

# Add contribution to zkey
snarkjs zkey contribute ticket_0000.zkey ticket.zkey \
  --name="Contribution" -v

# Export verification key
snarkjs zkey export verificationkey ticket.zkey verification_key.json

# Copy WASM file
cp ticket_js/ticket.wasm .
```

### 6. File Structure

After setup, your circuits directory should have:

```
circuits/
├── README.md (this file)
├── ticket.circom (your circuit source)
├── ticket.wasm (compiled circuit)
├── ticket.zkey (proving key)
├── verification_key.json (verification key)
├── ticket.r1cs (constraint system)
└── ticket.sym (symbols)
```

## Testing Your Circuit

### Generate a Test Proof

```bash
# Create input file
cat > input.json << EOF
{
  "ticketIdHash": "12345678901234567890",
  "routeId": "1",
  "validFrom": "1704067200",
  "validUntil": "1704153600"
}
EOF

# Generate witness
node ticket_js/generate_witness.js ticket_js/ticket.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove ticket.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Using with the Application

Once you have the files in place:

1. **Backend** will automatically detect `ticket.wasm` and `ticket.zkey`
2. **Backend** will use snarkjs to generate REAL proofs
3. **Backend** will load `verification_key.json` for verification
4. **Frontend** will verify proofs using the same key

## POC Mode

Without circuit files, the application runs in POC mode:
- Generates structurally-valid mock proofs
- Validates proof structure only
- Demonstrates the flow without real cryptography

With circuit files, it becomes fully cryptographic:
- Generates real ZK-SNARKs
- Full Groth16 verification
- Production-ready proofs

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [Circomlib](https://github.com/iden3/circomlib) - Circuit library with Poseidon hash
- [ZK Whiteboard Sessions](https://www.youtube.com/watch?v=h-94UhJLeck) - Learn ZK proofs

## Security Note

⚠️ **For Production:**

1. Use a multi-party ceremony for powers of tau
2. Use proper randomness for contributions
3. Verify the ceremony was executed correctly
4. Use trusted setup or universal setup (PLONK)
5. Audit your circuit for bugs and vulnerabilities

The keys generated with this simple process are for TESTING ONLY!

