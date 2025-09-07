import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Supabase-only database connection
const supabasePassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabasePassword) {
  throw new Error(
    "SUPABASE_DB_PASSWORD must be set. Please check your environment variables.",
  );
}

// Supabase connection string
const connectionString = `postgresql://postgres.hnlosxmzbzesyubocgmf:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;



const client = postgres(connectionString, {
  ssl: 'require', // Supabase requires SSL
  max: 1, // Limit connections in development
  onnotice: () => {}, // Suppress notices
});

export { client };
export const db = drizzle(client, { schema });
