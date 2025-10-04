const express = require("express");
const router = express.Router(); // 🔹 definir router al inicio
const supabase = require("../config/supabase");
const { supabaseAuth } = require("../middleware/auth");
const OpenAI = require("openai");

const openai = new OpenAI();

/**
 * 🔹 Helper: obtener perfil del usuario desde Supabase
 */
const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * 🔹 Middleware: inyectar perfil en req.profile
 */
const attachProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(403).json({ error: "Perfil no encontrado en la BD" });
    }

    req.profile = profile; // guardamos el perfil en la request
    next();
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error interno obteniendo perfil" });
  }
};

/**
 * 🔹 Middleware: verificar rol de docente
 */
const isTeacher = (req, res, next) => {
  if (req.profile.role?.toLowerCase() !== "docente") {
    return res
      .status(403)
      .json({ error: "Acceso denegado: solo docentes pueden realizar esta acción" });
  }
  next();
};

/**
 * 🔹 Middleware: verificar rol de estudiante
 */
const isStudent = (req, res, next) => {
  if (req.profile.role?.toLowerCase() !== "estudiante") {
    return res
      .status(403)
      .json({ error: "Acceso denegado: solo estudiantes pueden realizar esta acción" });
  }
  next();
};
const isMemberOfClassroom = async (userId, classroomId) => {
  // Verificar si es el docente del classroom
  const { data: cls } = await supabase
    .from("classrooms")
    .select("id, teacher_id")
    .eq("id", classroomId)
    .maybeSingle();

  if (cls?.teacher_id === userId) return true;

  // Verificar si es un estudiante inscrito
  const { data: enr } = await supabase
    .from("classroom_enrollments")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("student_id", userId)
    .maybeSingle();

  return !!enr;
};
/* ======================
   RUTAS DE DOCENTES
   ====================== */

// Crear classroom
router.post("/create", supabaseAuth, attachProfile, isTeacher, async (req, res) => {
  try {
    const { name, description, subject, grade_level } = req.body;

    if (!name) {
      return res.status(400).json({ error: "El nombre del classroom es requerido" });
    }

    // Generar código único
    const { data: joinCode, error: codeError } = await supabase.rpc("generate_join_code");
    if (codeError) throw codeError;

    const { data: classroom, error } = await supabase
      .from("classrooms")
      .insert({
        name,
        description,
        teacher_id: req.profile.id,
        subject,
        grade_level,
        join_code: joinCode,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, classroom });
  } catch (error) {
    console.error("Error en crear classroom:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener classrooms del docente
router.get("/teacher/classrooms", supabaseAuth, attachProfile, isTeacher, async (req, res) => {
  try {
    const { data: classrooms, error } = await supabase
      .from("classrooms")
      .select(`
        *,
        classroom_enrollments(count),
        classroom_materials(count)
      `)
      .eq("teacher_id", req.profile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ classrooms });
  } catch (error) {
    console.error("Error en obtener classrooms del docente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

/* ======================
   RUTAS DE ESTUDIANTES
   ====================== */

// Unirse a un classroom
router.post("/join", supabaseAuth, attachProfile, isStudent, async (req, res) => {
  try {
    const { join_code } = req.body;
    if (!join_code) return res.status(400).json({ error: "Código de unión requerido" });

    const { data: classroom, error: classroomError } = await supabase
      .from("classrooms")
      .select("*")
      .eq("join_code", join_code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (classroomError || !classroom) {
      return res
        .status(404)
        .json({ error: "Código inválido o classroom inactivo" });
    }

    // ¿ya inscrito?
    const { data: existingEnrollment } = await supabase
      .from("classroom_enrollments")
      .select("id")
      .eq("classroom_id", classroom.id)
      .eq("student_id", req.profile.id)
      .maybeSingle();

    if (existingEnrollment) {
      return res.status(400).json({ error: "Ya estás inscrito en este classroom" });
    }

    const { data: enrollment, error } = await supabase
      .from("classroom_enrollments")
      .insert({
        classroom_id: classroom.id,
        student_id: req.profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, classroom, enrollment });
  } catch (error) {
    console.error("Error en unirse a classroom:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ⚡ obtener classrooms del estudiante
router.get("/student/classrooms", supabaseAuth, attachProfile, isStudent, async (req, res) => {
  try {
    const { data: classrooms, error } = await supabase
      .from("classroom_enrollments")
      .select(`
        id,
        classroom:classrooms (
          id,
          name,
          description,
          subject,
          grade_level,
          teacher:profiles ( id, name, role, education_level )
        )
      `)
      .eq("student_id", req.profile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ classrooms });
  } catch (error) {
    console.error("Error en obtener classrooms del estudiante:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
// Obtener un classroom por ID (docente o estudiante autenticado)
// Obtener un classroom por ID (docente o estudiante autenticado)

// GET /api/classroom/:classroomId/student/materials
router.get("/:classroomId/student/materials", supabaseAuth, attachProfile, isStudent, async (req, res) => {
  try {
    const classroomId = req.params.classroomId;
    const userId = req.profile.id;

    // Verificar que el estudiante pertenece al classroom
    const { data: enrollment } = await supabase
      .from("classroom_enrollments")
      .select("id")
      .eq("student_id", userId)
      .eq("classroom_id", classroomId)
      .maybeSingle();

    if (!enrollment) return res.status(403).json({ error: "No perteneces a este classroom" });

    // Obtener posts del classroom
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filtrar solo los posts que son materiales de IA
    const aiMaterials = posts.filter(p => p.material_type === "ai_generated");

    res.json(aiMaterials);
console.log("Posts encontrados:", posts);
console.log("AI Materials filtrados:", aiMaterials);

  } catch (err) {
    console.error("Error obteniendo materiales IA:", err);
    res.status(500).json({ error: "Error obteniendo materiales IA" });
  }
});

// GET /api/classroom/:classroomId/material/:materialId
router.get("/:classroomId/material/:materialId", supabaseAuth, attachProfile, async (req, res) =>  {
  try {
    const { classroomId, materialId } = req.params;
    const userId = req.profile.id;

    console.log("Buscando material:", materialId, "en classroom:", classroomId, "para usuario:", userId);
    console.log("materialId param:", materialId, "parseInt:", parseInt(materialId));
    

    // Verificar si es miembro
    const member = await isMemberOfClassroom(userId, classroomId);
    console.log("Es miembro del classroom?", member);
    if (!member) return res.status(403).json({ error: "No perteneces a este classroom" });

    // Buscar material en study_outputs
   const { data, error } = await supabase
  .from("study_outputs")
  .select("id, type, content, created_at")
  .eq("id", parseInt(materialId))
  .maybeSingle();

if (error) throw error;
if (!data) return res.status(404).json({ error: "Material no encontrado" });

console.log("Material encontrado:", data); // ✅ Esto te asegura que sí hay datos
res.json(data);

  } catch (err) {
    console.error("Error buscando material IA:", err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.get("/:id", supabaseAuth, attachProfile, async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📍 [GET /api/classroom/:id] ID recibido:", id);
    console.log("👤 Usuario autenticado:", req.user?.id);
    console.log("📑 Perfil adjunto:", req.profile);

    const { data, error } = await supabase
      .from("classrooms")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("❌ Error en Supabase:", error.message);
      return res.status(500).json({ error: "Error consultando Supabase", details: error.message });
    }

    if (!data) {
      console.warn("⚠️ Classroom no encontrado:", id);
      return res.status(404).json({ error: "Classroom no encontrado" });
    }

    console.log("✅ Classroom encontrado:", data);
    res.json(data);

  } catch (err) {
    console.error("💥 Error inesperado en /api/classroom/:id:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

async function deleteClassroom(req, res) {
    try {
        const classroomId = req.params.id;
        const { join_code } = req.body;

        // Verifica que el código coincida (ejemplo supabase o SQL)
        const classroom = await supabase
            .from('classrooms')
            .select('id, join_code')
            .eq('id', classroomId)
            .single();

        if (!classroom.data) {
            return res.status(404).send('Classroom no encontrado');
        }

        if (classroom.data.join_code !== join_code) {
            return res.status(400).send('Código incorrecto');
        }

        // Elimina las tablas hijas si corresponde
        await supabase.from('classroom_enrollments').delete().eq('classroom_id', classroomId);
        await supabase.from('classroom_materials').delete().eq('classroom_id', classroomId);

        // Finalmente elimina el classroom
        await supabase.from('classrooms').delete().eq('id', classroomId);

        res.status(200).json({ message: 'Classroom eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error eliminando classroom');
    }
}
router.post('/delete/:id', supabaseAuth, attachProfile, async (req, res) => {
    const userId = req.profile.id;
    const classroomId = req.params.id;

    // Opcional: solo docente o estudiante inscrito puede eliminar/salir
    const member = await isMemberOfClassroom(userId, classroomId);
    if (!member) return res.status(403).json({ error: "No perteneces a este classroom" });

    // Llamar a la función deleteClassroom
    await deleteClassroom(req, res);
});


// Estudiante deja un classroom
router.post("/:id/leave", supabaseAuth, attachProfile, isStudent, async (req, res) => {
    try {
        const classroomId = req.params.id;
        const userId = req.profile.id;

        // Verificar que el estudiante está inscrito
        const { data: enrollment } = await supabase
            .from('classroom_enrollments')
            .select('id')
            .eq('classroom_id', classroomId)
            .eq('student_id', userId)
            .maybeSingle();

        if (!enrollment) {
            return res.status(404).json({ error: 'No estás inscrito en este classroom' });
        }

        // Eliminar la inscripción
        await supabase
            .from('classroom_enrollments')
            .delete()
            .eq('id', enrollment.id);

        res.json({ success: true, message: 'Has dejado el classroom' });

    } catch (error) {
        console.error("Error dejando classroom:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/classroom/:classroomId/students
router.get("/:classroomId/students", supabaseAuth, attachProfile, isTeacher, async (req, res) => {
    try {
        const classroomId = req.params.classroomId;
        const userId = req.profile.id;

        // Verificar que el docente es el dueño del classroom
        const { data: classroom, error: classroomError } = await supabase
            .from("classrooms")
            .select("id, teacher_id")
            .eq("id", classroomId)
            .single();

        if (classroomError) throw classroomError;

        if (!classroom || classroom.teacher_id !== userId) {
            return res.status(403).json({ error: "No eres el docente de este classroom" });
        }

        // Traer los student_id del classroom
        const { data: enrollments, error: enrollmentsError } = await supabase
            .from("classroom_enrollments")
            .select("student_id")
            .eq("classroom_id", classroomId);

        if (enrollmentsError) throw enrollmentsError;

        const studentIds = enrollments.map(e => e.student_id);

        if (studentIds.length === 0) {
            return res.json([]); // No hay estudiantes inscritos
        }

        // Traer los perfiles de los estudiantes
        const { data: students, error: studentsError } = await supabase
            .from("profiles")
            .select("id, name, role, education_level")
            .in("id", studentIds);

        if (studentsError) throw studentsError;

        res.json(students);
    } catch (err) {
        console.error("Error obteniendo estudiantes:", err);
        res.status(500).json({ error: "Error interno" });
    }
});



module.exports = router;
