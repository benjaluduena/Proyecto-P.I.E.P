-- =====================================================
-- MIGRACIÓN A SUPABASE AUTH
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

-- 6. Migrar datos existentes (si los hay)
-- Primero, crear tabla temporal para mapear IDs
CREATE TEMP TABLE user_mapping (
    old_id INTEGER,
    new_id UUID,
    email VARCHAR(100)
);

-- Insertar mapeo de usuarios existentes (si los hay)
INSERT INTO user_mapping (old_id, new_id, email)
SELECT u.id, au.id, u.email
FROM users u
JOIN auth.users au ON u.email = au.email;

-- 7. Actualizar pdf_uploads para usar UUID
ALTER TABLE pdf_uploads 
ADD COLUMN user_id_new UUID;

UPDATE pdf_uploads 
SET user_id_new = um.new_id
FROM user_mapping um
WHERE pdf_uploads.user_id = um.old_id;

-- Eliminar la columna antigua y renombrar la nueva
ALTER TABLE pdf_uploads DROP COLUMN user_id;
ALTER TABLE pdf_uploads RENAME COLUMN user_id_new TO user_id;

-- Agregar la referencia a auth.users
ALTER TABLE pdf_uploads 
ADD CONSTRAINT pdf_uploads_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Actualizar study_plans para usar UUID
ALTER TABLE study_plans 
ADD COLUMN user_id_new UUID;

UPDATE study_plans 
SET user_id_new = um.new_id
FROM user_mapping um
WHERE study_plans.user_id = um.old_id;

-- Eliminar la columna antigua y renombrar la nueva
ALTER TABLE study_plans DROP COLUMN user_id;
ALTER TABLE study_plans RENAME COLUMN user_id_new TO user_id;

-- Agregar la referencia a auth.users
ALTER TABLE study_plans 
ADD CONSTRAINT study_plans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. Actualizar notifications para usar UUID
ALTER TABLE notifications 
ADD COLUMN user_id_new UUID;

UPDATE notifications 
SET user_id_new = um.new_id
FROM user_mapping um
WHERE notifications.user_id = um.old_id;

-- Eliminar la columna antigua y renombrar la nueva
ALTER TABLE notifications DROP COLUMN user_id;
ALTER TABLE notifications RENAME COLUMN user_id_new TO user_id;

-- Agregar la referencia a auth.users
ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. Actualizar progress_tracking para usar UUID
ALTER TABLE progress_tracking 
ADD COLUMN user_id_new UUID;

UPDATE progress_tracking 
SET user_id_new = um.new_id
FROM user_mapping um
WHERE progress_tracking.user_id = um.old_id;

-- Eliminar la columna antigua y renombrar la nueva
ALTER TABLE progress_tracking DROP COLUMN user_id;
ALTER TABLE progress_tracking RENAME COLUMN user_id_new TO user_id;

-- Agregar la referencia a auth.users
ALTER TABLE progress_tracking 
ADD CONSTRAINT progress_tracking_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 11. Eliminar la tabla users antigua
DROP TABLE IF EXISTS users;

-- 12. Configurar RLS (Row Level Security) para las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;

-- 13. Crear políticas RLS para profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 14. Crear políticas RLS para pdf_uploads
CREATE POLICY "Users can view own PDFs" ON pdf_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own PDFs" ON pdf_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own PDFs" ON pdf_uploads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own PDFs" ON pdf_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- 15. Crear políticas RLS para study_outputs (a través de pdf_uploads)
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

-- 16. Crear políticas RLS para study_plans
CREATE POLICY "Users can view own study plans" ON study_plans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study plans" ON study_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study plans" ON study_plans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study plans" ON study_plans
    FOR DELETE USING (auth.uid() = user_id);

-- 17. Crear políticas RLS para plan_tasks (a través de study_plans)
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

-- 18. Crear políticas RLS para notifications
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- 19. Crear políticas RLS para progress_tracking
CREATE POLICY "Users can view own progress" ON progress_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON progress_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON progress_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON progress_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- 20. Limpiar tabla temporal
DROP TABLE user_mapping;

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================
-- 
-- Cambios realizados:
-- 1. ✅ Creada tabla profiles para datos adicionales del usuario
-- 2. ✅ Migrados todos los user_id de INTEGER a UUID
-- 3. ✅ Actualizadas todas las referencias para usar auth.users
-- 4. ✅ Eliminada la tabla users antigua
-- 5. ✅ Habilitado RLS en todas las tablas
-- 6. ✅ Creadas políticas de seguridad para cada tabla
-- 7. ✅ Configurado trigger para crear perfil automáticamente
-- 
-- Notas importantes:
-- - Todos los user_id ahora son UUID que referencian auth.users(id)
-- - La tabla profiles contiene los datos adicionales del usuario
-- - RLS asegura que los usuarios solo vean sus propios datos
-- - El trigger handle_new_user crea automáticamente un perfil al registrar
-- 
-- Para completar la migración:
-- 1. Ejecutar este SQL en Supabase
-- 2. Actualizar las credenciales de Supabase en config.js
-- 3. Probar el registro y login de usuarios
-- ===================================================== 