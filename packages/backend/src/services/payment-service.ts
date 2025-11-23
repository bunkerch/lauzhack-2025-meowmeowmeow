/**
 * Payment Service
 * 
 * Handles payment processing and maintains a Merkle tree of payment commitments.
 * Each payment generates an anonymous commitment that can be proven in zero-knowledge.
 */

import crypto from 'crypto';
import { buildPoseidon } from 'circomlibjs';
import { MerkleTree, type MerklePath } from '../utils/merkle-tree';
import { quoteIdToField } from '../utils/field-encoding';

export interface PaymentRequest {
    quoteId: string;
    priceCents: number;
    paymentMethod: string;  // For PoC, this is mocked
}

export interface PaymentResponse {
    success: boolean;
    secret?: string;
    quoteId?: string;
    priceCents?: number;
    root?: string;
    merklePath?: MerklePath;
    error?: string;
}

class PaymentService {
    private merkleTree: MerkleTree | null = null;
    private poseidon: any;
    private initialized: boolean = false;

    constructor() {
        // Merkle tree will be created during initialization
    }

    /**
     * Initialize the payment service.
     * This must be called before processing any payments.
     */
    async initialize(): Promise<void> {
        if (!this.initialized) {
            await MerkleTree.initialize();
            this.poseidon = await buildPoseidon();
            this.merkleTree = new MerkleTree(20);  // Depth 20 supports ~1M payments
            this.initialized = true;
            console.log('✅ Payment Service initialized');
        }
    }

    /**
     * Process a payment and create an anonymous commitment.
     * 
     * @param request - The payment request
     * @returns Payment response with secret and Merkle proof
     */
    async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
        if (!this.initialized || !this.merkleTree) {
            return { success: false, error: 'Payment service not initialized' };
        }

        try {
            // Validate inputs
            if (!request.quoteId || !request.priceCents || request.priceCents <= 0) {
                return { success: false, error: 'Invalid payment request' };
            }

            // Mock payment processing (in production, this would call a real payment gateway)
            console.log(`💳 Processing payment for quote ${request.quoteId}, amount: ${request.priceCents} cents`);

            // Generate a random secret for this payment
            const secret = this._generateSecret();

            // Convert quoteId to field element
            const quoteIdField = quoteIdToField(request.quoteId);

            // Compute payment commitment: leaf = Poseidon(secret, quoteIdField, priceCents)
            const commitment = this.poseidon([
                BigInt(secret),
                BigInt(quoteIdField),
                BigInt(request.priceCents)
            ]);
            const leaf = this.poseidon.F.toString(commitment);

            console.log(`  Secret: ${secret.slice(0, 20)}...`);
            console.log(`  Commitment: ${leaf.slice(0, 30)}...`);

            // Insert commitment into Merkle tree
            const leafIndex = this.merkleTree.insert(leaf);
            console.log(`  Inserted at index: ${leafIndex}`);

            // Get Merkle proof
            const merklePath = this.merkleTree.getProof(leafIndex);

            // Get current root
            const root = this.merkleTree.getRoot();
            console.log(`  Current root: ${root.slice(0, 30)}...`);

            // Return payment data to client
            return {
                success: true,
                secret,
                quoteId: request.quoteId,
                priceCents: request.priceCents,
                root,
                merklePath
            };

        } catch (error) {
            console.error('❌ Payment processing error:', error);
            return { success: false, error: 'Payment processing failed' };
        }
    }

    /**
     * Get the current Merkle root.
     * The Ticket Backend needs this to verify proofs.
     * 
     * @returns The current root hash
     */
    getCurrentRoot(): string {
        if (!this.merkleTree) {
            throw new Error('Payment service not initialized');
        }
        return this.merkleTree.getRoot();
    }

    /**
     * Get statistics about the payment tree.
     */
    getStats() {
        if (!this.merkleTree) {
            throw new Error('Payment service not initialized');
        }
        return {
            totalPayments: this.merkleTree.leafCount,
            currentRoot: this.merkleTree.getRoot(),
            treeDepth: 20
        };
    }

    /**
     * Generate a cryptographically secure random secret.
     * @returns A random secret as a decimal string
     */
    private _generateSecret(): string {
        // Generate 32 random bytes
        const randomBytes = crypto.randomBytes(32);
        
        // Convert to BigInt
        let secret = 0n;
        for (const byte of randomBytes) {
            secret = secret * 256n + BigInt(byte);
        }

        // Ensure it's within the field
        const p = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
        secret = secret % p;

        return secret.toString();
    }
}

// Singleton instance
export const paymentService = new PaymentService();

