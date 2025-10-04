-- Tablas necesarias para el sistema de Classroom
-- Ejecutar este archivo en tu base de datos de Supabase

-- 1. Tabla para mensajes del classroom
CREATE TABLE IF NOT EXISTS public.classroom_messages (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL,
  author_id UUID NOT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'announcement')),
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_classroom_messages_classroom_id 
    FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_classroom_messages_author_id 
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Tabla para comentarios en mensajes
CREATE TABLE IF NOT EXISTS public.classroom_comments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_classroom_comments_message_id 
    FOREIGN KEY (message_id) REFERENCES public.classroom_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_classroom_comments_author_id 
    FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Tabla para reacciones a mensajes
CREATE TABLE IF NOT EXISTS public.classroom_reactions (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL,
  user_id UUID NOT NULL,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'love', 'helpful', 'celebrate')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_classroom_reactions_message_id 
    FOREIGN KEY (message_id) REFERENCES public.classroom_messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_classroom_reactions_user_id 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Un usuario solo puede tener una reacción por mensaje
  UNIQUE(message_id, user_id, reaction_type)
);

-- 4. Tabla para recursos compartidos en el classroom
CREATE TABLE IF NOT EXISTS public.classroom_shared_resources (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL,
  shared_by UUID NOT NULL,
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('resumen', 'mapa_mental', 'verdadero_falso', 'multiple_choice', 'flashcards', 'problema')),
  resource_id INTEGER,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_classroom_shared_resources_classroom_id 
    FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_classroom_shared_resources_shared_by 
    FOREIGN KEY (shared_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_classroom_messages_classroom_id ON public.classroom_messages(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_author_id ON public.classroom_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_classroom_messages_created_at ON public.classroom_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_classroom_comments_message_id ON public.classroom_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_classroom_comments_author_id ON public.classroom_comments(author_id);

CREATE INDEX IF NOT EXISTS idx_classroom_reactions_message_id ON public.classroom_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_classroom_reactions_user_id ON public.classroom_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_classroom_shared_resources_classroom_id ON public.classroom_shared_resources(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_shared_resources_shared_by ON public.classroom_shared_resources(shared_by);

-- 6. Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Trigger para classroom_messages
DROP TRIGGER IF EXISTS update_classroom_messages_updated_at ON public.classroom_messages;
CREATE TRIGGER update_classroom_messages_updated_at
    BEFORE UPDATE ON public.classroom_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Insertar algunos datos de ejemplo para testing
-- (Opcional - puedes comentar estas líneas si no quieres datos de ejemplo)

-- Insertar un mensaje de ejemplo
INSERT INTO public.classroom_messages (classroom_id, author_id, message_type, content) 
VALUES (1, (SELECT id FROM auth.users LIMIT 1), 'text', '¡Bienvenidos a la clase! Este es nuestro primer mensaje.')
ON CONFLICT DO NOTHING;

-- Insertar un comentario de ejemplo
INSERT INTO public.classroom_comments (message_id, author_id, content)
SELECT 1, (SELECT id FROM auth.users LIMIT 1), '¡Gracias por la bienvenida!'
WHERE EXISTS (SELECT 1 FROM public.classroom_messages WHERE id = 1)
ON CONFLICT DO NOTHING;

