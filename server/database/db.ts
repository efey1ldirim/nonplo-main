import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Unified Supabase PostgreSQL connection with SSL and application name in URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

// Add SSL and application name to DATABASE_URL for Supabase compatibility
const databaseUrl = process.env.DATABASE_URL.includes('?') 
  ? `${process.env.DATABASE_URL}&sslmode=require&application_name=nonplo_saas_platform`
  : `${process.env.DATABASE_URL}?sslmode=require&application_name=nonplo_saas_platform`;

console.log('🔗 db.ts using Supabase PostgreSQL connection with SSL');
const client = postgres(databaseUrl, {
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'), // Supabase optimized connection pool
  idle_timeout: 30, // Supabase optimized idle timeout
  connect_timeout: 15, // Increased timeout for Supabase
  prepare: false, // Disable prepared statements for better compatibility
  onnotice: () => {}, // Suppress notices
});

export { client };
export const db = drizzle(client, { schema });
