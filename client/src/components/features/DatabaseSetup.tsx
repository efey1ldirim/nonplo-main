import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const DatabaseSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);
  const { toast } = useToast();

  const checkTables = async () => {
    try {
      // Check if agents table exists by trying to query it
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*')
        .limit(1);

      const { data: playbooks, error: playbooksError } = await supabase
        .from('playbooks')
        .select('*')
        .limit(1);

      // If both queries succeed (or fail with specific table not found), we know the status
      if (!agentsError && !playbooksError) {
        setTablesExist(true);
        toast({
          title: "Tabloların Durumu",
          description: "Agents ve playbooks tabloları zaten mevcut.",
        });
      } else {
        setTablesExist(false);
        toast({
          title: "Tabloların Durumu", 
          description: "Tablolar oluşturulması gerekiyor.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error checking tables:', error);
      setTablesExist(false);
    }
  };

  const createTables = async () => {
    setIsCreating(true);
    try {
      // We'll need to run these SQL commands in Supabase Dashboard
      // For now, let's just show the user what needs to be done
      toast({
        title: "Tablo Oluşturma",
        description: "Supabase Dashboard'da SQL'leri çalıştırmanız gerekiyor. Console'a bakın.",
      });

      console.log(`
-- Supabase Dashboard'da çalıştırmanız gereken SQL komutları:

-- 1. Agents tablosu oluştur
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Playbooks tablosu oluştur  
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS etkinleştir
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;

-- 4. Politikalar oluştur
CREATE POLICY "Users can only access their own agents" ON agents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own playbooks" ON playbooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents 
      WHERE agents.id = playbooks.agent_id 
      AND agents.user_id = auth.uid()
    )
  );

-- 5. İndeksler oluştur
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_agent_id ON playbooks(agent_id);
      `);

      // Try to check if tables exist after creation
      setTimeout(async () => {
        await checkTables();
        setIsCreating(false);
      }, 2000);

    } catch (error) {
      console.error('Error creating tables:', error);
      toast({
        title: "Hata",
        description: "Tablo oluşturma sırasında hata oluştu.",
        variant: "destructive",
      });
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Kurulumu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Tabloların Durumu:</span>
          {tablesExist === null ? (
            <span className="text-gray-500">Bilinmiyor</span>
          ) : tablesExist ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              Mevcut
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              Eksik
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={checkTables} variant="outline">
            Durumu Kontrol Et
          </Button>
          <Button 
            onClick={createTables} 
            disabled={isCreating}
            className="flex items-center gap-2"
          >
            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
            SQL Komutlarını Göster
          </Button>
        </div>

        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
          <strong>Not:</strong> Tabloları oluşturmak için Supabase Dashboard'da SQL Editor'ü kullanmanız gerekiyor. 
          "SQL Komutlarını Göster" butonuna tıklayın ve console'daki SQL'leri kopyalayıp çalıştırın.
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseSetup;