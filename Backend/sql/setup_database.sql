-- Script para configurar la base de datos con las nuevas funcionalidades
-- Ejecutar este script en la consola SQL de Supabase

-- 1. Crear función helper para la tabla de metas
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

-- 2. Ejecutar la función para crear la tabla
SELECT create_user_goals_table();

-- 3. Crear índices adicionales para optimización de consultas de analytics
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id_date ON public.progress_tracking(user_id, interacted_at);
CREATE INDEX IF NOT EXISTS idx_study_outputs_created_at ON public.study_outputs(created_at);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id_date ON public.pdf_uploads(user_id, uploaded_at);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_completed ON public.plan_tasks(completed);

-- 4. Crear vista para estadísticas del usuario (opcional, para optimización)
CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
  p.id as user_id,
  p.name,
  p.role,
  p.education_level,
  p.created_at as registration_date,
  -- Contar interacciones totales
  (SELECT COUNT(*) FROM progress_tracking pt WHERE pt.user_id = p.id) as total_interactions,
  -- Contar PDFs subidos
  (SELECT COUNT(*) FROM pdf_uploads pu WHERE pu.user_id = p.id) as total_pdfs,
  -- Calcular promedio de puntuación
  (SELECT COALESCE(AVG(pt.score), 0) FROM progress_tracking pt WHERE pt.user_id = p.id AND pt.score IS NOT NULL) as average_score,
  -- Días desde el registro
  (SELECT EXTRACT(DAY FROM NOW() - p.created_at)) as days_since_registration
FROM profiles p;

-- 5. Crear función para calcular racha de estudio
CREATE OR REPLACE FUNCTION calculate_user_streak(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  streak_count INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  found_activity BOOLEAN;
BEGIN
  LOOP
    -- Verificar si hay actividad en la fecha actual
    SELECT EXISTS(
      SELECT 1 FROM progress_tracking 
      WHERE user_id = user_uuid 
      AND DATE(interacted_at) = check_date
    ) INTO found_activity;
    
    -- Si hay actividad, incrementar contador y verificar día anterior
    IF found_activity THEN
      streak_count := streak_count + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      -- Si no hay actividad, terminar el bucle
      EXIT;
    END IF;
    
    -- Límite de seguridad para evitar bucles infinitos
    IF streak_count > 365 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN streak_count;
END;
$$;

-- 6. Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Base de datos configurada exitosamente para el sistema de estadísticas avanzadas.';
  RAISE NOTICE 'Tablas creadas: user_goals';
  RAISE NOTICE 'Índices creados para optimización de consultas';
  RAISE NOTICE 'Funciones creadas: calculate_user_streak, create_user_goals_table';
  RAISE NOTICE 'Políticas RLS configuradas para user_goals';
END $$;