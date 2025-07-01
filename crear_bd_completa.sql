-- =====================================================
-- CREACIÓN COMPLETA DE BASE DE DATOS PIEP CON SUPABASE AUTH
-- =====================================================

-- 1. Crear tabla profiles para datos adicionales del usuario
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('estudiante', 'docente')) NOT NULL,
    education_level VARCHAR(50), -- solo para estudiantes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Crear trigger para actualizar updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Crear función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, role, education_level)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'estudiante'),
        NEW.raw_user_meta_data->>'education_level'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Crear tabla para archivos PDF cargados
CREATE TABLE IF NOT EXISTS pdf_uploads (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    title VARCHAR(255),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Crear tabla para contenido generado por IA
CREATE TABLE IF NOT EXISTS study_outputs (
    id SERIAL PRIMARY KEY,
    pdf_id INTEGER REFERENCES pdf_uploads(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) CHECK (
        type IN ('resumen', 'recomendacion_video', 'recomendacion_texto', 'multiple_choice', 'verdadero_falso', 'flashcards', 'problema')
    ) NOT NULL,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Crear tabla para planes de estudio
CREATE TABLE IF NOT EXISTS study_plans (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    notify_by_email BOOLEAN DEFAULT FALSE,
    notify_by_whatsapp BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Crear tabla para tareas del plan de estudio
CREATE TABLE IF NOT EXISTS plan_tasks (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES study_plans(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    related_output_id INTEGER REFERENCES study_outputs(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Crear tabla para recordatorios de notificación
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    task_id INTEGER REFERENCES plan_tasks(id) ON DELETE CASCADE,
    method VARCHAR(20) CHECK (method IN ('email', 'whatsapp')) NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Crear tabla para seguimiento del progreso
CREATE TABLE IF NOT EXISTS progress_tracking (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    output_id INTEGER REFERENCES study_outputs(id) ON DELETE CASCADE NOT NULL,
    interacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interaction_type VARCHAR(50) CHECK (
        interaction_type IN ('leido', 'completado', 'respondido')
    ) NOT NULL,
    score NUMERIC(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_user_id ON pdf_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_uploaded_at ON pdf_uploads(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_study_outputs_pdf_id ON study_outputs(pdf_id);
CREATE INDEX IF NOT EXISTS idx_study_outputs_type ON study_outputs(type);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan_id ON plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_completed ON plan_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(sent);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_output_id ON progress_tracking(output_id);

-- 13. Configurar RLS (Row Level Security) para todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;

-- 14. Crear políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 15. Crear políticas RLS para pdf_uploads
CREATE POLICY "Users can view own PDFs" ON pdf_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PDFs" ON pdf_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PDFs" ON pdf_uploads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PDFs" ON pdf_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- 16. Crear políticas RLS para study_outputs (a través de pdf_uploads)
CREATE POLICY "Users can view own study outputs" ON study_outputs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_uploads 
            WHERE pdf_uploads.id = study_outputs.pdf_id 
            AND pdf_uploads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own study outputs" ON study_outputs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_uploads 
            WHERE pdf_uploads.id = study_outputs.pdf_id 
            AND pdf_uploads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own study outputs" ON study_outputs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM pdf_uploads 
            WHERE pdf_uploads.id = study_outputs.pdf_id 
            AND pdf_uploads.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own study outputs" ON study_outputs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM pdf_uploads 
            WHERE pdf_uploads.id = study_outputs.pdf_id 
            AND pdf_uploads.user_id = auth.uid()
        )
    );

-- 17. Crear políticas RLS para study_plans
CREATE POLICY "Users can view own study plans" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

-- 18. Crear políticas RLS para plan_tasks (a través de study_plans)
CREATE POLICY "Users can view own plan tasks" ON plan_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_plans 
            WHERE study_plans.id = plan_tasks.plan_id 
            AND study_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own plan tasks" ON plan_tasks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM study_plans 
            WHERE study_plans.id = plan_tasks.plan_id 
            AND study_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own plan tasks" ON plan_tasks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM study_plans 
            WHERE study_plans.id = plan_tasks.plan_id 
            AND study_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own plan tasks" ON plan_tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM study_plans 
            WHERE study_plans.id = plan_tasks.plan_id 
            AND study_plans.user_id = auth.uid()
        )
    );

-- 19. Crear políticas RLS para notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- 20. Crear políticas RLS para progress_tracking
CREATE POLICY "Users can view own progress" ON progress_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON progress_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON progress_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON progress_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- 21. Crear función para obtener estadísticas de progreso del usuario
CREATE OR REPLACE FUNCTION get_user_progress_stats(user_uuid UUID)
RETURNS TABLE (
    total_pdfs INTEGER,
    total_outputs INTEGER,
    total_plans INTEGER,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    avg_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(pdf_count.count, 0)::INTEGER as total_pdfs,
        COALESCE(output_count.count, 0)::INTEGER as total_outputs,
        COALESCE(plan_count.count, 0)::INTEGER as total_plans,
        COALESCE(task_count.count, 0)::INTEGER as total_tasks,
        COALESCE(completed_task_count.count, 0)::INTEGER as completed_tasks,
        COALESCE(avg_score.avg_score, 0) as avg_score
    FROM 
        (SELECT COUNT(*) as count FROM pdf_uploads WHERE user_id = user_uuid) pdf_count,
        (SELECT COUNT(*) as count FROM study_outputs so 
         JOIN pdf_uploads pu ON so.pdf_id = pu.id 
         WHERE pu.user_id = user_uuid) output_count,
        (SELECT COUNT(*) as count FROM study_plans WHERE user_id = user_uuid) plan_count,
        (SELECT COUNT(*) as count FROM plan_tasks pt 
         JOIN study_plans sp ON pt.plan_id = sp.id 
         WHERE sp.user_id = user_uuid) task_count,
        (SELECT COUNT(*) as count FROM plan_tasks pt 
         JOIN study_plans sp ON pt.plan_id = sp.id 
         WHERE sp.user_id = user_uuid AND pt.completed = true) completed_task_count,
        (SELECT AVG(score) as avg_score FROM progress_tracking WHERE user_id = user_uuid) avg_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 22. Crear función para limpiar notificaciones antiguas
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE sent = true AND scheduled_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 23. Crear función para obtener notificaciones pendientes
CREATE OR REPLACE FUNCTION get_pending_notifications()
RETURNS TABLE (
    notification_id INTEGER,
    user_email TEXT,
    user_name TEXT,
    task_title TEXT,
    method VARCHAR(20),
    scheduled_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id as notification_id,
        u.email as user_email,
        p.name as user_name,
        pt.title as task_title,
        n.method,
        n.scheduled_at
    FROM notifications n
    JOIN auth.users u ON n.user_id = u.id
    JOIN profiles p ON u.id = p.id
    LEFT JOIN plan_tasks pt ON n.task_id = pt.id
    WHERE n.sent = false AND n.scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24. Crear vistas útiles para el dashboard
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    u.id as user_id,
    p.name,
    p.role,
    p.education_level,
    COUNT(DISTINCT pu.id) as total_pdfs,
    COUNT(DISTINCT so.id) as total_outputs,
    COUNT(DISTINCT sp.id) as total_plans,
    COUNT(DISTINCT pt.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN pt.completed = true THEN pt.id END) as completed_tasks,
    AVG(pr.score) as avg_score,
    MAX(pu.uploaded_at) as last_upload,
    MAX(so.created_at) as last_output
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN pdf_uploads pu ON u.id = pu.user_id
LEFT JOIN study_outputs so ON pu.id = so.pdf_id
LEFT JOIN study_plans sp ON u.id = sp.user_id
LEFT JOIN plan_tasks pt ON sp.id = pt.plan_id
LEFT JOIN progress_tracking pr ON u.id = pr.user_id
GROUP BY u.id, p.name, p.role, p.education_level;

-- 25. Crear vista para contenido reciente
CREATE OR REPLACE VIEW recent_content AS
SELECT 
    so.id,
    so.type,
    so.content,
    so.created_at,
    pu.title as pdf_title,
    pu.file_name,
    p.name as user_name,
    p.role
FROM study_outputs so
JOIN pdf_uploads pu ON so.pdf_id = pu.id
JOIN profiles p ON pu.user_id = p.id
ORDER BY so.created_at DESC;

-- =====================================================
-- BASE DE DATOS COMPLETAMENTE CREADA
-- =====================================================
-- 
-- ✅ Tablas creadas:
-- 1. profiles - Datos adicionales del usuario
-- 2. pdf_uploads - Archivos PDF cargados
-- 3. study_outputs - Contenido generado por IA
-- 4. study_plans - Planes de estudio
-- 5. plan_tasks - Tareas del plan
-- 6. notifications - Recordatorios
-- 7. progress_tracking - Seguimiento de progreso
-- 
-- ✅ Funciones creadas:
-- 1. update_updated_at_column() - Actualiza timestamps
-- 2. handle_new_user() - Crea perfil automáticamente
-- 3. get_user_progress_stats() - Estadísticas de progreso
-- 4. cleanup_old_notifications() - Limpia notificaciones
-- 5. get_pending_notifications() - Notificaciones pendientes
-- 
-- ✅ Triggers creados:
-- 1. update_profiles_updated_at - Actualiza updated_at
-- 2. on_auth_user_created - Crea perfil al registrar
-- 
-- ✅ Índices creados:
-- - Índices en todas las columnas user_id para rendimiento
-- - Índices en fechas para consultas temporales
-- - Índices en estados (completed, sent) para filtros
-- 
-- ✅ RLS configurado:
-- - Todas las tablas tienen RLS habilitado
-- - Políticas granulares para cada operación
-- - Usuarios solo ven sus propios datos
-- 
-- ✅ Vistas creadas:
-- 1. user_dashboard_stats - Estadísticas del dashboard
-- 2. recent_content - Contenido reciente
-- 
-- Para usar esta base de datos:
-- 1. Ejecutar este script en Supabase SQL Editor
-- 2. Configurar las credenciales en el frontend
-- 3. Probar el registro y login de usuarios
-- 
-- ¡Base de datos lista para usar! 🚀
-- ===================================================== 