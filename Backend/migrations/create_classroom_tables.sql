-- Tablas para el sistema de Classroom

-- Tabla de cursos/clases
CREATE TABLE public.classrooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  grade_level VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  join_code VARCHAR(10) UNIQUE NOT NULL, -- Código para unirse a la clase
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estudiantes inscritos en clases
CREATE TABLE public.classroom_enrollments (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  UNIQUE(classroom_id, student_id)
);

-- Tabla de materiales compartidos en el classroom
CREATE TABLE public.classroom_materials (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  pdf_id INTEGER NOT NULL REFERENCES public.pdf_uploads(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date DATE,
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Tabla de contenido generado por IA para materiales del classroom
CREATE TABLE public.classroom_study_outputs (
  id SERIAL PRIMARY KEY,
  classroom_material_id INTEGER NOT NULL REFERENCES public.classroom_materials(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('resumen', 'recomendacion_video', 'recomendacion_texto', 'multiple_choice', 'verdadero_falso', 'flashcards', 'problema')),
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de progreso de estudiantes en materiales del classroom
CREATE TABLE public.classroom_progress (
  id SERIAL PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classroom_material_id INTEGER NOT NULL REFERENCES public.classroom_materials(id) ON DELETE CASCADE,
  output_id INTEGER REFERENCES public.classroom_study_outputs(id) ON DELETE CASCADE,
  interaction_type VARCHAR(20) NOT NULL CHECK (interaction_type IN ('leido', 'completado', 'respondido')),
  score NUMERIC,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, classroom_material_id, output_id)
);

-- Tabla de tareas asignadas por el docente
CREATE TABLE public.classroom_assignments (
  id SERIAL PRIMARY KEY,
  classroom_id INTEGER NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  material_id INTEGER REFERENCES public.classroom_materials(id) ON DELETE SET NULL,
  due_date TIMESTAMP,
  points INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de entregas de tareas por estudiantes
CREATE TABLE public.assignment_submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grade NUMERIC,
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMP,
  UNIQUE(assignment_id, student_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_classroom_enrollments_student ON public.classroom_enrollments(student_id);
CREATE INDEX idx_classroom_enrollments_classroom ON public.classroom_enrollments(classroom_id);
CREATE INDEX idx_classroom_materials_classroom ON public.classroom_materials(classroom_id);
CREATE INDEX idx_classroom_progress_student ON public.classroom_progress(student_id);
CREATE INDEX idx_classroom_progress_material ON public.classroom_progress(classroom_material_id);
CREATE INDEX idx_classroom_assignments_classroom ON public.classroom_assignments(classroom_id);
CREATE INDEX idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student ON public.assignment_submissions(student_id);

-- Función para generar códigos únicos de unión
CREATE OR REPLACE FUNCTION generate_join_code() RETURNS VARCHAR(10) AS $$
DECLARE
  code VARCHAR(10);
  exists_code BOOLEAN;
BEGIN
  LOOP
    -- Generar código aleatorio de 6 caracteres
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM public.classrooms WHERE join_code = code) INTO exists_code;
    
    -- Si no existe, retornar el código
    IF NOT exists_code THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql; 