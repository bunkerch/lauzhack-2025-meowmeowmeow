# Quick Start: Generate Real ZK Circuits

This guide will get you from mock proofs to REAL cryptographic proofs in minutes!

## Prerequisites

1. **Install Circom Compiler**

```bash
# Option 1: Download pre-built binary (fastest)
# Visit: https://github.com/iden3/circom/releases
# Download for your OS and add to PATH

# Option 2: Build from source (requires Rust)
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
```

2. **Install snarkjs** (if not already installed)

```bash
npm install -g snarkjs
```

3. **Verify installations**

```bash
circom --version  # Should show v2.x.x
snarkjs --version # Should show v0.x.x
```

## Automated Setup (Recommended)

Just run the setup script:

```bash
cd circuits
chmod +x setup.sh
./setup.sh
```

This will:
- ✅ Install circomlib
- ✅ Compile the circuit
- ✅ Generate Powers of Tau
- ✅ Create proving key
- ✅ Export verification key
- ✅ Test the circuit
- ✅ Generate all required files

**Time:** ~5-10 minutes depending on your machine

## Manual Setup (Step by Step)

If you prefer to run each step manually:

### 1. Install circomlib

```bash
cd /home/coder/cff-ticket-frfr
pnpm add -D circomlib
```

### 2. Compile Circuit

```bash
cd circuits
circom ticket.circom --r1cs --wasm --sym --output .
```

### 3. Generate Powers of Tau

```bash
# Start ceremony
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v

# Contribute randomness
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
  --name="First contribution" -v

# Prepare for phase 2
snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
```

### 4. Generate Proving Key

```bash
# Setup
snarkjs groth16 setup ticket.r1cs pot12_final.ptau ticket_0000.zkey

# Contribute
snarkjs zkey contribute ticket_0000.zkey ticket.zkey \
  --name="Contribution" -v
```

### 5. Export Verification Key

```bash
snarkjs zkey export verificationkey ticket.zkey verification_key.json
```

### 6. Copy WASM

```bash
cp ticket_js/ticket.wasm .
```

### 7. Test It!

```bash
# Create test input
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
# Should output: OK!
```

## What You Should Have

After setup, your `circuits/` directory should contain:

```
circuits/
├── ticket.circom              ← Circuit source code
├── ticket.wasm                ← Compiled circuit (REQUIRED)
├── ticket.zkey                ← Proving key (REQUIRED)
├── verification_key.json      ← Verification key (REQUIRED)
├── ticket.r1cs                ← Constraint system
├── ticket.sym                 ← Symbols
├── pot12_final.ptau          ← Powers of Tau
├── ticket_js/                ← Generated JS files
│   ├── ticket.wasm
│   ├── generate_witness.js
│   └── witness_calculator.js
├── setup.sh                  ← Automated setup script
├── README.md                 ← Detailed documentation
└── QUICKSTART.md            ← This file
```

## Verify It's Working

1. **Restart backend:**

```bash
cd /home/coder/cff-ticket-frfr
pnpm backend
```

2. **Look for this in logs:**

```
🔐 Generating REAL ZK proof with snarkjs...
✅ Real ZK proof generated successfully!
```

3. **Buy a ticket through the frontend**

4. **Check the QR code** - it now contains a REAL cryptographic proof!

## Update Frontend Verification Key (Optional)

To use the real verification key in the frontend:

1. Copy the content from `verification_key.json`
2. Replace `VERIFICATION_KEY` in `packages/frontend/src/utils/zkVerifier.ts`
3. Rebuild frontend: `cd .. && pnpm -r build`

## Troubleshooting

### "circom: command not found"

Install circom using one of the methods above.

### "snarkjs: command not found"

```bash
npm install -g snarkjs
```

### "Cannot find module 'circomlib'"

```bash
cd /home/coder/cff-ticket-frfr
pnpm add -D circomlib
```

### Setup takes too long

The Powers of Tau generation can take 3-5 minutes. This is normal for cryptographic key generation.

### Permission denied on setup.sh

```bash
chmod +x setup.sh
```

## Next Steps

Once you have real circuits:

1. **Test thoroughly** - Try purchasing tickets and scanning them
2. **Monitor logs** - Verify you see "Real ZK proof generated"
3. **Benchmark** - Real proof generation takes ~1-2 seconds
4. **Optimize circuit** - Add more constraints if needed
5. **Security audit** - For production, audit your circuit

## Learn More

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs Explained](https://z.cash/technology/zksnarks/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)

## Time Estimates

- **Automated setup:** 5-10 minutes
- **Manual setup:** 10-15 minutes
- **Proof generation (runtime):** 1-2 seconds per ticket
- **Proof verification:** <100ms

Enjoy your REAL zero-knowledge proofs! 🔐✨

