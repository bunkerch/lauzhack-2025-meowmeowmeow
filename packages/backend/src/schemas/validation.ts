import { z } from 'zod';

/**
 * ZK Proof Schema
 * Validates the structure of a zero-knowledge proof
 */
export const ProofSchema = z.object({
  pi_a: z.array(z.string()).min(3),
  pi_b: z.array(z.array(z.string()).length(2)).length(3),
  pi_c: z.array(z.string()).min(3),
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
});

/**
 * Public Signals Schema
 * Array of numeric strings representing public signals from the proof
 */
export const PublicSignalsSchema = z.array(z.string()).min(1);

/**
 * Purchase Ticket Request Schema
 */
export const PurchaseTicketRequestSchema = z.object({
  routeId: z.number().int().positive(),
  ticketType: z.enum(['single', 'day', 'return']),
  travelDate: z.string().datetime().or(z.string().date()),
});

/**
 * Verify Ticket Request Schema
 */
export const VerifyTicketRequestSchema = z.object({
  ticketId: z.string().uuid(),
  proof: ProofSchema,
  publicSignals: PublicSignalsSchema,
});

/**
 * Scan Ticket Request Schema
 */
export const ScanTicketRequestSchema = z.object({
  ticketId: z.string().uuid(),
  proof: ProofSchema,
  publicSignals: PublicSignalsSchema,
  validFrom: z.string().datetime().or(z.string().date()),
  validUntil: z.string().datetime().or(z.string().date()),
  routeId: z.number().int().positive(),
  offline: z.boolean().optional(),
});

/**
 * Verify Offline Request Schema
 */
export const VerifyOfflineRequestSchema = z.object({
  proof: ProofSchema,
  publicSignals: PublicSignalsSchema,
  validFrom: z.string().datetime().or(z.string().date()),
  validUntil: z.string().datetime().or(z.string().date()),
});

/**
 * Route ID Parameter Schema
 */
export const RouteIdParamSchema = z.string().regex(/^\d+$/).transform(Number);

/**
 * Ticket ID Parameter Schema
 */
export const TicketIdParamSchema = z.string().uuid();

// Type exports for TypeScript
export type PurchaseTicketRequest = z.infer<typeof PurchaseTicketRequestSchema>;
export type VerifyTicketRequest = z.infer<typeof VerifyTicketRequestSchema>;
export type ScanTicketRequest = z.infer<typeof ScanTicketRequestSchema>;
export type VerifyOfflineRequest = z.infer<typeof VerifyOfflineRequestSchema>;
export type ProofData = z.infer<typeof ProofSchema>;
export type PublicSignals = z.infer<typeof PublicSignalsSchema>;


