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
    nbf: number;  // not before - Unix timestamp
    exp: number;  // expiry - Unix timestamp
    productClass: string;
}

interface LocationResponse {
    stations?: Array<{
        name: string;
        id: string;
        coordinate?: {
            x: number;
            y: number;
        };
    }>;
}

interface ConnectionResponse {
    connections?: Array<{
        from: {
            departure: string;
            station: {
                name: string;
            };
        };
        to: {
            arrival: string;
            station: {
                name: string;
            };
        };
        duration: string;
        sections?: Array<{
            journey?: {
                id: string;
                name: string;
            };
        }>;
    }>;
}

class TicketService {
    private quotes: Map<string, Quote> = new Map();

    /**
     * Query OpenTransportData API for location search
     */
    private async searchLocation(query: string) {
        const url = `http://transport.opendata.ch/v1/locations?query=${encodeURIComponent(query)}&type=station`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Location search failed: ${response.statusText}`);
        }
        
        const data = await response.json() as LocationResponse;
        return data.stations?.[0]; // Return first match
    }

    /**
     * Query OpenTransportData API for connections between two stations
     */
    private async queryConnections(from: string, to: string, date: string, time: string) {
        const url = `http://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&time=${time}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Connection search failed: ${response.statusText}`);
        }
        
        const data = await response.json() as ConnectionResponse;
        return data.connections?.[0]; // Return first connection
    }

    /**
     * Calculate price based on distance (simplified pricing model)
     * Real implementation would use official SBB/CFF pricing tables
     */
    private calculatePrice(connection: any): number {
        // Extract duration in seconds
        const durationSeconds = connection?.duration ? parseInt(connection.duration) : 3600;
        
        // Base fare + distance-based calculation
        // Rough estimate: CHF 0.30 per minute of travel
        const baseFareChf = 5.0;
        const durationMinutes = durationSeconds / 60;
        const distanceFareChf = durationMinutes * 0.30;
        const totalChf = baseFareChf + distanceFareChf;
        
        // Convert to cents and round
        return Math.round(totalChf * 100);
    }

    /**
     * Generate a quote for a journey.
     */
    async createQuote(request: QuoteRequest): Promise<Quote> {
        try {
            // Query the OpenTransportData API for real route information
            const originStation = await this.searchLocation(request.origin);
            const destinationStation = await this.searchLocation(request.destination);

            if (!originStation || !destinationStation) {
                throw new Error('Station not found. Please check the origin and destination names.');
            }

            // Parse travel date and time
            const travelDate = new Date(request.travelDate);
            const dateStr = travelDate.toISOString().split('T')[0]; // YYYY-MM-DD
            const timeStr = travelDate.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

            // Query connections
            const connection = await this.queryConnections(
                originStation.name,
                destinationStation.name,
                dateStr,
                timeStr
            );

            if (!connection) {
                throw new Error('No connection found for the specified journey');
            }

            // Generate quote ID
            const quoteId = `Q${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            
            // Extract trip IDs from the connection sections
            const tripIds = connection.sections
                ?.filter((s: any) => s.journey?.id)
                .map((s: any) => s.journey.id) || [`TRIP_${Date.now()}`];

            // Calculate validity period
            const departureTime = new Date(connection.from.departure);
            const validFrom = Math.floor(departureTime.getTime() / 1000);
            const validUntil = validFrom + (24 * 60 * 60);  // 24 hours validity

            // Calculate price
            const priceCents = this.calculatePrice(connection);

            const quote: Quote = {
                quoteId,
                origin: originStation.name,
                destination: destinationStation.name,
                priceCents,
                dv: 'GTFS_2025_11_22',
                validFrom,
                validUntil,
                tripIds,
                productClass: request.ticketType === 'first' ? '1' : '2'
            };

            // Store quote for later verification
            this.quotes.set(quoteId, quote);

            // Auto-cleanup old quotes after 1 hour
            setTimeout(() => {
                this.quotes.delete(quoteId);
            }, 60 * 60 * 1000);

            return quote;

        } catch (error) {
            console.error('Error creating quote:', error);
            
            // Fallback to database routes if API fails
            console.log('Falling back to database routes...');
            return this.createQuoteFromDatabase(request);
        }
    }

    /**
     * Fallback method using database routes (original implementation)
     */
    private async createQuoteFromDatabase(request: QuoteRequest): Promise<Quote> {
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
            productClass: request.ticketType === 'first' ? '1' : '2'
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

        return {
            tid: ticketId,
            dv: quote.dv,
            tp: 'single',
            origin: quote.origin,
            dest: quote.destination,
            tripIds: quote.tripIds,
            nbf: quote.validFrom,
            exp: quote.validUntil,
            productClass: quote.productClass
        };
    }
}

export const ticketService = new TicketService();

