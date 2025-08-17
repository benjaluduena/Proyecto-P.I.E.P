-- Migración para agregar foreign keys y constraints de integridad
-- Ejecutar en Supabase SQL Editor DESPUÉS de add_performance_indexes.sql

-- ============================================================
-- VERIFICAR ESTRUCTURA ACTUAL DE TABLAS
-- ============================================================

-- Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================================
-- FOREIGN KEYS PARA pdf_uploads
-- ============================================================

-- FK hacia profiles (user_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_pdf_uploads_user_id'
  ) THEN
    ALTER TABLE public.pdf_uploads 
    ADD CONSTRAINT fk_pdf_uploads_user_id 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- FOREIGN KEYS PARA study_outputs
-- ============================================================

-- FK hacia pdf_uploads (pdf_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_study_outputs_pdf_id'
  ) THEN
    ALTER TABLE public.study_outputs 
    ADD CONSTRAINT fk_study_outputs_pdf_id 
    FOREIGN KEY (pdf_id) REFERENCES public.pdf_uploads(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- FOREIGN KEYS PARA subscriptions
-- ============================================================

-- FK hacia profiles (user_id)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_subscriptions_user_id'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT fk_subscriptions_user_id 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- CONSTRAINTS DE VALIDACIÓN
-- ============================================================

-- Constraint para validar email en profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_profiles_email_format'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT chk_profiles_email_format 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

-- Constraint para validar rol en profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_profiles_role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT chk_profiles_role 
    CHECK (role IN ('estudiante', 'profesor', 'admin'));
  END IF;
END $$;

-- Constraint para validar nivel educativo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_profiles_education_level'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT chk_profiles_education_level 
    CHECK (education_level IN ('primaria', 'secundaria', 'universitario', 'posgrado'));
  END IF;
END $$;

-- Constraint para validar estado de suscripción
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_subscriptions_status'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT chk_subscriptions_status 
    CHECK (status IN ('pending', 'authorized', 'paused', 'cancelled'));
  END IF;
END $$;

-- Constraint para validar monto positivo en suscripciones
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_subscriptions_amount_positive'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT chk_subscriptions_amount_positive 
    CHECK (amount > 0);
  END IF;
END $$;

-- Constraint para validar tipo de contenido en study_outputs
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_study_outputs_type'
  ) THEN
    ALTER TABLE public.study_outputs 
    ADD CONSTRAINT chk_study_outputs_type 
    CHECK (type IN ('resumen', 'recomendacion_video', 'recomendacion_texto', 'multiple_choice', 'verdadero_falso', 'flashcards', 'problema'));
  END IF;
END $$;

-- ============================================================
-- CONSTRAINTS NOT NULL
-- ============================================================

-- Asegurar campos obligatorios en profiles
ALTER TABLE public.profiles 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN role SET NOT NULL,
ALTER COLUMN education_level SET NOT NULL;

-- Asegurar campos obligatorios en pdf_uploads
ALTER TABLE public.pdf_uploads 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN title SET NOT NULL,
ALTER COLUMN file_url SET NOT NULL;

-- Asegurar campos obligatorios en study_outputs
ALTER TABLE public.study_outputs 
ALTER COLUMN pdf_id SET NOT NULL,
ALTER COLUMN type SET NOT NULL,
ALTER COLUMN content SET NOT NULL;

-- Asegurar campos obligatorios en subscriptions
ALTER TABLE public.subscriptions 
ALTER COLUMN user_id SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

-- ============================================================
-- CONSTRAINTS ÚNICOS
-- ============================================================

-- Email único en profiles (si no existe ya)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- Usuario único por suscripción (si no existe ya)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'subscriptions_user_unique'
  ) THEN
    ALTER TABLE public.subscriptions 
    ADD CONSTRAINT subscriptions_user_unique UNIQUE (user_id);
  END IF;
END $$;

-- ============================================================
-- VALORES POR DEFECTO
-- ============================================================

-- Valor por defecto para rol
ALTER TABLE public.profiles 
ALTER COLUMN role SET DEFAULT 'estudiante';

-- Valor por defecto para nivel educativo
ALTER TABLE public.profiles 
ALTER COLUMN education_level SET DEFAULT 'universitario';

-- Valor por defecto para estado de suscripción
ALTER TABLE public.subscriptions 
ALTER COLUMN status SET DEFAULT 'pending';

-- Valores por defecto para timestamps
ALTER TABLE public.profiles 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.pdf_uploads 
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.study_outputs 
ALTER COLUMN created_at SET DEFAULT now();

ALTER TABLE public.subscriptions 
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

-- ============================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VERIFICACIÓN DE CONSTRAINTS
-- ============================================================

-- Listar todas las constraints creadas
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'pdf_uploads', 'study_outputs', 'subscriptions')
ORDER BY tc.table_name, tc.constraint_type;

-- ============================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================

COMMENT ON CONSTRAINT fk_pdf_uploads_user_id ON public.pdf_uploads IS 'Referencia al usuario propietario del PDF';
COMMENT ON CONSTRAINT fk_study_outputs_pdf_id ON public.study_outputs IS 'Referencia al PDF del cual se generó el contenido';
COMMENT ON CONSTRAINT fk_subscriptions_user_id ON public.subscriptions IS 'Referencia al usuario de la suscripción';
COMMENT ON CONSTRAINT chk_profiles_role ON public.profiles IS 'Validación de roles permitidos';
COMMENT ON CONSTRAINT chk_subscriptions_status ON public.subscriptions IS 'Validación de estados de suscripción permitidos';

-- Mensaje de finalización
SELECT 'Migración de constraints completada exitosamente' AS resultado;