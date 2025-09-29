const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, supabaseAuth en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;
const router = express.Router();

/**
 * Historial Optimizado - Backend Routes v2.0
 * Rutas consolidadas y optimizadas para el módulo de historial
 */

// Middleware de validación para paginación
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 12, offset = 0 } = req.query;
  
  req.pagination = {
    page: Math.max(1, parseInt(page)),
    limit: Math.min(100, Math.max(1, parseInt(limit))), // Máximo 100 elementos
    offset: Math.max(0, parseInt(offset))
  };
  
  next();
};

// Middleware de validación para filtros
const validateFilters = (req, res, next) => {
  const { type, search, sort = 'newest', favorites } = req.query;
  
  const validTypes = ['resumen', 'multiple_choice', 'verdadero_falso', 'mapa_mental', 'flashcards'];
  const validSorts = ['newest', 'oldest', 'type', 'pdf'];
  
  req.filters = {
    type: validTypes.includes(type) ? type : null,
    search: search ? search.trim().substring(0, 100) : null, // Limitar búsqueda
    sort: validSorts.includes(sort) ? sort : 'newest',
    favorites: favorites === 'true'
  };
  
  next();
};

/**
 * GET /api/historial/content
 * Obtener contenido del historial con filtros, búsqueda y paginación optimizada
 */
router.get('/content', authMiddleware, validatePagination, validateFilters, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit, offset } = req.pagination;
    const { type, search, sort, favorites } = req.filters;

    console.log(`📚 Cargando historial para usuario ${userId}`, {
      page, limit, type, search: !!search, sort, favorites
    });

    // Construir query base optimizada
    let query = supabase
      .from('study_outputs')
      .select(`
        id,
        type,
        content,
        created_at,
        updated_at,
        pdf_uploads!inner (
          id,
          user_id,
          file_name,
          title,
          created_at
        )
      `)
      .eq('pdf_uploads.user_id', userId);

    // Aplicar filtro de tipo
    if (type) {
      query = query.eq('type', type);
    }

    // Aplicar búsqueda en título de PDF
    if (search) {
      query = query.or(`pdf_uploads.title.ilike.%${search}%,pdf_uploads.file_name.ilike.%${search}%`);
    }

    // Aplicar ordenamiento
    switch (sort) {
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'type':
        query = query.order('type', { ascending: true }).order('created_at', { ascending: false });
        break;
      case 'pdf':
        query = query.order('pdf_uploads(title)', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Aplicar paginación
    const startRange = (page - 1) * limit;
    const endRange = startRange + limit - 1;
    query = query.range(startRange, endRange);

    const { data: outputs, error, count } = await query;

    if (error) {
      console.error('❌ Error obteniendo historial:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error al obtener el historial',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    // Transformar datos para el frontend
    const transformedOutputs = (outputs || []).map(output => ({
      id: output.id,
      type: output.type,
      content: output.content,
      created_at: output.created_at,
      updated_at: output.updated_at,
      pdf_id: output.pdf_uploads.id,
      pdf_title: output.pdf_uploads.title || output.pdf_uploads.file_name,
      pdf_name: output.pdf_uploads.file_name,
      pdf_created_at: output.pdf_uploads.created_at
    }));

    // Si se solicitan favoritos, filtrar por localStorage del cliente
    // (Los favoritos se manejan en el frontend por simplicidad)

    // Obtener estadísticas adicionales si es la primera página
    let stats = null;
    if (page === 1) {
      stats = await getHistorialStats(userId);
    }

    // Respuesta optimizada
    const response = {
      success: true,
      data: transformedOutputs,
      pagination: {
        page,
        limit,
        total: count || transformedOutputs.length,
        totalPages: Math.ceil((count || transformedOutputs.length) / limit),
        hasNext: transformedOutputs.length === limit,
        hasPrev: page > 1
      },
      filters: req.filters,
      stats: stats,
      timestamp: new Date().toISOString()
    };

    // Agregar datos de prueba en desarrollo si no hay contenido
    if (transformedOutputs.length === 0 && process.env.NODE_ENV === 'development') {
      response.data = generateDemoData();
      response.isDemoData = true;
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Error interno en historial:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/historial/stats
 * Obtener estadísticas del historial del usuario
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getHistorialStats(userId);
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener estadísticas' 
    });
  }
});

/**
 * GET /api/historial/content/:id
 * Obtener contenido específico por ID
 */
router.get('/content/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: output, error } = await supabase
      .from('study_outputs')
      .select(`
        id,
        type,
        content,
        created_at,
        updated_at,
        pdf_uploads!inner (
          id,
          user_id,
          file_name,
          title
        )
      `)
      .eq('id', id)
      .eq('pdf_uploads.user_id', userId)
      .single();

    if (error || !output) {
      return res.status(404).json({ 
        success: false,
        error: 'Contenido no encontrado' 
      });
    }

    // Registrar interacción
    await recordInteraction(userId, output.id, 'view');

    const transformedOutput = {
      id: output.id,
      type: output.type,
      content: output.content,
      created_at: output.created_at,
      updated_at: output.updated_at,
      pdf_id: output.pdf_uploads.id,
      pdf_title: output.pdf_uploads.title || output.pdf_uploads.file_name,
      pdf_name: output.pdf_uploads.file_name
    };

    res.json({
      success: true,
      data: transformedOutput,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error obteniendo contenido:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * DELETE /api/historial/content/:id
 * Eliminar contenido específico
 */
router.delete('/content/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar que el contenido pertenece al usuario
    const { data: output, error: checkError } = await supabase
      .from('study_outputs')
      .select(`
        id,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('id', id)
      .eq('pdf_uploads.user_id', userId)
      .single();

    if (checkError || !output) {
      return res.status(404).json({ 
        success: false,
        error: 'Contenido no encontrado' 
      });
    }

    // Eliminar el contenido
    const { error: deleteError } = await supabase
      .from('study_outputs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Error eliminando contenido:', deleteError);
      return res.status(500).json({ 
        success: false,
        error: 'Error al eliminar contenido' 
      });
    }

    res.json({
      success: true,
      message: 'Contenido eliminado correctamente',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error eliminando contenido:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * POST /api/historial/interaction
 * Registrar interacción del usuario con contenido
 */
router.post('/interaction', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { outputId, interactionType, score, metadata } = req.body;

    // Validar datos
    if (!outputId || !interactionType) {
      return res.status(400).json({ 
        success: false,
        error: 'outputId e interactionType son requeridos' 
      });
    }

    await recordInteraction(userId, outputId, interactionType, score, metadata);

    res.json({
      success: true,
      message: 'Interacción registrada',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error registrando interacción:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * GET /api/historial/export
 * Exportar historial del usuario
 */
router.get('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', type } = req.query;

    // Obtener todos los datos del usuario
    let query = supabase
      .from('study_outputs')
      .select(`
        id,
        type,
        content,
        created_at,
        pdf_uploads!inner (
          id,
          user_id,
          file_name,
          title
        )
      `)
      .eq('pdf_uploads.user_id', userId)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: outputs, error } = await query;

    if (error) {
      console.error('❌ Error exportando historial:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Error al exportar historial' 
      });
    }

    const exportData = {
      exportDate: new Date().toISOString(),
      totalItems: outputs.length,
      data: outputs.map(output => ({
        id: output.id,
        type: output.type,
        content: output.content,
        created_at: output.created_at,
        pdf_title: output.pdf_uploads.title || output.pdf_uploads.file_name,
        pdf_name: output.pdf_uploads.file_name
      }))
    };

    // Configurar headers para descarga
    const filename = `historial_${userId}_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');

    res.json(exportData);

  } catch (error) {
    console.error('❌ Error exportando historial:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
});

/**
 * Funciones auxiliares
 */

// Obtener estadísticas del historial
async function getHistorialStats(userId) {
  try {
    // Obtener conteos por tipo
    const { data: typeStats, error: typeError } = await supabase
      .from('study_outputs')
      .select(`
        type,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('pdf_uploads.user_id', userId);

    if (typeError) {
      console.error('Error obteniendo estadísticas por tipo:', typeError);
      return null;
    }

    // Procesar estadísticas
    const stats = {
      total: typeStats.length,
      byType: {},
      totalPdfs: 0,
      recentActivity: 0
    };

    // Contar por tipo
    typeStats.forEach(item => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
    });

    // Obtener PDFs únicos
    const { data: pdfStats, error: pdfError } = await supabase
      .from('pdf_uploads')
      .select('id')
      .eq('user_id', userId);

    if (!pdfError) {
      stats.totalPdfs = pdfStats.length;
    }

    // Obtener actividad reciente (últimos 7 días)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: recentStats, error: recentError } = await supabase
      .from('study_outputs')
      .select(`
        id,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('pdf_uploads.user_id', userId)
      .gte('created_at', weekAgo.toISOString());

    if (!recentError) {
      stats.recentActivity = recentStats.length;
    }

    return stats;

  } catch (error) {
    console.error('Error calculando estadísticas:', error);
    return null;
  }
}

// Registrar interacción del usuario
async function recordInteraction(userId, outputId, interactionType, score = null, metadata = null) {
  try {
    const { error } = await supabase
      .from('progress_tracking')
      .insert({
        user_id: userId,
        output_id: outputId,
        interaction_type: interactionType,
        score: score,
        metadata: metadata,
        interacted_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error registrando interacción:', error);
    }
  } catch (error) {
    console.error('Error en recordInteraction:', error);
  }
}

// Generar datos de demostración
function generateDemoData() {
  return [
    {
      id: 'demo-1',
      type: 'resumen',
      created_at: new Date().toISOString(),
      pdf_id: 'demo-pdf-1',
      pdf_title: 'Introducción a la Inteligencia Artificial',
      pdf_name: 'ia-introduccion.pdf',
      content: {
        resumen_general: 'La inteligencia artificial es una rama de la informática que busca crear sistemas capaces de realizar tareas que normalmente requieren inteligencia humana.',
        conceptos_clave: ['Machine Learning', 'Deep Learning', 'Redes Neuronales', 'Algoritmos'],
        aplicaciones_practicas: ['Reconocimiento de voz', 'Visión por computadora', 'Procesamiento de lenguaje natural'],
        conclusiones: 'La IA está transformando múltiples industrias y continuará evolucionando en los próximos años.'
      }
    },
    {
      id: 'demo-2',
      type: 'multiple_choice',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      pdf_id: 'demo-pdf-1',
      pdf_title: 'Introducción a la Inteligencia Artificial',
      pdf_name: 'ia-introduccion.pdf',
      content: {
        preguntas: [
          {
            enunciado: '¿Qué es el Machine Learning?',
            opciones: [
              'Un tipo de hardware especializado',
              'Un método para que las máquinas aprendan sin programación explícita',
              'Un lenguaje de programación',
              'Un sistema operativo'
            ],
            respuesta: 1,
            explicacion: 'El Machine Learning permite a las máquinas aprender y mejorar automáticamente a partir de la experiencia.'
          }
        ]
      }
    },
    {
      id: 'demo-3',
      type: 'mapa_mental',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      pdf_id: 'demo-pdf-2',
      pdf_title: 'Fundamentos de Programación',
      pdf_name: 'programacion-fundamentos.pdf',
      content: {
        nodo_central: 'Programación',
        ramas: [
          {
            titulo: 'Conceptos Básicos',
            items: ['Variables', 'Funciones', 'Estructuras de Control', 'Algoritmos']
          },
          {
            titulo: 'Paradigmas',
            items: ['Programación Orientada a Objetos', 'Programación Funcional', 'Programación Imperativa']
          },
          {
            titulo: 'Herramientas',
            items: ['IDEs', 'Debuggers', 'Control de Versiones', 'Testing']
          }
        ]
      }
    }
  ];
}

module.exports = router;