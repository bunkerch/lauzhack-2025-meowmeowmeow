import { pgTable, serial, varchar, decimal, integer, uuid, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const routes = pgTable('routes', {
  id: serial('id').primaryKey(),
  origin: varchar('origin', { length: 100 }).notNull(),
  destination: varchar('destination', { length: 100 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey(),
  routeId: integer('route_id').notNull().references(() => routes.id),
  ticketType: varchar('ticket_type', { length: 50 }).notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  proofData: jsonb('proof_data').notNull(),
  publicSignals: jsonb('public_signals').notNull(),
  isUsed: boolean('is_used').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  usedAt: timestamp('used_at'),
});

export const scanAuditLogs = pgTable('scan_audit_logs', {
  id: serial('id').primaryKey(),
  ticketId: uuid('ticket_id').notNull(),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
  currentStop: varchar('current_stop', { length: 100 }),
});

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type ScanAuditLog = typeof scanAuditLogs.$inferSelect;
export type NewScanAuditLog = typeof scanAuditLogs.$inferInsert;

