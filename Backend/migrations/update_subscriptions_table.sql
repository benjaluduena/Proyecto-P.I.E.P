-- Actualizar tabla subscriptions para incluir metadata
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS metadata jsonb,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;