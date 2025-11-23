import { Router, type Router as ExpressRouter } from 'express';
import { db } from '../database/db';
import { routes, tickets } from '../database/schema';
import { eq } from 'drizzle-orm';
import { verifyTicketProof } from '../zk/proof-verifier';
import { authenticateStaff } from '../middleware/auth';
import {
  VerifyTicketRequestSchema,
  ScanTicketRequestSchema,
  VerifyOfflineRequestSchema,
  JWTScanRequestSchema,
  type VerifyTicketRequest,
  type ScanTicketRequest,
  type VerifyOfflineRequest,
  type JWTScanRequest
} from '../schemas/validation';
import { verifyTicketJwt } from '../services/jwt-signer';

export const verificationRoutes: ExpressRouter = Router();

// Full verification endpoint (marks ticket as used)
verificationRoutes.post('/', async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = VerifyTicketRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }

    const { ticketId, proof, publicSignals } = validationResult.data;

    // Get ticket from database using Drizzle
    const result = await db.select({
      id: tickets.id,
      ticketType: tickets.ticketType,
      validFrom: tickets.validFrom,
      validUntil: tickets.validUntil,
      isUsed: tickets.isUsed,
      origin: routes.origin,
      destination: routes.destination,
    })
      .from(tickets)
      .innerJoin(routes, eq(tickets.routeId, routes.id))
      .where(eq(tickets.id, ticketId))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ 
        valid: false, 
        error: 'Ticket not found' 
      });
    }

    const ticket = result[0];

    // Check if ticket has already been used
    if (ticket.isUsed) {
      return res.json({
        valid: false,
        error: 'Ticket has already been used',
      });
    }

    // Check if ticket is within valid period
    const now = new Date();
    const validFrom = new Date(ticket.validFrom);
    const validUntil = new Date(ticket.validUntil);

    if (now < validFrom || now > validUntil) {
      return res.json({
        valid: false,
        error: 'Ticket is not valid for current date/time',
        validFrom: ticket.validFrom,
        validUntil: ticket.validUntil,
      });
    }

    // Verify ZK proof
    const isProofValid = await verifyTicketProof(proof, publicSignals);

    if (!isProofValid) {
      return res.json({
        valid: false,
        error: 'Invalid proof',
      });
    }

    // Mark ticket as used using Drizzle
    await db.update(tickets)
      .set({ 
        isUsed: true, 
        usedAt: new Date() 
      })
      .where(eq(tickets.id, ticketId));

    res.json({
      valid: true,
      ticket: {
        id: ticket.id,
        route: {
          origin: ticket.origin,
          destination: ticket.destination,
        },
        ticketType: ticket.ticketType,
        validFrom: ticket.validFrom,
        validUntil: ticket.validUntil,
      },
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    res.status(500).json({ error: 'Failed to verify ticket' });
  }
});

// Scanner endpoint - verifies QR code content (supports offline mode)
// Protected: Requires staff authentication
verificationRoutes.post('/scan', authenticateStaff, async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = ScanTicketRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }

    const { 
      ticketId, 
      proof, 
      publicSignals, 
      validFrom, 
      validUntil, 
      routeId,
      offline 
    } = validationResult.data;

    // STEP 1: Verify the cryptographic proof (OFFLINE)
    const isProofValid = await verifyTicketProof(proof, publicSignals);

    if (!isProofValid) {
      return res.json({
        valid: false,
        message: 'Invalid cryptographic proof - ticket may be forged',
        verificationMethod: 'offline',
      });
    }

    // STEP 2: Check validity period (OFFLINE)
    const now = new Date();
    const ticketValidFrom = new Date(validFrom);
    const ticketValidUntil = new Date(validUntil);

    if (now < ticketValidFrom) {
      return res.json({
        valid: false,
        message: 'Ticket not yet valid',
        validFrom,
        verificationMethod: 'offline',
      });
    }

    if (now > ticketValidUntil) {
      return res.json({
        valid: false,
        message: 'Ticket has expired',
        validUntil,
        verificationMethod: 'offline',
      });
    }

    // If offline mode, stop here (proof is valid, don't check database)
    if (offline) {
      // Try to get route info for display, but don't fail if offline
      let routeInfo = null;
      try {
        const routeResult = await db.select({
          origin: routes.origin,
          destination: routes.destination,
        })
          .from(routes)
          .where(eq(routes.id, routeId))
          .limit(1);
        
        if (routeResult.length > 0) {
          routeInfo = routeResult[0];
        }
      } catch (err) {
        // Database unavailable, that's okay in offline mode
        console.log('Database unavailable in offline mode');
      }

      return res.json({
        valid: true,
        message: 'Ticket is valid (offline verification)',
        verificationMethod: 'offline',
        ticket: {
          route: routeInfo ? `${routeInfo.origin} → ${routeInfo.destination}` : `Route ${routeId}`,
          validUntil,
        },
        warning: 'Cannot verify if ticket was already used (offline mode)',
      });
    }

    // STEP 3: Check database for "already used" status (ONLINE)
    try {
      const result = await db.select({
        id: tickets.id,
        ticketType: tickets.ticketType,
        isUsed: tickets.isUsed,
        origin: routes.origin,
        destination: routes.destination,
      })
        .from(tickets)
        .innerJoin(routes, eq(tickets.routeId, routes.id))
        .where(eq(tickets.id, ticketId))
        .limit(1);

      if (result.length === 0) {
        return res.json({
          valid: true,
          message: 'Ticket is valid (proof verified, but not in database)',
          verificationMethod: 'online',
          ticket: {
            route: `Route ${routeId}`,
            validUntil,
          },
          warning: 'Ticket not found in database - may have been issued elsewhere',
        });
      }

      const ticket = result[0];

      if (ticket.isUsed) {
        return res.json({
          valid: false,
          message: 'Ticket has already been used',
          verificationMethod: 'online',
          ticket: {
            route: `${ticket.origin} → ${ticket.destination}`,
            validUntil,
          },
        });
      }

      // All checks passed!
      return res.json({
        valid: true,
        message: 'Ticket is valid',
        verificationMethod: 'online',
        ticket: {
          route: `${ticket.origin} → ${ticket.destination}`,
          type: ticket.ticketType,
          validUntil,
        },
      });
    } catch (dbError) {
      // Database error - but proof is still valid!
      console.error('Database error during verification:', dbError);
      return res.json({
        valid: true,
        message: 'Ticket is valid (proof verified, database unavailable)',
        verificationMethod: 'offline-fallback',
        ticket: {
          route: `Route ${routeId}`,
          validUntil,
        },
        warning: 'Cannot verify if ticket was already used (database unavailable)',
      });
    }
  } catch (error) {
    console.error('Error scanning ticket:', error);
    res.status(500).json({ 
      error: 'Failed to scan ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Offline verification endpoint - pure cryptographic verification
verificationRoutes.post('/verify-offline', async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = VerifyOfflineRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }

    const { 
      proof, 
      publicSignals, 
      validFrom, 
      validUntil 
    } = validationResult.data;

    // Verify cryptographic proof
    const isProofValid = await verifyTicketProof(proof, publicSignals);

    if (!isProofValid) {
      return res.json({
        valid: false,
        message: 'Invalid cryptographic proof',
      });
    }

    // Check validity period
    const now = new Date();
    const ticketValidFrom = new Date(validFrom);
    const ticketValidUntil = new Date(validUntil);

    if (now < ticketValidFrom || now > ticketValidUntil) {
      return res.json({
        valid: false,
        message: 'Ticket not valid for current date/time',
        validFrom,
        validUntil,
      });
    }

    res.json({
      valid: true,
      message: 'Ticket cryptographically valid',
      note: 'Offline verification only - cannot check if ticket was already used',
    });
  } catch (error) {
    console.error('Error in offline verification:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// JWT ticket scan endpoint
// Protected: Requires staff authentication
verificationRoutes.post('/scan-jwt', authenticateStaff, async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = JWTScanRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }

    const { jwt: jwtToken, offline } = validationResult.data;

    // STEP 1: Verify and decode JWT (OFFLINE)
    const verificationResult = verifyTicketJwt(jwtToken);
    
    if (!verificationResult.valid || !verificationResult.claims) {
      return res.json({
        valid: false,
        message: verificationResult.error || 'Invalid JWT ticket',
        verificationMethod: 'offline',
      });
    }

    const claims = verificationResult.claims;

    // If offline mode, stop here (JWT is valid, don't check database)
    if (offline) {
      return res.json({
        valid: true,
        message: 'JWT ticket is valid (offline verification)',
        verificationMethod: 'offline',
        ticket: {
          route: `${claims.origin} → ${claims.dest}`,
          type: `${claims.tp} (Class ${claims.productClass})`,
          validUntil: new Date(claims.exp * 1000).toISOString(),
        },
        warning: 'Cannot verify if ticket was already used (offline mode)',
      });
    }

    // STEP 2: Check database for "already used" status (ONLINE)
    try {
      const result = await db.select({
        id: tickets.id,
        ticketType: tickets.ticketType,
        isUsed: tickets.isUsed,
        origin: routes.origin,
        destination: routes.destination,
      })
        .from(tickets)
        .innerJoin(routes, eq(tickets.routeId, routes.id))
        .where(eq(tickets.id, claims.tid))
        .limit(1);

      if (result.length === 0) {
        // Ticket not in database - this is okay, it's still valid
        return res.json({
          valid: true,
          message: 'JWT ticket is valid (not in database)',
          verificationMethod: 'online',
          ticket: {
            route: `${claims.origin} → ${claims.dest}`,
            type: `${claims.tp} (Class ${claims.productClass})`,
            validUntil: new Date(claims.exp * 1000).toISOString(),
          },
          warning: 'Ticket not found in database - may have been issued elsewhere',
        });
      }

      const ticket = result[0];

      if (ticket.isUsed) {
        return res.json({
          valid: false,
          message: 'Ticket has already been used',
          verificationMethod: 'online',
          ticket: {
            route: `${ticket.origin} → ${ticket.destination}`,
            type: ticket.ticketType,
            validUntil: new Date(claims.exp * 1000).toISOString(),
          },
        });
      }

      // All checks passed!
      return res.json({
        valid: true,
        message: 'JWT ticket is valid',
        verificationMethod: 'online',
        ticket: {
          route: `${ticket.origin} → ${ticket.destination}`,
          type: `${ticket.ticketType} (Class ${claims.productClass})`,
          validUntil: new Date(claims.exp * 1000).toISOString(),
        },
      });
    } catch (dbError) {
      // Database error - but JWT is still valid!
      console.error('Database error during JWT verification:', dbError);
      return res.json({
        valid: true,
        message: 'JWT ticket is valid (database unavailable)',
        verificationMethod: 'offline-fallback',
        ticket: {
          route: `${claims.origin} → ${claims.dest}`,
          type: `${claims.tp} (Class ${claims.productClass})`,
          validUntil: new Date(claims.exp * 1000).toISOString(),
        },
        warning: 'Cannot verify if ticket was already used (database unavailable)',
      });
    }
  } catch (error) {
    console.error('Error scanning JWT ticket:', error);
    res.status(500).json({ 
      error: 'Failed to scan JWT ticket',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
