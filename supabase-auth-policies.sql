-- Supabase Authentication & RLS Policies
-- Row Level Security setup for all tables

-- Enable RLS for all user-specific tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agents table
CREATE POLICY "Users can view their own agents" ON agents
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own agents" ON agents
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own agents" ON agents
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own agents" ON agents
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for conversations table
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = conversations.agent_id 
            AND agents.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create conversations for their agents" ON conversations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents 
            WHERE agents.id = conversations.agent_id 
            AND agents.user_id = auth.uid()::text
        )
    );

-- Create RLS policies for messages table  
CREATE POLICY "Users can view messages from their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations c
            JOIN agents a ON a.id = c.agent_id
            WHERE c.id = messages.conversation_id 
            AND a.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create messages in their conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations c
            JOIN agents a ON a.id = c.agent_id
            WHERE c.id = messages.conversation_id 
            AND a.user_id = auth.uid()::text
        )
    );

-- Create RLS policies for tools_settings table
CREATE POLICY "Users can manage their own tool settings" ON tools_settings
    FOR ALL USING (auth.uid()::text = user_id);

-- Create RLS policies for integrations_connections table
CREATE POLICY "Users can manage their own integration connections" ON integrations_connections
    FOR ALL USING (auth.uid()::text = user_id);

-- Create user roles and permissions
CREATE TYPE user_role AS ENUM ('free', 'premium', 'enterprise');

-- Extend auth.users with custom claims if needed
-- Note: This would typically be done via Supabase Auth hooks or custom functions