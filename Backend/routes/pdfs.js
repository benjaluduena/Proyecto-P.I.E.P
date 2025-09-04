const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, authMiddleware en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;

// Función para validar y normalizar rutas de archivos
function sanitizeFilePath(filePath, baseDir) {
  try {
    // Normalizar el path y resolver rutas relativas
    const normalizedPath = path.normalize(filePath);
    const resolvedPath = path.resolve(baseDir, normalizedPath);
    const resolvedBaseDir = path.resolve(baseDir);
    
    // Verificar que el path resuelto esté dentro del directorio base
    if (!resolvedPath.startsWith(resolvedBaseDir)) {
      throw new Error('Path traversal detectado');
    }
    
    return resolvedPath;
  } catch (error) {
    throw new Error('Ruta de archivo inválida');
  }
}

const router = express.Router();

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

// Subir PDF
router.post('/upload', authMiddleware, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    
    const { title } = req.body;
    const fileName = req.file.originalname;
    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    // Guardar en la base de datos. Si falla, limpiar el archivo y responder error.
    const s = req.supabase || supabase;
    try {
      const { data, error } = await s
        .from('pdf_uploads')
        .insert([{
          user_id: req.user.id,
          file_name: fileName,
          file_url: fileUrl,
          title: title || fileName
        }])
        .select('*')
        .single();

      if (error || !data) {
        console.error('Error de Supabase al insertar pdf_uploads:', error);
        // Intentar borrar el archivo físico subido
        try { await fs.unlink(filePath); } catch (_) {}
        return res.status(500).json({ 
          error: 'No se pudo registrar el PDF en la base de datos',
          details: process.env.NODE_ENV === 'development' && error ? (error.message || error) : undefined
        });
      }

      return res.status(201).json({
        message: 'PDF subido exitosamente',
        pdf: {
          id: data.id,
          title: data.title,
          fileName: data.file_name,
          fileUrl: data.file_url,
          uploadedAt: data.uploaded_at
        }
      });
    } catch (dbError) {
      console.error('Error al conectar con la BD:', dbError);
      try { await fs.unlink(filePath); } catch (_) {}
      return res.status(500).json({ error: 'Error de base de datos al registrar el PDF' });
    }
    
  } catch (error) {
    console.error('Error completo:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Listar PDFs del usuario
router.get('/my-pdfs', authMiddleware, async (req, res) => {
  try {
    const s = req.supabase || supabase;
    const { data: pdfs, error } = await s
      .from('pdf_uploads')
      .select(`
        id,
        file_name,
        file_url,
        title,
        uploaded_at,
        study_outputs (
          id,
          type,
          created_at
        )
      `)
      .eq('user_id', req.user.id)
      .order('uploaded_at', { ascending: false });
    if (error) {
      return res.status(500).json({ error: 'Error al obtener los archivos' });
    }
    res.json({ pdfs });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener PDF específico
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const s = req.supabase || supabase;
    const { data: pdf, error } = await s
      .from('pdf_uploads')
      .select(`
        id,
        file_name,
        file_url,
        title,
        uploaded_at,
        study_outputs (
          id,
          type,
          content,
          created_at
        )
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    res.json({ pdf });

  } catch (error) {
    console.error('Error al obtener PDF:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar título del PDF
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const s = req.supabase || supabase;
    const { data: pdf, error } = await s
      .from('pdf_uploads')
      .update({ title })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('id, title, file_name, uploaded_at')
      .single();

    if (error || !pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    res.json({
      message: 'Título actualizado exitosamente',
      pdf
    });

  } catch (error) {
    console.error('Error al actualizar PDF:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar PDF
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Primero obtener información del archivo
    const s = req.supabase || supabase;
    const { data: pdf, error: fetchError } = await s
      .from('pdf_uploads')
      .select('file_url')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    // Eliminar de la base de datos (esto también eliminará los study_outputs relacionados por CASCADE)
    const { error: deleteError } = await s
      .from('pdf_uploads')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      console.error('Error al eliminar PDF de BD:', deleteError);
      return res.status(500).json({ error: 'Error al eliminar el archivo' });
    }

    // Eliminar archivo físico con validación de path
    try {
      const baseDir = path.join(__dirname, '..');
      const safePath = sanitizeFilePath(pdf.file_url, baseDir);
      await fs.unlink(safePath);
    } catch (fileError) {
      console.warn('No se pudo eliminar el archivo físico:', fileError);
    }

    res.json({ message: 'PDF eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar PDF:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Servir archivos PDF
router.get('/file/:filename', authMiddleware, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validar filename para prevenir path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Nombre de archivo inválido' });
    }

    // Verificar que el archivo existe y pertenece al usuario
    const s = req.supabase || supabase;
    const { data: pdf } = await s
      .from('pdf_uploads')
      .select('id')
      .eq('file_url', `/uploads/${filename}`)
      .eq('user_id', req.user.id)
      .single();

    if (!pdf) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    // Construir ruta segura
    const uploadsDir = path.join(__dirname, '../uploads');
    const safePath = sanitizeFilePath(filename, uploadsDir);
    
    res.sendFile(safePath);

  } catch (error) {
    console.error('Error al servir archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de prueba para crear datos de test (solo en desarrollo)
router.post('/create-test', authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Endpoint solo disponible en desarrollo' });
  }

  try {
    const { title = 'PDF de Prueba', content = 'Contenido de prueba' } = req.body;
    
    // Crear PDF de prueba en la BD
    const { data: pdf, error: pdfError } = await supabase
      .from('pdf_uploads')
      .insert([{
        user_id: req.user.id,
        file_name: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
        title: title,
        file_url: '/uploads/test-file.pdf'
      }])
      .select('*')
      .single();

    if (pdfError) {
      console.error('Error creando PDF de prueba:', pdfError);
      return res.status(500).json({ error: 'Error creando PDF de prueba' });
    }

    // Crear contenido de estudio de prueba
    const studyTypes = ['resumen', 'multiple_choice', 'verdadero_falso'];
    const studyOutputs = [];

    for (const type of studyTypes) {
      let testContent;
      
      if (type === 'resumen') {
        testContent = {
          resumen_general: 'Este es un resumen de prueba generado automáticamente.',
          conceptos_clave: ['Concepto 1', 'Concepto 2', 'Concepto 3'],
          aplicaciones_practicas: ['Aplicación 1', 'Aplicación 2'],
          conclusiones: 'Conclusiones de prueba.'
        };
      } else if (type === 'multiple_choice') {
        testContent = {
          preguntas: [
            {
              enunciado: '¿Cuál es la respuesta correcta?',
              opciones: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
              respuesta: 1,
              explicacion: 'La opción B es correcta porque...'
            },
            {
              enunciado: '¿Qué significa "prueba"?',
              opciones: ['Test', 'Examen', 'Evaluación', 'Todas las anteriores'],
              respuesta: 3,
              explicacion: 'Todas las opciones son sinónimos de prueba.'
            }
          ]
        };
      } else if (type === 'verdadero_falso') {
        testContent = {
          preguntas: [
            {
              enunciado: 'Este es un sistema de prueba.',
              respuesta: 'verdadero',
              explicacion: 'Efectivamente, este es un sistema para testing.'
            },
            {
              enunciado: 'Los datos de prueba no son útiles.',
              respuesta: 'falso',
              explicacion: 'Los datos de prueba son muy útiles para desarrollo.'
            }
          ]
        };
      }

      const { data: output, error: outputError } = await supabase
        .from('study_outputs')
        .insert([{
          pdf_id: pdf.id,
          type: type,
          content: testContent
        }])
        .select('*')
        .single();

      if (!outputError) {
        studyOutputs.push(output);
      }
    }

    res.status(201).json({
      message: 'Datos de prueba creados exitosamente',
      pdf: pdf,
      studyOutputs: studyOutputs
    });

  } catch (error) {
    console.error('Error creando datos de prueba:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 