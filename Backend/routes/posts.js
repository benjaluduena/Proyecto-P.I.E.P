const express = require("express");
const router = express.Router();
const supabase = require("../config/supabase");
const { supabaseAuth } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// === Configuración multer (guardar en memoria) ===
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  },
  fileFilter: (req, file, cb) => {
    // Tipos de archivo permitidos
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

/** Helpers */
const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

const attachProfile = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.sub;
    if (!userId) return res.status(401).json({ error: "Usuario no autenticado" });
    const profile = await getUserProfile(userId);
    if (!profile) return res.status(403).json({ error: "Perfil no encontrado" });
    req.profile = profile;
    next();
  } catch (err) {
    console.error("Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error interno obteniendo perfil" });
  }
};

const isTeacher = (req, res, next) => {
  if (req.profile.role?.toLowerCase() !== "docente") {
    return res.status(403).json({ error: "Solo docentes pueden realizar esta acción" });
  }
  next();
};

/** Verifica si el usuario pertenece al classroom */
const isMemberOfClassroom = async (userId, classroomId) => {
  const { data: cls } = await supabase
    .from("classrooms")
    .select("id, teacher_id")
    .eq("id", classroomId)
    .maybeSingle();

  if (cls?.teacher_id === userId) return true;

  const { data: enr } = await supabase
    .from("classroom_enrollments")
    .select("id")
    .eq("classroom_id", classroomId)
    .eq("student_id", userId)
    .maybeSingle();

  return !!enr;
};


/** ============ RUTAS ============ */

/** GET /api/classroom/:id/posts */
router.get("/classroom/:id/posts", supabaseAuth, attachProfile, async (req, res) => {
  try {
    const classroomId = req.params.id;
    const userId = req.profile.id;

    const member = await isMemberOfClassroom(userId, classroomId);
    if (!member) return res.status(403).json({ error: "No perteneces a este classroom" });

    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        file_url,
        material_id,
        material_type,
        created_at,
        author:profiles ( id, name ),
        comments:comments (
          id,
          text,
          created_at,
          author:profiles ( id, name )
        )
      `)
      .eq("classroom_id", classroomId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const posts = (data || []).map(p => ({
      id: p.id,
      content: p.content,
      file_url: p.file_url,
      material_id: p.material_id,
      material_type: p.material_type,
      created_at: p.created_at,
      author_name: p.author?.name || "Docente",
      comments: (p.comments || []).map(c => ({
        id: c.id,
        text: c.text,
        created_at: c.created_at,
        user_name: c.author?.name || "Usuario"
      }))
    }));

    res.json(posts);
  } catch (err) {
    console.error("❌ Error obteniendo posts:", err.message);
    res.status(500).json({ error: "Error obteniendo posts" });
  }
});

/** POST /api/classroom/:id/posts  (solo docente, con archivo opcional) */
router.post(
  "/classroom/:id/posts",
  supabaseAuth,
  attachProfile,
  isTeacher,
  (req, res, next) => {
    // Middleware personalizado para manejar errores de multer
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("Error en multer:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "El archivo es demasiado grande (máximo 10MB)" });
        }
        return res.status(400).json({ error: err.message || "Error procesando archivo" });
      }
      next();
    });
  },
  async (req, res) => {
    console.log("🔍 Datos recibidos:");
    console.log("Body:", req.body);
    console.log("File:", req.file ? { name: req.file.originalname, size: req.file.size, type: req.file.mimetype } : "No file");
    
    try {
      const classroomId = req.params.id;
      const userId = req.profile.id;
      const { content } = req.body;

      console.log(`📝 Creando post - Classroom: ${classroomId}, Usuario: ${userId}`);

      // Validar que hay contenido o archivo
      if (!content?.trim() && !req.file) {
        return res.status(400).json({ error: "El contenido o archivo es requerido" });
      }

      // Verificar que el usuario es docente del classroom
      const { data: cls, error: clsError } = await supabase
        .from("classrooms")
        .select("id, teacher_id")
        .eq("id", classroomId)
        .maybeSingle();

      if (clsError) {
        console.error("Error consultando classroom:", clsError);
        throw clsError;
      }

      if (!cls) {
        return res.status(404).json({ error: "Classroom no encontrado" });
      }

      if (cls.teacher_id !== userId) {
        return res.status(403).json({ error: "Solo el docente del classroom puede publicar" });
      }

      let fileUrl = null;

     // Procesar archivo si existe
if (req.file) {
  try {
    const authHeader = req.headers.authorization || '';
    const userToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!userToken) return res.status(401).json({ error: "Token no encontrado" });

    // Crear cliente Supabase temporal con token del usuario
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUser = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${userToken}` } } }
    );

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const timestamp = Date.now();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(2)}${fileExt}`;
    const filePath = `classroom-${classroomId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabaseUser.storage
      .from("classroom-files")
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error("❌ Error subiendo archivo a Supabase Storage:", uploadError);
      return res.status(500).json({ error: "Error subiendo archivo", details: uploadError.message });
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabaseUser.storage
      .from("classroom-files")
      .getPublicUrl(filePath);

    fileUrl = publicUrlData.publicUrl;
    console.log("🔗 URL pública generada:", fileUrl);

  } catch (fileError) {
    console.error("❌ Error procesando archivo:", fileError);
    return res.status(500).json({ error: "Error procesando archivo" });
  }
}


      // Crear el post en la base de datos
      console.log("💾 Creando registro en BD...");
      
      // Preparar datos del post
      const postData = {
        classroom_id: parseInt(classroomId), 
        user_id: userId, 
        content: content?.trim() || null, 
        file_url: fileUrl
      };

      // Si es un material de IA, agregar información adicional
      if (req.body.material_id && req.body.material_type === 'ai_generated') {
        postData.material_id = req.body.material_id;
        postData.material_type = req.body.material_type;
      }

      const { data: postDataResult, error: insertError } = await supabase
        .from("posts")
        .insert([postData])
        .select()
        .single();

      if (insertError) {
        console.error("❌ Error insertando en BD:", insertError);
        throw insertError;
      }

      console.log("✅ Post creado exitosamente:", postDataResult);
      res.json(postDataResult);

    } catch (err) {
      console.error("❌ Error general creando post:", err);
      res.status(500).json({ 
        error: "Error creando post", 
        details: err.message 
      });
    }
  }
);
// GET /resources/:classId
router.get('/resources/:classId', async (req, res) => {
  const { classId } = req.params;
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// Traer recursos recientes del docente
router.get("/recent/:docenteId", async (req, res) => {
  const { docenteId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT so.id, so.type, so.content, so.created_at
      FROM study_outputs so
      WHERE so.pdf_id IN (
        SELECT id FROM pdf_uploads WHERE user_id = $1
      )
      ORDER BY so.created_at DESC
      LIMIT 10
      `,
      [docenteId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al traer recursos" });
  }
});



/** POST /api/post/:id/comments */
router.post("/post/:id/comments", supabaseAuth, attachProfile, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.profile.id;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "El comentario no puede estar vacío" });
    }

    const { data: post, error: postErr } = await supabase
      .from("posts")
      .select("id, classroom_id")
      .eq("id", postId)
      .maybeSingle();

    if (postErr) throw postErr;
    if (!post) return res.status(404).json({ error: "Post no encontrado" });

    const member = await isMemberOfClassroom(userId, post.classroom_id);
    if (!member) return res.status(403).json({ error: "No perteneces a este classroom" });

    const { data, error } = await supabase
      .from("comments")
      .insert([{ post_id: postId, user_id: userId, text }])
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("❌ Error creando comentario:", err.message);
    res.status(500).json({ error: "Error creando comentario" });
  }
});


module.exports = router;