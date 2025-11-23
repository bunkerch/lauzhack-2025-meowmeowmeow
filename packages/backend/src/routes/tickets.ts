import { Router, type Router as ExpressRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { routes, tickets } from '../database/schema';
import { eq } from 'drizzle-orm';
import { 
  PurchaseTicketRequestSchema, 
  TicketIdParamSchema,
  type PurchaseTicketRequest 
} from '../schemas/validation';
import { z } from 'zod';
import { ticketService, type QuoteRequest } from '../services/ticket-service';
import { verifyPaymentProof, type ZKProofRequest } from '../services/zk-verifier';
import { signTicketJwt } from '../services/jwt-signer';

export const ticketRoutes: ExpressRouter = Router();

/**
 * POST /api/tickets/quote
 * 
 * Get a journey quote (according to INSTRUCTIONS.md spec).
 * Returns quoteId, price, and journey details.
 */
ticketRoutes.post('/quote', async (req, res) => {
  try {
    const quoteRequest: QuoteRequest = {
      origin: req.body.origin,
      destination: req.body.destination,
      travelDate: req.body.travelDate || new Date().toISOString(),
      ticketType: req.body.ticketType || 'single'
    };

    if (!quoteRequest.origin || !quoteRequest.destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const quote = await ticketService.createQuote(quoteRequest);
    res.json(quote);

  } catch (error) {
    console.error('Quote generation error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to generate quote' });
  }
});

/**
 * POST /api/tickets/issue-with-zk
 * 
 * Issue a ticket after verifying a ZK payment proof (according to INSTRUCTIONS.md spec).
 * Returns a signed JWT ticket.
 */
ticketRoutes.post('/issue-with-zk', async (req, res) => {
  try {
    const zkRequest: ZKProofRequest = {
      quoteId: req.body.quoteId,
      priceCents: req.body.priceCents,
      root: req.body.root,
      proof: req.body.proof,
      publicSignals: req.body.publicSignals
    };

    // Verify the ZK proof
    const verificationResult = await verifyPaymentProof(zkRequest);

    if (!verificationResult.valid) {
      return res.status(400).json({ 
        error: 'Invalid ZK proof',
        details: verificationResult.error
      });
    }

    // Get the quote
    const quote = ticketService.getQuote(zkRequest.quoteId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found or expired' });
    }

    // Verify price matches quote
    if (quote.priceCents !== zkRequest.priceCents) {
      return res.status(400).json({ error: 'Price mismatch with quote' });
    }

    // Create ticket claims
    const claims = ticketService.createTicketClaims(quote);

    // Sign the ticket
    const token = signTicketJwt(claims);

    res.json({ 
      token,
      ticketId: claims.tid,
      claims
    });

  } catch (error) {
    console.error('Ticket issuance error:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to issue ticket' });
  }
});

// Purchase a ticket
ticketRoutes.post('/purchase', async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = PurchaseTicketRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }

    const { routeId, ticketType, travelDate } = validationResult.data;

    // Get route details using Drizzle
    const route = await db.select()
      .from(routes)
      .where(eq(routes.id, routeId))
      .limit(1);
    
    if (route.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const selectedRoute = route[0];
    const ticketId = uuidv4();
    const validFrom = new Date(travelDate);
    const validUntil = new Date(validFrom);

    // Set validity period based on ticket type
    switch (ticketType) {
      case 'single':
        validUntil.setHours(validFrom.getHours() + 24);
        break;
      case 'day':
        validUntil.setDate(validFrom.getDate() + 1);
        break;
      case 'return':
        validUntil.setDate(validFrom.getDate() + 30);
        break;
    }

    // Note: This is the LEGACY purchase flow (without ZK proofs)
    // For ZK-based anonymous tickets, use /issue-with-zk endpoint
    
    // Store ticket using Drizzle (no ZK proof for legacy flow)
    const newTicket = await db.insert(tickets).values({
      id: ticketId,
      routeId,
      ticketType,
      validFrom,
      validUntil,
      proofData: { legacy: true }, // Legacy tickets don't have ZK proofs
      publicSignals: [],
    }).returning();

    const ticket = newTicket[0];

    res.json({
      ticket: {
        id: ticket.id,
        route: {
          origin: selectedRoute.origin,
          destination: selectedRoute.destination,
        },
        routeId: ticket.routeId, // Include routeId for offline verification
        ticketType: ticket.ticketType,
        validFrom: ticket.validFrom,
        validUntil: ticket.validUntil,
        price: selectedRoute.price,
      },
      proof: ticket.proofData,
      publicSignals: ticket.publicSignals,
    });
  } catch (error) {
    console.error('Error purchasing ticket:', error);
    res.status(500).json({ error: 'Failed to purchase ticket' });
  }
});

/**
 * POST /api/tickets/validation/scan-log
 * 
 * Controller endpoint for logging ticket scans and detecting double-use.
 */
ticketRoutes.post('/validation/scan-log', async (req, res) => {
  try {
    const { ticketId, controllerId, tripId, scanTime } = req.body;

    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket ID required' });
    }

    console.log(`📱 Scan logged: Ticket ${ticketId} by controller ${controllerId || 'unknown'}`);

    // In production, this would:
    // 1. Check if ticket exists and is valid
    // 2. Count previous scans
    // 3. Flag suspicious activity

    // For PoC, just return success
    res.json({
      status: 'VALID',
      message: 'Ticket scan logged successfully',
      ticketId,
      scanTime: scanTime || new Date().toISOString()
    });

  } catch (error) {
    console.error('Scan log error:', error);
    res.status(500).json({ error: 'Failed to log scan' });
  }
});

// Get ticket by ID
ticketRoutes.get('/:id', async (req, res) => {
  try {
    // Validate ticket ID parameter
    const validationResult = TicketIdParamSchema.safeParse(req.params.id);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid ticket ID format',
        details: validationResult.error.format()
      });
    }

    const id = validationResult.data;
    
    // Get ticket with route using Drizzle join
    const result = await db.select({
      id: tickets.id,
      routeId: tickets.routeId,
      ticketType: tickets.ticketType,
      validFrom: tickets.validFrom,
      validUntil: tickets.validUntil,
      isUsed: tickets.isUsed,
      proofData: tickets.proofData,
      publicSignals: tickets.publicSignals,
      origin: routes.origin,
      destination: routes.destination,
      price: routes.price,
    })
      .from(tickets)
      .innerJoin(routes, eq(tickets.routeId, routes.id))
      .where(eq(tickets.id, id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = result[0];

    res.json({
      id: ticket.id,
      route: {
        origin: ticket.origin,
        destination: ticket.destination,
      },
      routeId: ticket.routeId, // Include for offline verification
      ticketType: ticket.ticketType,
      validFrom: ticket.validFrom,
      validUntil: ticket.validUntil,
      price: ticket.price,
      isUsed: ticket.isUsed,
      proof: ticket.proofData,
      publicSignals: ticket.publicSignals,
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});
