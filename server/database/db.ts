import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Unified database connection using DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

console.log('🔗 db.ts using DATABASE_URL connection');
const client = postgres(process.env.DATABASE_URL, {
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '5'), // Configurable pool size, default 5 for serverless
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout 10 seconds
  prepare: false, // Disable prepared statements for better compatibility
  onnotice: () => {}, // Suppress notices
});

export { client };
export const db = drizzle(client, { schema });
