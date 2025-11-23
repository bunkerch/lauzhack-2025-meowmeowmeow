/**
 * JWT Ticket Signer
 * 
 * Signs ticket claims using EdDSA for offline verification.
 * In production, use a proper key management system.
 */

import crypto from 'crypto';
import { type TicketClaims } from './ticket-service';

// For PoC, we'll use a simple symmetric signing approach
// In production, use EdDSA (Ed25519) with proper key management
const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

/**
 * Sign ticket claims and create a JWT.
 */
export function signTicketJwt(claims: TicketClaims): string {
    // Create JWT header
    const header = {
        alg: 'HS256',  // In production, use EdDSA
        typ: 'JWT'
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(claims));

    // Create signature
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(signatureInput)
        .digest('base64url');

    // Return complete JWT
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a ticket JWT.
 */
export function verifyTicketJwt(token: string): { valid: boolean; claims?: TicketClaims; error?: string } {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false, error: 'Invalid JWT format' };
        }

        const [encodedHeader, encodedPayload, signature] = parts;

        // Verify signature
        const signatureInput = `${encodedHeader}.${encodedPayload}`;
        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(signatureInput)
            .digest('base64url');

        if (signature !== expectedSignature) {
            return { valid: false, error: 'Invalid signature' };
        }

        // Decode payload
        const payload = JSON.parse(base64UrlDecode(encodedPayload));

        // Verify timing
        const now = Math.floor(Date.now() / 1000);
        if (now < payload.validFrom) {
            return { valid: false, error: 'Ticket not yet valid' };
        }
        if (now > payload.validUntil) {
            return { valid: false, error: 'Ticket expired' };
        }

        return { valid: true, claims: payload };

    } catch (error) {
        return { valid: false, error: 'JWT verification failed' };
    }
}

function base64UrlEncode(str: string): string {
    return Buffer.from(str)
        .toString('base64url');
}

function base64UrlDecode(str: string): string {
    return Buffer.from(str, 'base64url').toString('utf8');
}

