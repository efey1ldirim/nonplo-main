-- =============================================================================
-- PRODUCTION DATABASE INDEX OPTIMIZATIONS
-- =============================================================================
-- Bu dosya production performansı için database index'lerini optimize eder
-- Calendar integration tabloları için kritik performans iyileştirmeleri

-- =============================================================================
-- Google Calendar Tables Indexes
-- =============================================================================

-- userGoogleCalendars tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_user_google_calendars_user_id 
ON user_google_calendars(user_id);

CREATE INDEX IF NOT EXISTS idx_user_google_calendars_agent_id 
ON user_google_calendars(agent_id);

-- Composite index for user_id + agent_id (en çok kullanılan sorgu pattern)
CREATE INDEX IF NOT EXISTS idx_user_google_calendars_user_agent 
ON user_google_calendars(user_id, agent_id);

-- Active calendar connections için index
CREATE INDEX IF NOT EXISTS idx_user_google_calendars_active 
ON user_google_calendars(user_id, is_active) 
WHERE is_active = true;

-- Email lookup için index
CREATE INDEX IF NOT EXISTS idx_user_google_calendars_email 
ON user_google_calendars(google_email);

-- =============================================================================
-- Calendar Operations Table Indexes  
-- =============================================================================

-- calendarOperations tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_calendar_operations_user_id 
ON calendar_operations(user_id);

CREATE INDEX IF NOT EXISTS idx_calendar_operations_agent_id 
ON calendar_operations(agent_id);

-- User + Agent composite index
CREATE INDEX IF NOT EXISTS idx_calendar_operations_user_agent 
ON calendar_operations(user_id, agent_id);

-- Operation type filtering için
CREATE INDEX IF NOT EXISTS idx_calendar_operations_type 
ON calendar_operations(operation_type);

-- Success/failure analytics için
CREATE INDEX IF NOT EXISTS idx_calendar_operations_success 
ON calendar_operations(success, created_at);

-- Error analytics için
CREATE INDEX IF NOT EXISTS idx_calendar_operations_errors 
ON calendar_operations(user_id, success, created_at) 
WHERE success = false;

-- Created timestamp için (date range queries)
CREATE INDEX IF NOT EXISTS idx_calendar_operations_created_at 
ON calendar_operations(created_at DESC);

-- Google Event ID lookup
CREATE INDEX IF NOT EXISTS idx_calendar_operations_google_event_id 
ON calendar_operations(google_event_id) 
WHERE google_event_id IS NOT NULL;

-- =============================================================================
-- Existing Tables Optimization
-- =============================================================================

-- Agents tablosu için user_id index (eğer yoksa)
CREATE INDEX IF NOT EXISTS idx_agents_user_id 
ON agents(user_id);

-- Active agents için index
CREATE INDEX IF NOT EXISTS idx_agents_user_active 
ON agents(user_id, is_active) 
WHERE is_active = true;

-- Conversations tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_agent_id 
ON conversations(agent_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_agent 
ON conversations(user_id, agent_id);

-- Last message time için sorting
CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
ON conversations(last_message_at DESC);

-- Messages tablosu için conversation_id index
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id);

-- Message timestamp için sorting
CREATE INDEX IF NOT EXISTS idx_messages_created_at 
ON messages(created_at DESC);

-- =============================================================================
-- Tools Settings Optimization
-- =============================================================================

-- toolsSettings için user_id + tool_key composite index
CREATE INDEX IF NOT EXISTS idx_tools_settings_user_tool 
ON tools_settings(user_id, tool_key);

-- Enabled tools için
CREATE INDEX IF NOT EXISTS idx_tools_settings_enabled 
ON tools_settings(user_id, enabled) 
WHERE enabled = true;

-- =============================================================================
-- Performance Statistics
-- =============================================================================

-- Index kullanım istatistiklerini görmek için:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;

-- Table size ve index size kontrolü:
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
--   pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =============================================================================
-- Index Maintenance
-- =============================================================================

-- Index'leri yeniden analiz et (production'da haftalık çalıştır)
-- ANALYZE user_google_calendars;
-- ANALYZE calendar_operations;
-- ANALYZE agents;
-- ANALYZE conversations;
-- ANALYZE messages;