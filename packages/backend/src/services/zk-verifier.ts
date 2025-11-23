/**
 * ZK Proof Verifier
 * 
 * Verifies zero-knowledge payment proofs using the PaymentProof circuit.
 */

import * as snarkjs from 'snarkjs';
import * as path from 'path';
import * as fs from 'fs';
import { quoteIdToField } from '../utils/field-encoding';
import { paymentService } from './payment-service';

// Load verification key
const verificationKeyPath = path.join(__dirname, '../../../circuits/verification_key.json');
let verificationKey: any = null;

try {
    const vkData = fs.readFileSync(verificationKeyPath, 'utf8');
    verificationKey = JSON.parse(vkData);
    console.log('✅ Loaded ZK verification key');
} catch (error) {
    console.error('❌ Failed to load verification key:', error);
}

export interface ZKProofRequest {
    quoteId: string;
    priceCents: number;
    root: string;
    proof: any;
    publicSignals: string[];
}

export interface ZKVerificationResult {
    valid: boolean;
    error?: string;
}

/**
 * Verify a ZK payment proof.
 * 
 * This verifies that:
 * 1. The proof is cryptographically valid
 * 2. The public signals match the expected values
 * 3. The root matches the current Payment Service root
 */
export async function verifyPaymentProof(request: ZKProofRequest): Promise<ZKVerificationResult> {
    try {
        if (!verificationKey) {
            return { valid: false, error: 'Verification key not loaded' };
        }

        // Verify the cryptographic proof
        const proofValid = await snarkjs.groth16.verify(
            verificationKey,
            request.publicSignals,
            request.proof
        );

        if (!proofValid) {
            return { valid: false, error: 'Invalid cryptographic proof' };
        }

        // Extract public signals
        // According to the circuit, the public outputs are: [out_root, out_quoteId, out_price]
        const [out_root, out_quoteId, out_price] = request.publicSignals;

        // Verify root matches
        if (out_root !== request.root) {
            return { valid: false, error: 'Root mismatch in public signals' };
        }

        // Verify price matches
        if (out_price !== request.priceCents.toString()) {
            return { valid: false, error: 'Price mismatch in public signals' };
        }

        // Verify quoteId matches
        const expectedQuoteIdField = quoteIdToField(request.quoteId);
        if (out_quoteId !== expectedQuoteIdField) {
            return { valid: false, error: 'QuoteId mismatch in public signals' };
        }

        // Verify root matches the current Payment Service root
        const currentRoot = paymentService.getCurrentRoot();
        if (request.root !== currentRoot) {
            return { valid: false, error: 'Root does not match current Payment Service root' };
        }

        return { valid: true };

    } catch (error) {
        console.error('ZK verification error:', error);
        return { valid: false, error: 'Verification failed: ' + (error as Error).message };
    }
}

