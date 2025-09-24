-- Función para crear la tabla user_goals si no existe
CREATE OR REPLACE FUNCTION create_user_goals_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Crear tabla user_goals si no existe
  CREATE TABLE IF NOT EXISTS public.user_goals (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('daily_content', 'weekly_hours', 'monthly_pdfs', 'streak_days')),
    target INTEGER NOT NULL CHECK (target > 0),
    deadline DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Crear índices para optimizar consultas
  CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON public.user_goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_goals_active ON public.user_goals(active);
  CREATE INDEX IF NOT EXISTS idx_user_goals_type ON public.user_goals(type);
  CREATE INDEX IF NOT EXISTS idx_user_goals_deadline ON public.user_goals(deadline);

  -- Crear trigger para actualizar updated_at
  CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
  RETURNS TRIGGER AS $trigger$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $trigger$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trigger_update_user_goals_updated_at ON public.user_goals;
  CREATE TRIGGER trigger_update_user_goals_updated_at
    BEFORE UPDATE ON public.user_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_goals_updated_at();

  -- Habilitar RLS (Row Level Security)
  ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

  -- Crear políticas de seguridad
  DROP POLICY IF EXISTS "Users can view their own goals" ON public.user_goals;
  CREATE POLICY "Users can view their own goals" ON public.user_goals
    FOR SELECT USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert their own goals" ON public.user_goals;
  CREATE POLICY "Users can insert their own goals" ON public.user_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update their own goals" ON public.user_goals;
  CREATE POLICY "Users can update their own goals" ON public.user_goals
    FOR UPDATE USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can delete their own goals" ON public.user_goals;
  CREATE POLICY "Users can delete their own goals" ON public.user_goals
    FOR DELETE USING (auth.uid() = user_id);

END;
$$;