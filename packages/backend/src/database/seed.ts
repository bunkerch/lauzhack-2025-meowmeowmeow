import { db } from './db';
import { routes } from './schema';

export async function seedDatabase() {
  try {
    // Check if routes already exist
    const existingRoutes = await db.select().from(routes).limit(1);
    
    if (existingRoutes.length === 0) {
      // Insert sample routes using Drizzle
      await db.insert(routes).values([
        {
          origin: 'Zürich HB',
          destination: 'Bern',
          price: '51.00',
          durationMinutes: 57,
        },
        {
          origin: 'Zürich HB',
          destination: 'Geneva',
          price: '88.00',
          durationMinutes: 177,
        },
        {
          origin: 'Bern',
          destination: 'Geneva',
          price: '52.00',
          durationMinutes: 102,
        },
        {
          origin: 'Lausanne',
          destination: 'Zürich HB',
          price: '79.00',
          durationMinutes: 134,
        },
        {
          origin: 'Basel SBB',
          destination: 'Lugano',
          price: '98.00',
          durationMinutes: 213,
        },
        {
          origin: 'Zürich HB',
          destination: 'Luzern',
          price: '26.00',
          durationMinutes: 49,
        },
      ]);
      
      console.log('✅ Sample routes inserted');
    } else {
      console.log('✅ Routes already exist, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

