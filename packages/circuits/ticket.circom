pragma circom 2.1.4;

include "../../node_modules/circomlib/circuits/poseidon.circom";

/*
 * MerklePathVerifier
 * 
 * Verifies that a leaf exists in a Merkle tree using Poseidon hash.
 * 
 * Inputs:
 *   - leaf: The leaf to verify
 *   - root: The expected Merkle root
 *   - pathElements[depth]: Sibling hashes along the path
 *   - pathIndices[depth]: 0 = current is left child, 1 = current is right child
 */
template MerklePathVerifier(depth) {
    signal input leaf;
    signal input root;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    signal hash[depth + 1];
    signal left[depth];
    signal right[depth];
    signal leftSelector[depth];
    signal rightSelector[depth];
    signal leftSelector2[depth];
    signal rightSelector2[depth];

    component hashers[depth];

    // Start with the leaf at level 0
    hash[0] <== leaf;

    // Enforce boolean constraints on pathIndices
    for (var i = 0; i < depth; i++) {
        pathIndices[i] * (pathIndices[i] - 1) === 0;
    }

    // Compute the root from leaf and path
    for (var i = 0; i < depth; i++) {
        hashers[i] = Poseidon(2);

        // If pathIndices[i] == 0: current node is left child
        //   left  = hash[i]
        //   right = pathElements[i]
        // If pathIndices[i] == 1: current node is right child
        //   left  = pathElements[i]
        //   right = hash[i]
        
        // Break down into quadratic constraints
        leftSelector[i] <== (1 - pathIndices[i]) * hash[i];
        rightSelector[i] <== pathIndices[i] * pathElements[i];
        left[i] <== leftSelector[i] + rightSelector[i];
        
        leftSelector2[i] <== pathIndices[i] * hash[i];
        rightSelector2[i] <== (1 - pathIndices[i]) * pathElements[i];
        right[i] <== leftSelector2[i] + rightSelector2[i];

        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];

        hash[i + 1] <== hashers[i].out;
    }

    // Enforce that computed root matches the expected root
    root === hash[depth];
}

/*
 * PaymentProof Circuit
 * 
 * Proves that a valid payment exists in the Payment Service's Merkle tree
 * without revealing which specific payment (zero-knowledge property).
 * 
 * Public inputs:
 *   - root: Merkle root of the Payment Service's commitment tree
 *   - quoteId: Field representation of the quote ID
 *   - price: Ticket price in cents
 * 
 * Private inputs:
 *   - secret: Random secret generated during payment
 *   - pathElements[depth]: Merkle path siblings
 *   - pathIndices[depth]: Merkle path directions
 * 
 * The circuit proves:
 *   1. leaf = Poseidon(secret, quoteId, price)
 *   2. leaf is in the Merkle tree with the given root
 */
template PaymentProof(depth) {
    // PUBLIC inputs (visible to everyone)
    signal input root;     // Merkle root
    signal input quoteId;  // Field representation of quoteId
    signal input price;    // Price in cents

    // PRIVATE inputs (kept secret by the prover)
    signal input secret;                  // Payment secret
    signal input pathElements[depth];    // Merkle path siblings
    signal input pathIndices[depth];     // Merkle path directions

    // Compute the payment commitment leaf
    // leaf = Poseidon(secret, quoteId, price)
    component leafHasher = Poseidon(3);
    leafHasher.inputs[0] <== secret;
    leafHasher.inputs[1] <== quoteId;
    leafHasher.inputs[2] <== price;

    signal leaf;
    leaf <== leafHasher.out;

    // Verify that the leaf is in the Merkle tree
    component merkleVerifier = MerklePathVerifier(depth);
    merkleVerifier.leaf <== leaf;
    merkleVerifier.root <== root;

    for (var i = 0; i < depth; i++) {
        merkleVerifier.pathElements[i] <== pathElements[i];
        merkleVerifier.pathIndices[i] <== pathIndices[i];
    }

    // Output public signals for verification
    signal output out_root;
    out_root <== root;

    signal output out_quoteId;
    out_quoteId <== quoteId;

    signal output out_price;
    out_price <== price;
}

// Merkle tree depth = 20 (supports up to 2^20 = ~1 million payments)
component main {public [root, quoteId, price]} = PaymentProof(20);

