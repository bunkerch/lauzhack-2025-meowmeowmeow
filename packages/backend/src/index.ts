import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ticketRoutes } from './routes/tickets';
import { routeRoutes } from './routes/routes';
import { verificationRoutes } from './routes/verification';
import { paymentRoutes } from './routes/payment';
import { auditRoutes } from './routes/audit';
import { publicKeyRoutes } from './routes/public-key';
import { seedDatabase } from './database/seed';
import { paymentService } from './services/payment-service';
import { initializeFieldEncoding } from './utils/field-encoding';

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
app.use('/api/payment', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/public-key', publicKeyRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
async function start() {
  try {
    // Initialize cryptographic utilities
    console.log('⚙️  Initializing cryptographic libraries...');
    await initializeFieldEncoding();
    await paymentService.initialize();
    
    // Seed database with sample data
    await seedDatabase();
    console.log('✅ Database ready');
    
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`);
      console.log(`   - Ticket Backend: http://localhost:${PORT}/api/tickets`);
      console.log(`   - Payment Service: http://localhost:${PORT}/api/payment`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
