import { Router, type Router as ExpressRouter } from 'express';
import { db } from '../database/db';
import { scanAuditLogs } from '../database/schema';
import { authenticateStaff } from '../middleware/auth';
import { AuditLogRequestSchema, TicketIdParamSchema } from '../schemas/validation';
import { eq, desc } from 'drizzle-orm';

export const auditRoutes: ExpressRouter = Router();

// Log a ticket scan
// Protected: Requires staff authentication
auditRoutes.post('/scan', authenticateStaff, async (req, res) => {
  try {
    // Validate request body with Zod
    const validationResult = AuditLogRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.format()
      });
    }

    const { ticketId, currentStop } = validationResult.data;

    // Insert audit log entry
    const [auditLog] = await db.insert(scanAuditLogs)
      .values({
        ticketId,
        scannedAt: new Date(),
        currentStop: currentStop || null,
      })
      .returning();

    res.json({
      success: true,
      log: {
        id: auditLog.id,
        ticketId: auditLog.ticketId,
        scannedAt: auditLog.scannedAt,
        currentStop: auditLog.currentStop,
      },
    });
  } catch (error) {
    console.error('Error logging scan:', error);
    // Don't fail the scan if logging fails - just log the error
    res.status(500).json({ 
      error: 'Failed to log scan',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get audit logs for a specific ticket
// Protected: Requires staff authentication
auditRoutes.get('/ticket/:ticketId', authenticateStaff, async (req, res) => {
  try {
    // Validate ticket ID parameter
    const validationResult = TicketIdParamSchema.safeParse(req.params.ticketId);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid ticket ID format',
        details: validationResult.error.format()
      });
    }

    const ticketId = validationResult.data;

    // Query audit logs for this ticket, ordered by most recent first
    const logs = await db.select()
      .from(scanAuditLogs)
      .where(eq(scanAuditLogs.ticketId, ticketId))
      .orderBy(desc(scanAuditLogs.scannedAt));

    res.json({
      success: true,
      ticketId,
      logs: logs.map(log => ({
        id: log.id,
        ticketId: log.ticketId,
        scannedAt: log.scannedAt,
        currentStop: log.currentStop,
      })),
      count: logs.length,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      error: 'Failed to fetch audit logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

