-- Migración para agregar campos de materiales de IA a la tabla posts

-- Agregar columnas para materiales de IA
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS material_id INTEGER,
ADD COLUMN IF NOT EXISTS material_type VARCHAR(50) CHECK (material_type IN ('ai_generated', 'pdf', 'link', 'text'));

-- Crear índice para mejorar el rendimiento en búsquedas por material
CREATE INDEX IF NOT EXISTS idx_posts_material_id ON public.posts(material_id);
CREATE INDEX IF NOT EXISTS idx_posts_material_type ON public.posts(material_type);

-- Comentarios para documentar las nuevas columnas
COMMENT ON COLUMN public.posts.material_id IS 'ID del material de IA asociado al post';
COMMENT ON COLUMN public.posts.material_type IS 'Tipo de material: ai_generated, pdf, link, text';
