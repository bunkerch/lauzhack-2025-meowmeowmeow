/**
 * Payment Service Routes
 * 
 * Endpoints for processing payments and retrieving Merkle root.
 */

import { Router } from 'express';
import { paymentService, type PaymentRequest } from '../services/payment-service';

export const paymentRoutes = Router();

/**
 * POST /api/payment/pay
 * 
 * Process a payment and return the secret + Merkle proof.
 * The client will use this to generate a ZK proof.
 */
paymentRoutes.post('/pay', async (req, res) => {
    try {
        const paymentRequest: PaymentRequest = {
            quoteId: req.body.quoteId,
            priceCents: req.body.priceCents,
            paymentMethod: req.body.paymentMethod || 'mock'
        };

        const response = await paymentService.processPayment(paymentRequest);

        if (response.success) {
            res.json(response);
        } else {
            res.status(400).json(response);
        }
    } catch (error) {
        console.error('Payment endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

/**
 * GET /api/payment/root
 * 
 * Get the current Merkle root.
 * The Ticket Backend uses this to verify proofs.
 */
paymentRoutes.get('/root', (req, res) => {
    try {
        const root = paymentService.getCurrentRoot();
        res.json({ root });
    } catch (error) {
        console.error('Get root endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/payment/stats
 * 
 * Get statistics about the payment service.
 * This is for monitoring/debugging.
 */
paymentRoutes.get('/stats', (req, res) => {
    try {
        const stats = paymentService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Get stats endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

