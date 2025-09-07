-- Supabase Database'de eksik column'ları eklemek için SQL komutları
-- Bu dosyayı Supabase SQL Editor'da çalıştır

-- 1. Agents tablosuna eksik column'ları ekle
ALTER TABLE agents ADD COLUMN IF NOT EXISTS openai_assistant_id text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS openai_instructions text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS openai_model text;

-- 2. Conversations tablosuna eksik column'ları ekle
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS thread_id text;

-- 3. Thread ID için unique constraint ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint 
        WHERE conname = 'conversations_thread_id_unique'
    ) THEN
        ALTER TABLE conversations ADD CONSTRAINT conversations_thread_id_unique UNIQUE (thread_id);
    END IF;
END $$;

-- 4. Eksik column'ları kontrol et
SELECT 
    'agents' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'agents' 
    AND column_name IN ('openai_assistant_id', 'openai_instructions', 'openai_model')
UNION ALL
SELECT 
    'conversations' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'conversations' 
    AND column_name = 'thread_id'
ORDER BY table_name, column_name;