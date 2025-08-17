const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');
const OpenAI = require('openai');

const openai = new OpenAI();


// Middleware para verificar si el usuario es docente
const isTeacher = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Consulta más abierta para debug
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)   // <-- si acá no encuentra, prueba con 'user_id'
      .maybeSingle();

    console.log("Perfil encontrado:", profile, "Error:", error);

    if (error) {
      return res.status(500).json({ error: "Error al consultar perfil" });
    }

    if (!profile) {
      return res.status(403).json({ error: "Perfil no encontrado" });
    }

    if (!profile.role || profile.role.toLowerCase() !== "docente") {
      return res.status(403).json({ error: "Acceso denegado: no es docente" });
    }

    next();
  } catch (err) {
    console.error("Error en isTeacher:", err);
    res.status(500).json({ error: "Error interno en la validación" });
  }
};



// Middleware para verificar si el usuario es estudiante
const isStudent = async (req, res, next) => {
  console.log('req.user:', req.user);

  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .maybeSingle();

    console.log('profile:', profile, 'error:', error);

    if (error) {
      console.error('Error al consultar perfil:', error);
      return res.status(500).json({ error: 'Error interno del servidor al consultar perfil' });
    }

    if (!profile) {
      console.warn('Perfil no encontrado en la base de datos para id:', req.user.id);
      return res.status(403).json({ error: 'Perfil no encontrado' });
    }

    if (!profile.role || profile.role.toLowerCase() !== 'estudiante') {
      console.warn(`Acceso denegado. Role actual: ${profile.role}`);
      return res.status(403).json({ error: 'Acceso denegado. Solo estudiantes pueden realizar esta acción.' });
    }

    next();
  } catch (err) {
    console.error('Error verificando rol de estudiante:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// ===== RUTAS PARA DOCENTES =====

// Crear un nuevo classroom
router.post('/create', supabaseAuth, isTeacher, async (req, res) => {
  try {
    const { name, description, subject, grade_level } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del classroom es requerido' });
    }

    // Generar código único de unión
    const { data: joinCode, error: codeError } = await supabase.rpc('generate_join_code');
    
    if (codeError) {
      console.error('Error generando código de unión:', codeError);
      return res.status(500).json({ error: 'Error generando código de unión' });
    }

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .insert({
        name,
        description,
        teacher_id: req.user.id,
        subject,
        grade_level,
        join_code: joinCode
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando classroom:', error);
      return res.status(500).json({ error: 'Error creando el classroom' });
    }

    res.json({ success: true, classroom });
  } catch (error) {
    console.error('Error en crear classroom:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener classrooms del docente
router.get('/teacher/classrooms', supabaseAuth, isTeacher, async (req, res) => {
  try {
    const { data: classrooms, error } = await supabase
      .from('classrooms')
      .select(`
        *,
        classroom_enrollments(count),
        classroom_materials(count)
      `)
      .eq('teacher_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo classrooms:', error);
      return res.status(500).json({ error: 'Error obteniendo classrooms' });
    }

    res.json({ classrooms });
  } catch (error) {
    console.error('Error en obtener classrooms del docente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Agregar material a un classroom
router.post('/:classroomId/materials', supabaseAuth, isTeacher, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { pdf_id, title, description, due_date, is_required, order_index } = req.body;

    // Verificar que el classroom pertenece al docente
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', classroomId)
      .eq('teacher_id', req.user.id)
      .single();

    if (classroomError || !classroom) {
      return res.status(404).json({ error: 'Classroom no encontrado o no tienes permisos' });
    }

    const { data: material, error } = await supabase
      .from('classroom_materials')
      .insert({
        classroom_id: classroomId,
        pdf_id,
        title,
        description,
        assigned_by: req.user.id,
        due_date,
        is_required,
        order_index
      })
      .select()
      .single();

    if (error) {
      console.error('Error agregando material:', error);
      return res.status(500).json({ error: 'Error agregando material al classroom' });
    }

    res.json({ success: true, material });
  } catch (error) {
    console.error('Error en agregar material:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Generar contenido educativo para material del classroom
router.post('/materials/:materialId/generate-content', supabaseAuth, isTeacher, async (req, res) => {
  try {
    const { materialId } = req.params;
    const { contentType, educationLevel } = req.body;

    // Obtener el material y verificar permisos
    const { data: material, error: materialError } = await supabase
      .from('classroom_materials')
      .select(`
        *,
        pdf_uploads(file_url, file_name),
        classrooms(teacher_id)
      `)
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    if (material.classrooms.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para este material' });
    }

    // Obtener el contenido del PDF
    const pdfText = await extractTextFromPDF(material.pdf_uploads.file_url);

    // Generar contenido con IA
    const content = await generateEducationalContent(pdfText, contentType, educationLevel);

    // Guardar el contenido generado
    const { data: output, error: outputError } = await supabase
      .from('classroom_study_outputs')
      .insert({
        classroom_material_id: materialId,
        type: contentType,
        content
      })
      .select()
      .single();

    if (outputError) {
      console.error('Error guardando contenido generado:', outputError);
      return res.status(500).json({ error: 'Error guardando contenido generado' });
    }

    res.json({ success: true, output });
  } catch (error) {
    console.error('Error generando contenido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear tarea para el classroom
router.post('/:classroomId/assignments', supabaseAuth, isTeacher, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { title, description, material_id, due_date, points } = req.body;

    // Verificar que el classroom pertenece al docente
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('id')
      .eq('id', classroomId)
      .eq('teacher_id', req.user.id)
      .single();

    if (classroomError || !classroom) {
      return res.status(404).json({ error: 'Classroom no encontrado o no tienes permisos' });
    }

    const { data: assignment, error } = await supabase
      .from('classroom_assignments')
      .insert({
        classroom_id: classroomId,
        title,
        description,
        material_id,
        due_date,
        points,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creando tarea:', error);
      return res.status(500).json({ error: 'Error creando la tarea' });
    }

    res.json({ success: true, assignment });
  } catch (error) {
    console.error('Error en crear tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== RUTAS PARA ESTUDIANTES =====

// Unirse a un classroom con código
router.post('/join', supabaseAuth, isStudent, async (req, res) => {
  try {
    const { join_code } = req.body;

    if (!join_code) {
      return res.status(400).json({ error: 'Código de unión requerido' });
    }

    // Buscar el classroom por código
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('join_code', join_code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (classroomError || !classroom) {
      return res.status(404).json({ error: 'Código de classroom inválido o classroom inactivo' });
    }

    // Verificar si ya está inscrito
    const { data: existingEnrollment, error: enrollmentError } = await supabase
      .from('classroom_enrollments')
      .select('id')
      .eq('classroom_id', classroom.id)
      .eq('student_id', req.user.id)
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Ya estás inscrito en este classroom' });
    }

    // Inscribir al estudiante
    const { data: enrollment, error } = await supabase
      .from('classroom_enrollments')
      .insert({
        classroom_id: classroom.id,
        student_id: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error inscribiendo estudiante:', error);
      return res.status(500).json({ error: 'Error uniéndose al classroom' });
    }

    res.json({ success: true, classroom, enrollment });
  } catch (error) {
    console.error('Error en unirse a classroom:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener classrooms del estudiante
router.get('/student/classrooms', supabaseAuth, isStudent, async (req, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('classroom_enrollments')
      .select(`
        *,
        classrooms(
          *,
          profiles!classrooms_teacher_id_fkey(name),
          classroom_materials(count)
        )
      `)
      .eq('student_id', req.user.id)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo classrooms del estudiante:', error);
      return res.status(500).json({ error: 'Error obteniendo classrooms' });
    }

    res.json({ classrooms: enrollments });
  } catch (error) {
    console.error('Error en obtener classrooms del estudiante:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener materiales de un classroom
router.get('/:classroomId/materials', supabaseAuth, async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Verificar que el usuario tiene acceso al classroom
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('classroom_enrollments')
      .select('id')
      .eq('classroom_id', classroomId)
      .eq('student_id', req.user.id)
      .single();

    if (enrollmentError && req.user.role !== 'docente') {
      return res.status(403).json({ error: 'No tienes acceso a este classroom' });
    }

    const { data: materials, error } = await supabase
      .from('classroom_materials')
      .select(`
        *,
        pdf_uploads(file_name, file_url),
        classroom_study_outputs(type, content),
        profiles!classroom_materials_assigned_by_fkey(name)
      `)
      .eq('classroom_id', classroomId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error obteniendo materiales:', error);
      return res.status(500).json({ error: 'Error obteniendo materiales' });
    }

    res.json({ materials });
  } catch (error) {
    console.error('Error en obtener materiales:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar progreso en material del classroom
router.post('/materials/:materialId/progress', supabaseAuth, isStudent, async (req, res) => {
  try {
    const { materialId } = req.params;
    const { output_id, interaction_type, score } = req.body;

    // Verificar que el estudiante tiene acceso al material
    const { data: material, error: materialError } = await supabase
      .from('classroom_materials')
      .select(`
        *,
        classroom_enrollments!inner(student_id)
      `)
      .eq('id', materialId)
      .eq('classroom_enrollments.student_id', req.user.id)
      .single();

    if (materialError || !material) {
      return res.status(403).json({ error: 'No tienes acceso a este material' });
    }

    const { data: progress, error } = await supabase
      .from('classroom_progress')
      .upsert({
        student_id: req.user.id,
        classroom_material_id: materialId,
        output_id,
        interaction_type,
        score
      }, { onConflict: 'student_id,classroom_material_id,output_id' })
      .select()
      .single();

    if (error) {
      console.error('Error registrando progreso:', error);
      return res.status(500).json({ error: 'Error registrando progreso' });
    }

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Error en registrar progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ===== RUTAS GENERALES =====

// Obtener detalles de un classroom
router.get('/:classroomId', supabaseAuth, async (req, res) => {
  try {
    const { classroomId } = req.params;

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .select(`
        *,
        profiles!classrooms_teacher_id_fkey(name, email),
        classroom_enrollments(
          *,
          profiles!classroom_enrollments_student_id_fkey(name, email)
        )
      `)
      .eq('id', classroomId)
      .single();

    if (error || !classroom) {
      return res.status(404).json({ error: 'Classroom no encontrado' });
    }

    res.json({ classroom });
  } catch (error) {
    console.error('Error obteniendo classroom:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Funciones auxiliares
async function extractTextFromPDF(fileUrl) {
  // Implementar extracción de texto del PDF
  // Por ahora retornamos un texto de ejemplo
  return "Contenido del PDF extraído...";
}

async function generateEducationalContent(pdfText, contentType, educationLevel) {
  // Implementar generación de contenido con OpenAI
  // Por ahora retornamos contenido de ejemplo
  return {
    type: contentType,
    content: "Contenido generado por IA...",
    educationLevel
  };
}

module.exports = router; 