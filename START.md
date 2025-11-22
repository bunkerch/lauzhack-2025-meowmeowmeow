# 🚀 Quick Start - Real ZK-SNARK Ticket System

## Current Status

✅ **FULLY OPERATIONAL** - Real cryptographic zero-knowledge proofs!

## Start the Application

### Terminal 1: Database
```bash
pnpm db:up
```

### Terminal 2: Backend
```bash
pnpm backend
```

**Look for this in the logs:**
```
🔐 Generating REAL ZK proof with snarkjs...
✅ Real ZK proof generated successfully!
```

### Terminal 3: Frontend
```bash
pnpm frontend
```

Then open: http://localhost:5173

## Test the System

1. **Purchase a Ticket**
   - Navigate to "Purchase Ticket"
   - Select a route (e.g., Zürich → Bern)
   - Click "Purchase Ticket"
   - Watch backend logs for real proof generation (1-2 seconds)
   - QR code appears with REAL cryptographic proof embedded

2. **Verify the Ticket**
   - Navigate to "Scanner"
   - Select verification mode: **"Offline (Browser)"**
   - Click on the QR code from your ticket
   - See instant cryptographic verification (<100ms)
   - Watch console for: `✅ ZK proof is cryptographically valid`

## What Makes This Special?

### Zero-Knowledge Property
- **Proves**: Valid ticket for correct route and time
- **Hides**: Actual ticket ID and personal information
- **How**: Groth16 ZK-SNARKs on BN128 elliptic curve

### Offline Verification
- Works completely offline in browser
- No backend communication needed for scanning
- Perfect for trains with poor connectivity

### Real Cryptography
- Not mock data - actual Groth16 proofs
- Elliptic curve pairing checks
- Production-ready (with proper key ceremony)

## Files You Need to Know About

### Generated Circuit Files
```
circuits/
├── ticket.wasm                ← Compiled circuit (2 MB)
├── ticket.zkey                ← Proving key (4 MB, keep private!)
├── verification_key.json      ← Public verification key (3 KB)
└── ticket.circom             ← Circuit source code
```

### Backend
```
packages/backend/src/zk/
├── proof-generator.ts         ← Uses snarkjs.groth16.fullProve()
└── proof-verifier.ts         ← Uses snarkjs.groth16.verify()
```

### Frontend
```
packages/frontend/src/utils/
└── zkVerifier.ts             ← Client-side verification
```

## Documentation

| File | Purpose |
|------|---------|
| `REAL_ZK_PROOFS.md` | Complete implementation summary |
| `circuits/QUICKSTART.md` | Circuit setup guide |
| `circuits/README.md` | Detailed circuit documentation |
| `ARCHITECTURE.md` | System architecture |
| `README.md` | Project overview |

## Regenerate Circuits (Optional)

If you want to regenerate the circuits:

```bash
cd circuits
./setup.sh
```

Takes ~5-10 minutes. Generates fresh keys and compiles circuit.

## Troubleshooting

### "Circuit files not found"
Run `cd circuits && ./setup.sh` to generate them.

### Slow proof generation
Normal! Real ZK proofs take 1-2 seconds to generate.

### Backend won't start
Ensure database is running: `pnpm db:up`

### Frontend can't connect
Ensure backend is running on port 3001.

## Performance

| Operation | Time |
|-----------|------|
| Ticket purchase (with proof) | ~2 seconds |
| Ticket verification | <100ms |
| Offline verification | <100ms |

## Next Steps

1. **Test it thoroughly** - Buy and scan multiple tickets
2. **Check the console** - See cryptographic operations in action
3. **Read the docs** - Learn about zero-knowledge proofs
4. **Customize** - Modify the circuit for your needs

## Learn More

- **Zero-Knowledge Proofs**: https://z.cash/technology/zksnarks/
- **Circom**: https://docs.circom.io/
- **Groth16**: https://eprint.iacr.org/2016/260.pdf
- **BN128 Curve**: https://hackmd.io/@jpw/bn254

---

**🎉 Enjoy your zero-knowledge ticket system!** 🔐✨

Questions? Check `REAL_ZK_PROOFS.md` for detailed information.

