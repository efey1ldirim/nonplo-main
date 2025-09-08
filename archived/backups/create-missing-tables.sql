-- Create account_deletions table if not exists
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
);

-- Create user_status table if not exists
CREATE TABLE IF NOT EXISTS user_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamp with time zone,
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);