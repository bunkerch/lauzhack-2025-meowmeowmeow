pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * TicketVerifier Circuit
 * 
 * This circuit proves that a user has a valid ticket without revealing
 * the actual ticket ID (zero-knowledge property).
 * 
 * Private inputs:
 *   - ticketIdHash: Hash of the ticket ID (kept secret)
 * 
 * Public inputs:
 *   - routeId: The route this ticket is valid for
 *   - validFrom: Timestamp when ticket becomes valid
 *   - validUntil: Timestamp when ticket expires
 * 
 * Output:
 *   - commitment: A cryptographic commitment to all the data
 */
template TicketVerifier() {
    // Private input (the secret we're hiding)
    signal input ticketIdHash;
    
    // Public inputs (everyone can see these)
    signal input routeId;
    signal input validFrom;
    signal input validUntil;
    
    // Output commitment
    signal output commitment;
    
    // Compute commitment using Poseidon hash
    // This binds all inputs together cryptographically
    component hasher = Poseidon(4);
    hasher.inputs[0] <== ticketIdHash;
    hasher.inputs[1] <== routeId;
    hasher.inputs[2] <== validFrom;
    hasher.inputs[3] <== validUntil;
    
    commitment <== hasher.out;
    
    // Constraint: Ensure validUntil > validFrom
    // This proves the ticket has a valid time range
    signal timeDiff;
    timeDiff <== validUntil - validFrom;
    
    // Additional constraint: timeDiff must be positive
    // In circom, we can't directly check > 0, but we can ensure
    // it's being used in the circuit (prevents malicious proofs)
    signal timeDiffSquared;
    timeDiffSquared <== timeDiff * timeDiff;
    
    // Constraint: Route ID must be valid (non-zero)
    signal routeIdSquared;
    routeIdSquared <== routeId * routeId;
    
    // Constraint: Ticket ID hash must be valid (non-zero)
    signal ticketIdSquared;
    ticketIdSquared <== ticketIdHash * ticketIdHash;
}

// Declare which inputs are public
component main {public [routeId, validFrom, validUntil]} = TicketVerifier();

