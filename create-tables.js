import postgres from 'postgres';

// Environment değişkenlerini doğrudan kullan
const supabasePassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabasePassword) {
  console.error("SUPABASE_DB_PASSWORD environment variable is required");
  process.exit(1);
}

const connectionString = `postgresql://postgres.hnlosxmzbzesyubocgmf:${supabasePassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
});

async function createTables() {
  try {
    console.log('Creating account_deletions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS account_deletions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE,
        scheduled_at timestamp with time zone NOT NULL DEFAULT now(),
        deletion_date timestamp with time zone NOT NULL,
        reason text,
        status text NOT NULL DEFAULT 'scheduled',
        cancelled_at timestamp with time zone,
        completed_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `;
    
    console.log('Creating user_status table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_status (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE,
        is_active boolean NOT NULL DEFAULT true,
        deactivated_at timestamp with time zone,
        last_active_at timestamp with time zone NOT NULL DEFAULT now(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `;
    
    console.log('Tables created successfully!');
    
    // Verify tables exist
    const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('account_deletions', 'user_status')
    `;
    
    console.log('Tables found:', tables.map(t => t.tablename));
    
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await sql.end();
  }
}

createTables();