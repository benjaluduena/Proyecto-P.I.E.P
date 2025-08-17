-- Migración para agregar índices de performance críticos
-- Ejecutar en Supabase SQL Editor

-- ============================================================
-- ÍNDICES PARA TABLA pdf_uploads
-- ============================================================

-- Índice para buscar PDFs por usuario (consulta más frecuente)
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id 
ON public.pdf_uploads (user_id);

-- Índice para búsquedas por fecha de creación
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_created_at 
ON public.pdf_uploads (created_at DESC);

-- Índice compuesto para búsquedas de usuario por fecha
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_created 
ON public.pdf_uploads (user_id, created_at DESC);

-- ============================================================
-- ÍNDICES PARA TABLA study_outputs
-- ============================================================

-- Índice para buscar outputs por PDF
CREATE INDEX IF NOT EXISTS idx_study_outputs_pdf_id 
ON public.study_outputs (pdf_id);

-- Índice para buscar outputs por tipo
CREATE INDEX IF NOT EXISTS idx_study_outputs_type 
ON public.study_outputs (type);

-- Índice compuesto para búsquedas por PDF y tipo
CREATE INDEX IF NOT EXISTS idx_study_outputs_pdf_type 
ON public.study_outputs (pdf_id, type);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_study_outputs_created_at 
ON public.study_outputs (created_at DESC);

-- ============================================================
-- ÍNDICES PARA TABLA subscriptions
-- ============================================================

-- Índice para buscar suscripciones por usuario (único por diseño, pero acelera consultas)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON public.subscriptions (user_id);

-- Índice para buscar por estado de suscripción
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
ON public.subscriptions (status);

-- Índice para buscar por ID de Mercado Pago
CREATE INDEX IF NOT EXISTS idx_subscriptions_mp_preapproval_id 
ON public.subscriptions (mp_preapproval_id);

-- Índice para fecha de próximo pago (para notificaciones)
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment 
ON public.subscriptions (next_payment_date) 
WHERE next_payment_date IS NOT NULL;

-- ============================================================
-- ÍNDICES PARA TABLA profiles
-- ============================================================

-- Índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role 
ON public.profiles (role);

-- Índice para búsquedas por nivel educativo
CREATE INDEX IF NOT EXISTS idx_profiles_education_level 
ON public.profiles (education_level);

-- Índice para estado de suscripción
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON public.profiles (subscription_status);

-- Índice para fecha de actualización
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at 
ON public.profiles (updated_at DESC);

-- ============================================================
-- ÍNDICES PARA TABLAS DE TAREAS (si existen)
-- ============================================================

-- Agregar si existe tabla tasks
-- CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
-- CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);
-- CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks (completed);

-- Agregar si existe tabla plans
-- CREATE INDEX IF NOT EXISTS idx_plans_user_id ON public.plans (user_id);
-- CREATE INDEX IF NOT EXISTS idx_plans_start_date ON public.plans (start_date);
-- CREATE INDEX IF NOT EXISTS idx_plans_end_date ON public.plans (end_date);

-- ============================================================
-- ESTADÍSTICAS Y MANTENIMIENTO
-- ============================================================

-- Actualizar estadísticas después de crear los índices
ANALYZE public.pdf_uploads;
ANALYZE public.study_outputs;
ANALYZE public.subscriptions;
ANALYZE public.profiles;

-- ============================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- ============================================================

-- Consulta para verificar que los índices se crearon correctamente
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================

COMMENT ON INDEX public.idx_pdf_uploads_user_id IS 'Índice para acelerar consultas de PDFs por usuario';
COMMENT ON INDEX public.idx_study_outputs_pdf_id IS 'Índice para acelerar consultas de outputs por PDF';
COMMENT ON INDEX public.idx_subscriptions_user_id IS 'Índice para acelerar consultas de suscripciones por usuario';
COMMENT ON INDEX public.idx_profiles_role IS 'Índice para acelerar consultas por rol de usuario';

-- ============================================================
-- NOTAS DE RENDIMIENTO
-- ============================================================

/*
RENDIMIENTO ESPERADO:
- Consultas de PDFs por usuario: 50-80% más rápidas
- Consultas de outputs por PDF: 60-90% más rápidas  
- Consultas de suscripciones: 40-70% más rápidas
- Búsquedas por tipo/estado: 30-60% más rápidas

MANTENIMIENTO:
- Los índices se actualizan automáticamente
- Ejecutar ANALYZE periódicamente para mantener estadísticas
- Monitorear uso de índices con pg_stat_user_indexes

ESPACIO EN DISCO:
- Cada índice consume espacio adicional (~10-20% del tamaño de la tabla)
- Monitorear crecimiento total de la base de datos
*/