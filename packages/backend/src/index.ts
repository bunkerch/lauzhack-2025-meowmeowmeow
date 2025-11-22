import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ticketRoutes } from './routes/tickets';
import { routeRoutes } from './routes/routes';
import { verificationRoutes } from './routes/verification';
import { seedDatabase } from './database/seed';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:5174']
}));
app.use(express.json());

// Routes
app.use('/api/tickets', ticketRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/verify', verificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    // Seed database with sample data
    await seedDatabase();
    console.log('✅ Database ready');
    
    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
