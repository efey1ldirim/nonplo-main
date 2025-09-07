// Database types for Supabase tables
export interface Agent {
  id: string;
  business_name: string;
  created_at: string;
  user_id: string;
}

export interface Playbook {
  id: string;
  agent_id: string;
  config: any; // JSONB field
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: Agent;
        Insert: Omit<Agent, 'id' | 'created_at'>;
        Update: Partial<Omit<Agent, 'id' | 'created_at'>>;
      };
      playbooks: {
        Row: Playbook;
        Insert: Omit<Playbook, 'id' | 'created_at'>;
        Update: Partial<Omit<Playbook, 'id' | 'created_at'>>;
      };
    };
  };
}