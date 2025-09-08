-- Supabase Schema Migration from Neon Database
-- Based on shared/schema.ts Drizzle definitions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Newsletter subscribers table
CREATE TABLE newsletter_subscribers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- Training requests table  
CREATE TABLE training_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_email TEXT NOT NULL,
    user_name TEXT,
    topic TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Agents table (main entity)
CREATE TABLE agents (
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

-- Tools settings table
CREATE TABLE tools_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    tool_key TEXT NOT NULL,
    enabled BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Integrations connections table
CREATE TABLE integrations_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected' NOT NULL,
    meta JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tools special requests table
CREATE TABLE tools_special_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    requested TEXT NOT NULL,
    details TEXT,
    file_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Conversations table
CREATE TABLE conversations (
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

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender TEXT NOT NULL,
    content TEXT,
    attachments JSONB DEFAULT '[]' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Global employee settings table
CREATE TABLE global_employee_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    singleton BOOLEAN DEFAULT true NOT NULL UNIQUE,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Playbooks table (critical for AI integration)
CREATE TABLE playbooks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Playbook backups table
CREATE TABLE playbook_backups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    playbook_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_playbooks_agent_id ON playbooks(agent_id);
CREATE INDEX idx_tools_settings_user_id ON tools_settings(user_id);
CREATE INDEX idx_integrations_user_id ON integrations_connections(user_id);

-- Add unique constraints
CREATE UNIQUE INDEX idx_tools_settings_unique ON tools_settings(user_id, tool_key);
CREATE UNIQUE INDEX idx_integrations_unique ON integrations_connections(user_id, provider);

-- Add update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_settings_updated_at BEFORE UPDATE ON tools_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_connections_updated_at BEFORE UPDATE ON integrations_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_employee_settings_updated_at BEFORE UPDATE ON global_employee_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playbook_backups_updated_at BEFORE UPDATE ON playbook_backups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();