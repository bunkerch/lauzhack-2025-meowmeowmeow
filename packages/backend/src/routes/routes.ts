import { Router, type Router as ExpressRouter } from 'express';
import { db } from '../database/db';
import { routes } from '../database/schema';
import { eq } from 'drizzle-orm';

export const routeRoutes: ExpressRouter = Router();

// Get all available routes
routeRoutes.get('/', async (req, res) => {
  try {
    const allRoutes = await db.select().from(routes);
    res.json(allRoutes);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// Get specific route by ID
routeRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const route = await db.select()
      .from(routes)
      .where(eq(routes.id, parseInt(id)))
      .limit(1);
    
    if (route.length === 0) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json(route[0]);
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ error: 'Failed to fetch route' });
  }
});
