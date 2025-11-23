/**
 * ZK Proof Generator (Frontend)
 * 
 * Generates zero-knowledge payment proofs using the PaymentProof circuit.
 */

import * as snarkjs from 'snarkjs';
import { quoteIdToField } from './fieldEncoding';

export interface PaymentData {
    secret: string;
    quoteId: string;
    priceCents: number;
    root: string;
    merklePath: {
        pathElements: string[];
        pathIndices: number[];
    };
}

export interface ProofResult {
    proof: any;
    publicSignals: string[];
}

/**
 * Generate a ZK payment proof.
 * 
 * This proves that the user has made a valid payment without revealing
 * which specific payment or their identity.
 */
export async function generatePaymentProof(paymentData: PaymentData): Promise<ProofResult> {
    try {
        console.log('🔐 Generating ZK payment proof...');

        // Convert quoteId to field element
        const quoteIdField = await quoteIdToField(paymentData.quoteId);
        console.log('  QuoteId field:', quoteIdField.slice(0, 20) + '...');

        // Prepare circuit inputs
        const inputs = {
            // Public inputs
            root: paymentData.root,
            quoteId: quoteIdField,
            price: paymentData.priceCents.toString(),
            
            // Private inputs
            secret: paymentData.secret,
            pathElements: paymentData.merklePath.pathElements,
            pathIndices: paymentData.merklePath.pathIndices
        };

        console.log('  Inputs prepared, proving...');

        // Generate proof using snarkjs
        // The circuit artifacts should be served from public/circuits/
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            '/circuits/ticket_js/ticket.wasm',
            '/circuits/ticket.zkey'
        );

        console.log('✅ ZK proof generated successfully');
        console.log('  Public signals:', publicSignals);

        return { proof, publicSignals };

    } catch (error) {
        console.error('❌ ZK proof generation failed:', error);
        throw new Error('Failed to generate ZK proof: ' + (error as Error).message);
    }
}
