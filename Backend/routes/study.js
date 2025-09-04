const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, authMiddleware en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;

const router = express.Router();

// Crear plan de estudio
router.post('/plans', authMiddleware, async (req, res) => {
  try {
    const { title, description, start_date, end_date, notify_by_email, notify_by_whatsapp } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Título, fecha de inicio y fecha de fin son requeridos' });
    }

    // Use request-scoped client so RLS policies can read auth.uid()
    const sb = req.supabase || supabase;

    const { data: plan, error } = await sb
      .from('study_plans')
      .insert([{
        user_id: req.user.id,
        title,
        description,
        start_date,
        end_date,
        notify_by_email: notify_by_email || false,
        notify_by_whatsapp: notify_by_whatsapp || false
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear plan:', error);
      return res.status(500).json({ error: 'Error al crear el plan de estudio' });
    }

    res.status(201).json({
      message: 'Plan de estudio creado exitosamente',
      plan
    });

  } catch (error) {
    console.error('Error al crear plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Listar planes de estudio del usuario
router.get('/plans', authMiddleware, async (req, res) => {
  try {
    const sb = req.supabase || supabase;
    const { data: plans, error } = await sb
      .from('study_plans')
      .select(`
        id,
        title,
        description,
        start_date,
        end_date,
        notify_by_email,
        notify_by_whatsapp,
        created_at,
        plan_tasks (
          id,
          title,
          description,
          due_date,
          due_at,
          completed
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener planes:', error);
      return res.status(500).json({ error: 'Error al obtener los planes de estudio' });
    }

    res.json({ plans });

  } catch (error) {
    console.error('Error al listar planes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener plan específico
router.get('/plans/:planId', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;

    const sb = req.supabase || supabase;
    const { data: plan, error } = await sb
      .from('study_plans')
      .select(`
        id,
        title,
        description,
        start_date,
        end_date,
        notify_by_email,
        notify_by_whatsapp,
        created_at,
        plan_tasks (
          id,
          title,
          description,
          due_date,
          completed,
          related_output_id,
          study_outputs (
            id,
            type,
            content
          )
        )
      `)
      .eq('id', planId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !plan) {
      return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    }

    res.json({ plan });

  } catch (error) {
    console.error('Error al obtener plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar plan de estudio
router.put('/plans/:planId', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;
    const { title, description, start_date, end_date, notify_by_email, notify_by_whatsapp } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (notify_by_email !== undefined) updateData.notify_by_email = notify_by_email;
    if (notify_by_whatsapp !== undefined) updateData.notify_by_whatsapp = notify_by_whatsapp;

    const sb = req.supabase || supabase;
    const { data: plan, error } = await sb
      .from('study_plans')
      .update(updateData)
      .eq('id', planId)
      .eq('user_id', req.user.id)
      .select('*')
      .single();

    if (error || !plan) {
      return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    }

    res.json({
      message: 'Plan de estudio actualizado exitosamente',
      plan
    });

  } catch (error) {
    console.error('Error al actualizar plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar plan de estudio
router.delete('/plans/:planId', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;

    const sb = req.supabase || supabase;
    const { error } = await sb
      .from('study_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error al eliminar plan:', error);
      return res.status(500).json({ error: 'Error al eliminar el plan de estudio' });
    }

    res.json({ message: 'Plan de estudio eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar plan:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear tarea del plan
router.post('/plans/:planId/tasks', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;
    const { title, description, due_date, related_output_id } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Título y fecha de vencimiento son requeridos' });
    }

    // Verificar que el plan pertenece al usuario
    const sb = req.supabase || supabase;
    const { data: plan } = await sb
      .from('study_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', req.user.id)
      .single();

    if (!plan) {
      return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    }

    const { data: task, error } = await sb
      .from('plan_tasks')
      .insert([{
        plan_id: planId,
        title,
        description,
        due_date,
        related_output_id
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear tarea:', error);
      return res.status(500).json({ error: 'Error al crear la tarea' });
    }

    res.status(201).json({
      message: 'Tarea creada exitosamente',
      task
    });

  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar tarea
router.put('/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, due_date, completed, related_output_id } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date) updateData.due_date = due_date;
    if (completed !== undefined) updateData.completed = completed;
    if (related_output_id !== undefined) updateData.related_output_id = related_output_id;

    const sb = req.supabase || supabase;
    const { data: task, error } = await sb
      .from('plan_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        study_plans!inner (
          user_id
        )
      `)
      .single();

    if (error || !task || task.study_plans.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    res.json({
      message: 'Tarea actualizada exitosamente',
      task
    });

  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar tarea
router.delete('/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verificar que la tarea pertenece al usuario
    const sb = req.supabase || supabase;
    const { data: task } = await sb
      .from('plan_tasks')
      .select(`
        id,
        study_plans!inner (
          user_id
        )
      `)
      .eq('id', taskId)
      .single();

    if (!task || task.study_plans.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const { error } = await sb
      .from('plan_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error al eliminar tarea:', error);
      return res.status(500).json({ error: 'Error al eliminar la tarea' });
    }

    res.json({ message: 'Tarea eliminada exitosamente' });

  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar progreso
router.post('/progress', authMiddleware, async (req, res) => {
  try {
    const { output_id, interaction_type, score } = req.body;

    if (!output_id || !interaction_type) {
      return res.status(400).json({ error: 'ID del output y tipo de interacción son requeridos' });
    }

    // Verificar que el output pertenece al usuario
    const { data: output } = await supabase
      .from('study_outputs')
      .select(`
        id,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('id', output_id)
      .single();

    if (!output || output.pdf_uploads.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    const { data: progress, error } = await supabase
      .from('progress_tracking')
      .insert([{
        user_id: req.user.id,
        output_id,
        interaction_type,
        score: score || null
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error al registrar progreso:', error);
      return res.status(500).json({ error: 'Error al registrar el progreso' });
    }

    res.status(201).json({
      message: 'Progreso registrado exitosamente',
      progress
    });

  } catch (error) {
    console.error('Error al registrar progreso:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de progreso
router.get('/progress/stats', authMiddleware, async (req, res) => {
  try {
    // Estadísticas generales
    const { data: totalInteractions, error: interactionsError } = await supabase
      .from('progress_tracking')
      .select('interaction_type', { count: 'exact' })
      .eq('user_id', req.user.id);

    // Contenido más interactuado
    const { data: topContent, error: contentError } = await supabase
      .from('progress_tracking')
      .select(`
        output_id,
        study_outputs (
          type,
          pdf_uploads (
            title
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('interacted_at', { ascending: false })
      .limit(10);

    // Tareas completadas vs pendientes (asegurar alcance por usuario via join)
    const { data: tasks, error: tasksError } = await supabase
      .from('plan_tasks')
      .select(`
        completed,
        study_plans!inner (
          user_id
        )
      `)
      .eq('study_plans.user_id', req.user.id);

    if (interactionsError || contentError || tasksError) {
      console.error('Error al obtener estadísticas:', { interactionsError, contentError, tasksError });
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }

    const stats = {
      totalInteractions: totalInteractions?.length || 0,
      topContent: topContent || [],
      completedTasks: (tasks || []).filter(t => t.completed).length || 0,
      pendingTasks: (tasks || []).filter(t => !t.completed).length || 0
    };

    res.json({ stats });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historial de progreso
router.get('/progress/history', authMiddleware, async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('progress_tracking')
      .select(`
        id,
        interaction_type,
        score,
        interacted_at,
        study_outputs (
          type,
          pdf_uploads (
            title
          )
        )
      `)
      .eq('user_id', req.user.id)
      .order('interacted_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error al obtener historial:', error);
      return res.status(500).json({ error: 'Error al obtener el historial' });
    }

    res.json({ history });

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los outputs de estudio del usuario para el historial
router.get('/outputs', authMiddleware, async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;

    // Use request-scoped client so RLS policies can read auth.uid()
    const sb = req.supabase || supabase;

    let query = sb
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
      .eq('pdf_uploads.user_id', req.user.id)
      .order('created_at', { ascending: false });

    // Filtrar por tipo si se especifica
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // Aplicar paginación
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: outputs, error } = await query;

    if (error) {
      console.error('Error al obtener outputs:', error);
      return res.status(500).json({ error: 'Error al obtener el historial' });
    }

    // Transformar los datos para el frontend
    let transformedOutputs = outputs.map(output => ({
      id: output.id,
      type: output.type,
      content: output.content,
      created_at: output.created_at,
      pdf_id: output.pdf_uploads.id,
      pdf_title: output.pdf_uploads.title || output.pdf_uploads.file_name,
      pdf_name: output.pdf_uploads.file_name
    }));

    // Si no hay datos y estamos en desarrollo, devolver datos de prueba
    if (transformedOutputs.length === 0 && process.env.NODE_ENV === 'development') {
      console.log('🧪 Devolviendo datos de prueba para desarrollo');
      transformedOutputs = [
        {
          id: 1,
          type: 'resumen',
          created_at: new Date().toISOString(),
          pdf_id: 1,
          pdf_title: 'Documento de Prueba 1',
          pdf_name: 'test-documento-1.pdf',
          content: {
            resumen_general: 'Este es un resumen de prueba generado para mostrar el funcionamiento del historial.',
            conceptos_clave: ['Concepto 1', 'Concepto 2', 'Concepto 3'],
            aplicaciones_practicas: ['Aplicación práctica 1', 'Aplicación práctica 2'],
            conclusiones: 'Conclusiones del documento de prueba.'
          }
        },
        {
          id: 2,
          type: 'multiple_choice',
          created_at: new Date(Date.now() - 60000).toISOString(),
          pdf_id: 1,
          pdf_title: 'Documento de Prueba 1',
          pdf_name: 'test-documento-1.pdf',
          content: {
            preguntas: [
              {
                enunciado: '¿Cuál es el propósito de este sistema de prueba?',
                opciones: ['Testing', 'Desarrollo', 'Demo', 'Todas las anteriores'],
                respuesta: 3,
                explicacion: 'El sistema tiene múltiples propósitos incluyendo testing, desarrollo y demo.'
              },
              {
                enunciado: '¿Qué tipo de datos maneja el historial?',
                opciones: ['Solo PDFs', 'Solo contenido IA', 'Ambos', 'Ninguno'],
                respuesta: 2,
                explicacion: 'El historial maneja tanto PDFs como contenido generado por IA.'
              }
            ]
          }
        },
        {
          id: 3,
          type: 'verdadero_falso',
          created_at: new Date(Date.now() - 120000).toISOString(),
          pdf_id: 2,
          pdf_title: 'Manual de Usuario',
          pdf_name: 'manual-usuario.pdf',
          content: {
            preguntas: [
              {
                enunciado: 'El historial muestra todos los contenidos generados.',
                respuesta: 'verdadero',
                explicacion: 'Efectivamente, el historial es un registro completo de todo el contenido generado.'
              },
              {
                enunciado: 'Solo se puede generar un tipo de contenido por PDF.',
                respuesta: 'falso',
                explicacion: 'Se pueden generar múltiples tipos de contenido para cada PDF.'
              }
            ]
          }
        },
        {
          id: 4,
          type: 'mapa_mental',
          created_at: new Date(Date.now() - 180000).toISOString(),
          pdf_id: 2,
          pdf_title: 'Manual de Usuario',
          pdf_name: 'manual-usuario.pdf',
          content: {
            nodo_central: 'Sistema P.I.E.P',
            ramas: [
              {
                titulo: 'Características Principales',
                items: ['Generación de contenido IA', 'Análisis de PDFs', 'Historial completo']
              },
              {
                titulo: 'Tipos de Estudio',
                items: ['Resúmenes', 'Multiple Choice', 'Verdadero/Falso', 'Flashcards']
              },
              {
                titulo: 'Ventajas',
                items: ['Aprendizaje personalizado', 'Ahorro de tiempo', 'Mejor comprensión']
              }
            ]
          }
        }
      ];
    }

    res.json(transformedOutputs);

  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener un output específico por ID
router.get('/outputs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Use request-scoped client so RLS policies can read auth.uid()
    const sb = req.supabase || supabase;

    const { data: output, error } = await sb
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
      .eq('id', id)
      .eq('pdf_uploads.user_id', req.user.id)
      .single();

    if (error || !output) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // Transformar los datos para el frontend
    const transformedOutput = {
      id: output.id,
      type: output.type,
      content: output.content,
      created_at: output.created_at,
      pdf_id: output.pdf_uploads.id,
      pdf_title: output.pdf_uploads.title || output.pdf_uploads.file_name,
      pdf_name: output.pdf_uploads.file_name
    };

    res.json(transformedOutput);

  } catch (error) {
    console.error('Error al obtener output:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar un output específico
router.delete('/outputs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Use request-scoped client so RLS policies can read auth.uid()
    const sb = req.supabase || supabase;

    // Verificar que el output pertenece al usuario
    const { data: output } = await sb
      .from('study_outputs')
      .select(`
        id,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('id', id)
      .single();

    if (!output || output.pdf_uploads.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    // Eliminar el output
    const { error } = await sb
      .from('study_outputs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar output:', error);
      return res.status(500).json({ error: 'Error al eliminar el contenido' });
    }

    res.json({ message: 'Contenido eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar output:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 