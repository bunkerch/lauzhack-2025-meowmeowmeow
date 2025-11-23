/**
 * JWT Ticket Signer with RSA
 * 
 * Signs ticket claims using RS256 (RSA with SHA-256).
 * Keys are persisted to filesystem for development.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { type TicketClaims } from './ticket-service';

// Key storage paths
const KEYS_DIR = path.join(__dirname, '../../.keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'jwt-private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'jwt-public.pem');

// RSA key pair
let privateKey: string;
let publicKey: string;

/**
 * Load or generate RSA key pair
 */
function initializeKeys() {
    if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
        // Load from environment variables (production)
        console.log('📝 Loading RSA keys from environment variables');
        privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
        publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    } else {
        // Check if keys exist on filesystem
        if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
            console.log('🔑 Loading existing RSA keys from filesystem');
            privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
            publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
        } else {
            // Generate new keys and save to filesystem
            console.log('⚠️  Generating new RSA keys for development...');
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

            // Save keys to filesystem
            if (!fs.existsSync(KEYS_DIR)) {
                fs.mkdirSync(KEYS_DIR, { recursive: true });
            }
            fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, 'utf8');
            fs.writeFileSync(PUBLIC_KEY_PATH, publicKey, 'utf8');
            console.log('💾 RSA keys saved to filesystem');
            console.log(`   Private key: ${PRIVATE_KEY_PATH}`);
            console.log(`   Public key: ${PUBLIC_KEY_PATH}`);
        }
    }
}

// Initialize keys on module load
initializeKeys();

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
