import * as snarkjs from 'snarkjs';
import * as path from 'path';
import * as fs from 'fs';

const VERIFICATION_KEY_PATH = path.join(__dirname, '../../../circuits/verification_key.json');

/**
 * Verify a zero-knowledge proof using REAL snarkjs verification
 * This performs actual cryptographic verification!
 */
export async function verifyTicketProof(proof: any, publicSignals: any[]): Promise<boolean> {
  console.log('🔐 Verifying ZK proof with snarkjs on backend...');

  // Load verification key
  if (!fs.existsSync(VERIFICATION_KEY_PATH)) {
    throw new Error(
      `Verification key not found at: ${VERIFICATION_KEY_PATH}\n` +
      `Please compile the circuit first:\n` +
      `  cd circuits && ./setup.sh`
    );
  }

  console.log('✅ Loading verification key from file');
  const verificationKey = JSON.parse(fs.readFileSync(VERIFICATION_KEY_PATH, 'utf8'));

  // Basic validation
  if (!proof || !publicSignals || publicSignals.length !== 4) {
    console.error('❌ Invalid proof structure');
    return false;
  }

  // Validate proof structure
  if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
    console.error('❌ Missing proof components');
    return false;
  }

  if (proof.protocol !== "groth16" || proof.curve !== "bn128") {
    console.error('❌ Invalid protocol or curve');
    return false;
  }

  // Validate public signals are numbers
  for (const signal of publicSignals) {
    if (isNaN(Number(signal))) {
      console.error('❌ Invalid public signal (not a number)');
      return false;
    }
  }

  // Convert proof to snarkjs format
  const snarkProof = {
    pi_a: proof.pi_a.slice(0, 2),
    pi_b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]],
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    pi_c: proof.pi_c.slice(0, 2),
    protocol: proof.protocol,
    curve: proof.curve,
  };

  // Convert public signals to strings
  const signals = publicSignals.map(s => s.toString());

  console.log('  → Calling snarkjs.groth16.verify()...');

  // REAL SNARKJS VERIFICATION
  const isValid = await snarkjs.groth16.verify(
    verificationKey,
    signals,
    snarkProof
  );

  if (isValid) {
    console.log('  ✅ Proof is cryptographically VALID!');
  } else {
    console.log('  ❌ Proof verification FAILED!');
  }

  return isValid;
}
