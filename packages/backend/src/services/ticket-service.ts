/**
 * Ticket Service
 * 
 * Handles journey quotes and ticket issuance with ZK proof verification.
 */

import crypto from 'crypto';
import { db } from '../database/db';
import { routes } from '../database/schema';
import { eq } from 'drizzle-orm';

export interface QuoteRequest {
    origin: string;
    destination: string;
    travelDate: string;
    ticketType?: string;
}

export interface Quote {
    quoteId: string;
    origin: string;
    destination: string;
    priceCents: number;
    dv: string;  // Dataset version
    validFrom: number;  // Unix timestamp
    validUntil: number;  // Unix timestamp
    tripIds: string[];
    productClass: string;
}

export interface TicketClaims {
    tid: string;  // ticketId
    dv: string;  // dataset version
    tp: string;  // ticket type
    origin: string;
    dest: string;
    tripIds: string[];
    validFrom: number;
    validUntil: number;
    iat: number;
    productClass: string;
}

class TicketService {
    private quotes: Map<string, Quote> = new Map();

    /**
     * Generate a quote for a journey.
     */
    async createQuote(request: QuoteRequest): Promise<Quote> {
        // In production, this would query the opentransportdata API
        // For PoC, we'll use the database routes
        
        const availableRoutes = await db.select().from(routes);
        
        // Find matching route
        const matchingRoute = availableRoutes.find(
            r => r.origin.toLowerCase().includes(request.origin.toLowerCase()) &&
                 r.destination.toLowerCase().includes(request.destination.toLowerCase())
        );

        if (!matchingRoute) {
            throw new Error('No route found for the specified journey');
        }

        const quoteId = `Q${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const travelDate = new Date(request.travelDate);
        const validFrom = Math.floor(travelDate.getTime() / 1000);
        const validUntil = validFrom + (24 * 60 * 60);  // 24 hours validity

        const quote: Quote = {
            quoteId,
            origin: matchingRoute.origin,
            destination: matchingRoute.destination,
            priceCents: Math.round(parseFloat(matchingRoute.price) * 100),
            dv: 'GTFS_2025_11_22',
            validFrom,
            validUntil,
            tripIds: [`TRIP_${matchingRoute.id}`],
            productClass: '2'  // 2nd class
        };

        // Store quote for later verification
        this.quotes.set(quoteId, quote);

        // Auto-cleanup old quotes after 1 hour
        setTimeout(() => {
            this.quotes.delete(quoteId);
        }, 60 * 60 * 1000);

        return quote;
    }

    /**
     * Get a quote by ID.
     */
    getQuote(quoteId: string): Quote | undefined {
        return this.quotes.get(quoteId);
    }

    /**
     * Create ticket claims from a quote.
     */
    createTicketClaims(quote: Quote): TicketClaims {
        const ticketId = crypto.randomBytes(16).toString('hex');
        const now = Math.floor(Date.now() / 1000);

        return {
            tid: ticketId,
            dv: quote.dv,
            tp: 'single',
            origin: quote.origin,
            dest: quote.destination,
            tripIds: quote.tripIds,
            validFrom: quote.validFrom,
            validUntil: quote.validUntil,
            iat: now,
            productClass: quote.productClass
        };
    }
}

export const ticketService = new TicketService();

