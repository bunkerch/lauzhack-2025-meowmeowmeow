import { Router, type Router as ExpressRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/db';
import { routes, tickets } from '../database/schema';
import { eq } from 'drizzle-orm';
import { generateTicketProof } from '../zk/proof-generator';

export const ticketRoutes: ExpressRouter = Router();

interface PurchaseTicketRequest {
  routeId: number;
  ticketType: 'single' | 'day' | 'return';
  travelDate: string;
}

// Purchase a ticket
ticketRoutes.post('/purchase', async (req, res) => {
  try {
    const { routeId, ticketType, travelDate }: PurchaseTicketRequest = req.body;

    // Validate input
    if (!routeId || !ticketType || !travelDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    // Generate ZK proof for the ticket
    const { proof, publicSignals } = await generateTicketProof({
      ticketId,
      routeId,
      validFrom: validFrom.getTime(),
      validUntil: validUntil.getTime(),
    });

    // Store ticket using Drizzle
    const newTicket = await db.insert(tickets).values({
      id: ticketId,
      routeId,
      ticketType,
      validFrom,
      validUntil,
      proofData: proof,
      publicSignals,
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

// Get ticket by ID
ticketRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
