import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Unified database connection using DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

console.log('🔗 db.ts using DATABASE_URL connection');
const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Limit connections in development
  onnotice: () => {}, // Suppress notices
});

export { client };
export const db = drizzle(client, { schema });
