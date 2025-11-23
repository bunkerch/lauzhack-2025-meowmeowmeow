import { getAuthHeaders } from '../config/auth';

/**
 * Lausanne -> Zurich CFF line stops
 */
export const LAUSANNE_ZURICH_STOPS = [
  'Lausanne',
  'Renens VD',
  'Yverdon-les-Bains',
  'Neuchâtel',
  'Biel/Bienne',
  'Grenchen Süd',
  'Solothurn',
  'Oensingen',
  'Olten',
  'Zurich HB',
] as const;

export type LausanneZurichStop = typeof LAUSANNE_ZURICH_STOPS[number];

export interface AuditLogEntry {
  id: number;
  ticketId: string;
  scannedAt: string;
  currentStop: string | null;
}

export interface AuditLogResponse {
  success: boolean;
  ticketId: string;
  logs: AuditLogEntry[];
  count: number;
}

/**
 * Log a ticket scan to the audit log
 * This function logs the ticket ID, scan time, and current stop to the backend
 * It fails silently if the logging fails (non-blocking)
 */
export async function logTicketScan(
  ticketId: string,
  currentStop?: LausanneZurichStop
): Promise<void> {
  try {
    await fetch('/api/audit/scan', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ticketId,
        currentStop,
      }),
    });
    // Silently handle errors - audit logging should not block the scan process
  } catch (error) {
    // Log to console for debugging, but don't throw
    console.warn('Failed to log scan to audit log:', error);
  }
}

/**
 * Fetch audit logs for a specific ticket
 */
export async function getAuditLogs(ticketId: string): Promise<AuditLogResponse | null> {
  try {
    const response = await fetch(`/api/audit/ticket/${ticketId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return null;
  }
}

