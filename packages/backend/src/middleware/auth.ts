import { Request, Response, NextFunction } from 'express';

// In a real application, these would be environment variables or stored securely
const STAFF_API_KEY = process.env.STAFF_API_KEY || 'cff-staff-api-key-2024';

export interface AuthRequest extends Request {
  isStaff?: boolean;
}

/**
 * Middleware to authenticate staff/scanner requests
 * Checks for Authorization header with Bearer token
 */
export function authenticateStaff(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (token !== STAFF_API_KEY) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'Invalid staff credentials'
    });
  }

  req.isStaff = true;
  next();
}

/**
 * Optional staff authentication - allows both authenticated and unauthenticated requests
 * but marks the request if it's from staff
 */
export function optionalStaffAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === STAFF_API_KEY) {
      req.isStaff = true;
    }
  }

  next();
}

