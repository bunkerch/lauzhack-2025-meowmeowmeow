/**
 * Public Key Routes
 * 
 * Exposes the RSA public key for JWT verification
 */

import { Router } from 'express';
import { getPublicKey } from '../services/jwt-signer';

export const publicKeyRoutes = Router();

/**
 * GET /api/public-key
 * Returns the RSA public key in PEM format for JWT verification
 */
publicKeyRoutes.get('/', (req, res) => {
    try {
        const publicKey = getPublicKey();
        
        res.json({
            success: true,
            publicKey,
            algorithm: 'RS256',
            format: 'PEM'
        });
    } catch (error) {
        console.error('Error retrieving public key:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve public key'
        });
    }
});
