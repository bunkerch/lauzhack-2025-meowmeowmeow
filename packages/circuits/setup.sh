#!/bin/bash

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              ZK Circuit Setup for CFF Tickets                 ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CIRCUIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CIRCUIT_DIR"

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo -e "${RED}✗ circom not found${NC}"
    echo ""
    echo "Please install circom:"
    echo "  Option 1 (recommended): Download from https://github.com/iden3/circom/releases"
    echo "  Option 2: Build from source:"
    echo "    git clone https://github.com/iden3/circom.git"
    echo "    cd circom"
    echo "    cargo build --release"
    echo "    cargo install --path circom"
    exit 1
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}✗ snarkjs not found${NC}"
    echo ""
    echo "Installing snarkjs globally..."
    npm install -g snarkjs
fi

echo -e "${GREEN}✓ Prerequisites found${NC}"
echo ""

# Step 1: Install circomlib
echo -e "${BLUE}Step 1/7: Installing circomlib...${NC}"
if [ ! -d "../node_modules/circomlib" ]; then
    cd ..
    pnpm add -D circomlib
    cd circuits
fi
echo -e "${GREEN}✓ circomlib installed${NC}"
echo ""

# Step 2: Compile circuit
echo -e "${BLUE}Step 2/7: Compiling circuit...${NC}"
circom ticket.circom --r1cs --wasm --sym --output .
echo -e "${GREEN}✓ Circuit compiled${NC}"
echo "  - ticket.r1cs (constraint system)"
echo "  - ticket.sym (symbols)"
echo "  - ticket_js/ticket.wasm (compiled circuit)"
echo ""

# Step 3: Powers of Tau
echo -e "${BLUE}Step 3/7: Generating Powers of Tau...${NC}"
if [ ! -f "pot12_final.ptau" ]; then
    echo "  This may take a few minutes..."
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau \
        --name="First contribution" \
        --entropy="$(date +%s)" -v
    snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v
    
    # Clean up intermediate files
    rm pot12_0000.ptau pot12_0001.ptau
else
    echo -e "${YELLOW}  ✓ Using existing Powers of Tau${NC}"
fi
echo -e "${GREEN}✓ Powers of Tau ready${NC}"
echo ""

# Step 4: Generate proving key
echo -e "${BLUE}Step 4/7: Generating proving key (zkey)...${NC}"
snarkjs groth16 setup ticket.r1cs pot12_final.ptau ticket_0000.zkey
snarkjs zkey contribute ticket_0000.zkey ticket.zkey \
    --name="Contribution" \
    --entropy="$(date +%s)" -v

# Clean up intermediate key
rm ticket_0000.zkey

echo -e "${GREEN}✓ Proving key generated (ticket.zkey)${NC}"
echo ""

# Step 5: Export verification key
echo -e "${BLUE}Step 5/7: Exporting verification key...${NC}"
snarkjs zkey export verificationkey ticket.zkey verification_key.json
echo -e "${GREEN}✓ Verification key exported${NC}"
echo ""

# Step 6: Copy WASM to root of circuits directory
echo -e "${BLUE}Step 6/7: Copying WASM file...${NC}"
cp ticket_js/ticket.wasm .
echo -e "${GREEN}✓ WASM file ready${NC}"
echo ""

# Step 7: Test the circuit
echo -e "${BLUE}Step 7/7: Testing circuit...${NC}"

# Create test input
cat > test_input.json << EOF
{
  "ticketIdHash": "12345678901234567890",
  "routeId": "1",
  "validFrom": "1704067200",
  "validUntil": "1704153600"
}
EOF

echo "  Generating witness..."
node ticket_js/generate_witness.js ticket_js/ticket.wasm test_input.json witness.wtns

echo "  Generating test proof..."
snarkjs groth16 prove ticket.zkey witness.wtns proof.json public.json

echo "  Verifying test proof..."
if snarkjs groth16 verify verification_key.json public.json proof.json; then
    echo -e "${GREEN}  ✓ Test proof verified successfully!${NC}"
else
    echo -e "${RED}  ✗ Test proof verification failed!${NC}"
    exit 1
fi

# Clean up test files
rm test_input.json witness.wtns proof.json public.json

echo -e "${GREEN}✓ Circuit tested successfully${NC}"
echo ""

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║                    ✅ SETUP COMPLETE! ✅                      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Generated files:"
echo "  ✓ ticket.wasm            - Compiled circuit"
echo "  ✓ ticket.zkey            - Proving key"
echo "  ✓ verification_key.json  - Verification key"
echo "  ✓ ticket.r1cs            - Constraint system"
echo "  ✓ ticket.sym             - Symbols"
echo ""
echo -e "${GREEN}Your backend will now generate REAL ZK-SNARK proofs!${NC}"
echo ""
echo "To update frontend verification key:"
echo "  1. Copy content from verification_key.json"
echo "  2. Replace VERIFICATION_KEY in packages/frontend/src/utils/zkVerifier.ts"
echo ""
echo "Restart your backend to start using real proofs:"
echo "  cd .. && pnpm backend"
echo ""

