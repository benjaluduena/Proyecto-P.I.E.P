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


module.exports = router;
