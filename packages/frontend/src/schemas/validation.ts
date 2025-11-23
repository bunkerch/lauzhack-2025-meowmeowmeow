import { z } from 'zod';

/**
 * ZK Proof Schema (Groth16)
 * Validates the structure of a zero-knowledge proof
 */
export const Groth16ProofSchema = z.object({
  pi_a: z.array(z.string()).min(3),
  pi_b: z.array(z.array(z.string()).length(2)).length(3),
  pi_c: z.array(z.string()).min(3),
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
});


/**
 * Proof Schema (Union of ZK and Legacy)
 * Accepts both real ZK proofs and legacy tickets
 */
export const ProofSchema = Groth16ProofSchema

/**
 * Public Signals Schema
 * Array of numeric strings representing public signals from the proof
 * Can be empty for legacy tickets
 */
export const PublicSignalsSchema = z.array(z.string());

/**
 * QR Code Data Schema
 * Validates the complete QR code data structure
 */
export const QRCodeDataSchema = z.object({
  ticketId: z.string(),
  proof: ProofSchema,
  publicSignals: PublicSignalsSchema,
  validFrom: z.string().datetime().or(z.string().date()),
  validUntil: z.string().datetime().or(z.string().date()),
  routeId: z.number().int().nonnegative(),
});

/**
 * Route Schema
 */
export const RouteSchema = z.object({
  id: z.number().int().positive(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  price: z.string(),
  durationMinutes: z.number().int().positive(),
  createdAt: z.string().or(z.date()).nullable().optional(),
});

/**
 * Ticket Schema
 */
export const TicketSchema = z.object({
  id: z.string(),
  route: z.object({
    origin: z.string().min(1),
    destination: z.string().min(1),
  }),
  routeId: z.number().int().nonnegative().optional(),
  ticketType: z.enum(['single', 'day', 'return']),
  validFrom: z.string().datetime().or(z.string().date()),
  validUntil: z.string().datetime().or(z.string().date()),
  price: z.string(),
  isUsed: z.boolean().optional(),
  proof: ProofSchema,
  publicSignals: PublicSignalsSchema.optional(),
});

/**
 * Scan Result Schema
 */
export const ScanResultSchema = z.object({
  valid: z.boolean(),
  message: z.string(),
  verificationMethod: z.enum(['offline-browser', 'offline', 'online', 'offline-fallback']).optional(),
  warning: z.string().optional(),
  ticket: z.object({
    route: z.string(),
    type: z.string().optional(),
    validUntil: z.string(),
  }).optional(),
  error: z.string().optional(),
});

/**
 * Purchase Response Schema
 */
export const PurchaseResponseSchema = z.object({
  ticket: z.object({
    id: z.string(),
    route: z.object({
      origin: z.string(),
      destination: z.string(),
    }),
    routeId: z.number().int().nonnegative(),
    ticketType: z.enum(['single', 'day', 'return']),
    validFrom: z.string(),
    validUntil: z.string(),
    price: z.string(),
  }),
  proof: ProofSchema,
  publicSignals: PublicSignalsSchema,
});

// Type exports for TypeScript
export type Groth16Proof = z.infer<typeof Groth16ProofSchema>;
export type LegacyProof = z.infer<typeof LegacyProofSchema>;
export type ProofData = z.infer<typeof ProofSchema>;
export type PublicSignals = z.infer<typeof PublicSignalsSchema>;
export type QRCodeData = z.infer<typeof QRCodeDataSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type Ticket = z.infer<typeof TicketSchema>;
export type ScanResult = z.infer<typeof ScanResultSchema>;
export type PurchaseResponse = z.infer<typeof PurchaseResponseSchema>;

