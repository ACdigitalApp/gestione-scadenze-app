-- Zenith Finances Sync System
-- Migration to create tables and functions for syncing data from Zenith Finances

-- Create sync_logs table for tracking synchronization history
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL DEFAULT 'zenith-import',
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for sync_logs
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(created_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs(status);

-- Enable RLS on sync_logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view sync logs
CREATE POLICY "Admin can view sync logs"
  ON public.sync_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admin can insert sync logs (for manual triggers)
CREATE POLICY "Admin can insert sync logs"
  ON public.sync_logs FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Create sync_settings table for configuration
CREATE TABLE IF NOT EXISTS public.sync_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  sync_interval INTEGER DEFAULT 60,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  zenith_url TEXT,
  auto_sync BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default sync settings
INSERT INTO public.sync_settings (id, enabled, zenith_url) 
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  true,
  'https://igptngecujtkofhbzjmj.supabase.co'
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on sync_settings
ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;

-- Admin can manage sync settings
CREATE POLICY "Admin can view sync settings"
  ON public.sync_settings FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admin can update sync settings"
  ON public.sync_settings FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Add zenith_id column to tables to track source records
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS zenith_id UUID;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS zenith_id UUID;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS zenith_id UUID;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS zenith_id UUID;

-- Create unique indexes on zenith_id for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_zenith_id ON public.transactions(zenith_id, user_id) WHERE zenith_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_zenith_id ON public.categories(zenith_id, user_id) WHERE zenith_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_zenith_id ON public.reminders(zenith_id, user_id) WHERE zenith_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_zenith_id ON public.payment_methods(zenith_id, user_id) WHERE zenith_id IS NOT NULL;

-- Add updated_at column to tables if not exists (for conflict resolution)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reminders_updated_at ON public.reminders;
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
