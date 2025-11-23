/**
 * JWT Ticket Signer with RSA
 * 
 * Signs ticket claims using RS256 (RSA with SHA-256).
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { type TicketClaims } from './ticket-service';

// Generate RSA key pair (in production, load from secure storage)
// This is done once at startup
let privateKey: string;
let publicKey: string;

if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
    // Load from environment variables (production)
    privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
    publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
} else {
    // Generate keys for development
    console.log('⚠️  Generating RSA keys for development. In production, use proper key management!');
    const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    privateKey = privKey;
    publicKey = pubKey;
}

/**
 * Sign ticket claims and create a JWT with RS256.
 */
export function signTicketJwt(claims: TicketClaims): string {
    return jwt.sign(claims, privateKey, {
        algorithm: 'RS256',
    });
}

/**
 * Verify and decode a ticket JWT.
 */
export function verifyTicketJwt(token: string): { valid: boolean; claims?: TicketClaims; error?: string } {
    try {
        const decoded = jwt.verify(token, publicKey, {
            algorithms: ['RS256']
        }) as TicketClaims;

        return { valid: true, claims: decoded };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return { valid: false, error: 'Ticket expired' };
        } else if (error instanceof jwt.NotBeforeError) {
            return { valid: false, error: 'Ticket not yet valid' };
        } else if (error instanceof jwt.JsonWebTokenError) {
            return { valid: false, error: `JWT verification failed: ${error.message}` };
        }
        
        return { valid: false, error: 'JWT verification failed' };
    }
}

/**
 * Get the public key for external verification.
 */
export function getPublicKey(): string {
    return publicKey;
}
