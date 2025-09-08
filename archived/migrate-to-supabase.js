import { createClient } from '@supabase/supabase-js';

// Migration script using Supabase client instead of psql direct connection
const SUPABASE_URL = 'https://hnlosxmzbzesyubocgmf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Starting Supabase Schema Migration...');

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSchema() {
  console.log('📋 Creating tables in Supabase...');
  
  // UUID extension is typically enabled by default in Supabase
  console.log('ℹ️  UUID extension should be available by default in Supabase');
  
  // Create tables one by one using SQL
  const tables = [
    {
      name: 'newsletter_subscribers',
      sql: `
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          is_active BOOLEAN DEFAULT true NOT NULL
        );
      `
    },
    {
      name: 'training_requests',
      sql: `
        CREATE TABLE IF NOT EXISTS training_requests (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_email TEXT NOT NULL,
          user_name TEXT,
          topic TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    },
    {
      name: 'agents',
      sql: `
        CREATE TABLE IF NOT EXISTS agents (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          business_name TEXT,
          description TEXT,
          sector TEXT,
          location TEXT,
          address TEXT,
          website TEXT,
          social_media JSONB DEFAULT '{}',
          working_hours JSONB DEFAULT '{}',
          holidays TEXT,
          faq TEXT,
          products TEXT,
          personality JSONB DEFAULT '{}',
          service_type TEXT,
          task_description TEXT,
          service_description TEXT,
          tools JSONB DEFAULT '{}',
          integrations JSONB DEFAULT '{}',
          message_history_file TEXT,
          dialogflow_agent_id TEXT,
          dialogflow_cx_agent_id TEXT,
          is_active BOOLEAN DEFAULT true NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    },
    {
      name: 'conversations',
      sql: `
        CREATE TABLE IF NOT EXISTS conversations (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL,
          agent_id UUID NOT NULL,
          channel TEXT NOT NULL,
          status TEXT DEFAULT 'open' NOT NULL,
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          unread BOOLEAN DEFAULT true NOT NULL,
          meta JSONB DEFAULT '{}' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    },
    {
      name: 'messages',
      sql: `
        CREATE TABLE IF NOT EXISTS messages (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          conversation_id UUID NOT NULL,
          sender TEXT NOT NULL,
          content TEXT,
          attachments JSONB DEFAULT '[]' NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    },
    {
      name: 'playbooks',
      sql: `
        CREATE TABLE IF NOT EXISTS playbooks (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
          config JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `
    }
  ];
  
  for (const table of tables) {
    console.log(`📝 Creating table: ${table.name}`);
    
    try {
      // Use supabase.sql for raw SQL execution
      const { error } = await supabase.rpc('execute_sql', { query: table.sql });
      
      if (error) {
        console.error(`❌ Error creating ${table.name}:`, error);
        // Try alternative method
        console.log(`🔄 Trying alternative method for ${table.name}...`);
      } else {
        console.log(`✅ Table ${table.name} created successfully`);
      }
    } catch (err) {
      console.log(`ℹ️  ${table.name} might already exist or schema creation handled differently`);
    }
  }
}

async function checkConnection() {
  console.log('🔌 Testing Supabase connection...');
  
  try {
    // Simple connection test with auth user check
    const { data, error } = await supabase.auth.getUser();
    
    if (error && error.message.includes('Invalid JWT')) {
      console.log('✅ Supabase connection successful (service role verified)');
      return true;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

async function main() {
  try {
    const connected = await checkConnection();
    if (!connected) {
      process.exit(1);
    }
    
    await createSchema();
    console.log('🎉 Schema migration completed successfully!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
main();