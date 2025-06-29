const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const supabase = require('../config/supabase');
const { simpleAuth } = require('../middleware/auth');

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
router.post('/upload', simpleAuth, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }
    const { title } = req.body;
    const fileName = req.file.originalname;
    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;
    // Guardar información en la base de datos
    const { data: pdfUpload, error } = await supabase
      .from('pdf_uploads')
      .insert([{
        user_id: req.user.id,
        file_name: fileName,
        file_url: fileUrl,
        title: title || fileName
      }])
      .select('*')
      .single();
    if (error) {
      await fs.unlink(filePath);
      return res.status(500).json({ error: 'Error al guardar el archivo' });
    }
    res.status(201).json({
      message: 'PDF subido exitosamente',
      pdf: {
        id: pdfUpload.id,
        title: pdfUpload.title,
        fileName: pdfUpload.file_name,
        fileUrl: pdfUpload.file_url,
        uploadedAt: pdfUpload.uploaded_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar PDFs del usuario
router.get('/my-pdfs', simpleAuth, async (req, res) => {
  try {
    const { data: pdfs, error } = await supabase
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
router.get('/:id', simpleAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: pdf, error } = await supabase
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
router.put('/:id', simpleAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'El título es requerido' });
    }

    const { data: pdf, error } = await supabase
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
router.delete('/:id', simpleAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Primero obtener información del archivo
    const { data: pdf, error: fetchError } = await supabase
      .from('pdf_uploads')
      .select('file_url')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError || !pdf) {
      return res.status(404).json({ error: 'PDF no encontrado' });
    }

    // Eliminar de la base de datos (esto también eliminará los study_outputs relacionados por CASCADE)
    const { error: deleteError } = await supabase
      .from('pdf_uploads')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (deleteError) {
      console.error('Error al eliminar PDF de BD:', deleteError);
      return res.status(500).json({ error: 'Error al eliminar el archivo' });
    }

    // Eliminar archivo físico
    try {
      const filePath = path.join(__dirname, '..', pdf.file_url);
      await fs.unlink(filePath);
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
router.get('/file/:filename', simpleAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    // Verificar que el archivo existe y pertenece al usuario
    const { data: pdf } = await supabase
      .from('pdf_uploads')
      .select('id')
      .eq('file_url', `/uploads/${filename}`)
      .eq('user_id', req.user.id)
      .single();

    if (!pdf) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    res.sendFile(filePath);

  } catch (error) {
    console.error('Error al servir archivo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 