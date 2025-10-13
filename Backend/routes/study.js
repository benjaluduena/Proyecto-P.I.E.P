const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, authMiddleware en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;

const router = express.Router();

// Endpoint temporal de prueba sin foreign keys
router.post('/plans/test', async (req, res) => {
  try {
    const { title, description, start_date, end_date } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Título, fecha de inicio y fecha de fin son requeridos' });
    }

    // Insertar directamente usando SQL raw para bypasear foreign keys
    const { data: plan, error } = await supabase.rpc('create_test_plan', {
      p_title: title,
      p_description: description || '',
      p_start_date: start_date,
      p_end_date: end_date
    });

    if (error) {
      console.error('Error al crear plan de prueba:', error);
      // Primero, intentar obtener un usuario existente de la tabla auth.users
      const { data: existingUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      let userId = null;
      if (existingUsers && existingUsers.length > 0) {
        userId = existingUsers[0].id;
      } else {
        // Si no hay usuarios, crear uno temporal para pruebas
        const tempUserId = '00000000-0000-0000-0000-000000000001';
        const { error: insertUserError } = await supabase.auth.admin.createUser({
          email: 'test@example.com',
          password: 'testpassword123',
          user_metadata: { name: 'Usuario de Prueba' }
        });
        
        if (!insertUserError) {
          userId = tempUserId;
        }
      }
      
      if (!userId) {
        return res.status(500).json({ error: 'No se pudo obtener o crear un usuario válido para la prueba' });
      }

      // Fallback: crear plan con user_id válido para prueba
       const { data: fallbackPlan, error: fallbackError } = await supabase
         .from('study_plans')
         .insert([{
           user_id: userId,
           title,
           description,
           start_date,
           end_date,
           notify_by_email: false,
           notify_by_whatsapp: false
         }])
         .select('*')
         .single();
        
      if (fallbackError) {
        console.error('Error en fallback:', fallbackError);
        return res.status(500).json({ error: 'Error al crear el plan de estudio' });
      }
      
      return res.status(201).json({ plan: fallbackPlan, message: 'Plan creado sin usuario (modo prueba)' });
    }

    res.status(201).json({ plan, message: 'Plan de prueba creado exitosamente' });
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear plan de estudio
router.post('/plans', authMiddleware, async (req, res) => {
  try {
    const { title, description, start_date, end_date, notify_by_email, notify_by_whatsapp, tasks, status, priority } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Título, fecha de inicio y fecha de fin son requeridos' });
    }

    // En desarrollo, usar el cliente con service role para bypasear RLS
    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Crear el plan
    const { data: plan, error } = await sb
      .from('study_plans')
      .insert([{
        user_id: req.user.id,
        title,
        description,
        start_date,
        end_date,
        notify_by_email: notify_by_email || false,
        notify_by_whatsapp: notify_by_whatsapp || false,
        status: status || 'active',
        priority: priority || 'medium'
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear plan:', error);
      return res.status(500).json({ error: 'Error al crear el plan de estudio' });
    }

    // Crear las tareas si se proporcionaron
    if (tasks && tasks.length > 0) {
      const tasksToInsert = tasks.map(task => ({
        plan_id: plan.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date,
        priority: task.priority || 'medium',
        completed: task.completed || false,
        output_id: task.output_id || null
      }));

      const { error: tasksError } = await sb
        .from('plan_tasks')
        .insert(tasksToInsert);

      if (tasksError) {
        console.error('Error al crear tareas:', tasksError);
        // No fallar completamente, solo advertir
        console.warn('Plan creado pero algunas tareas no se pudieron crear');
      }
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
    console.log('📋 GET /plans - Iniciando petición');
    console.log('👤 Usuario:', req.user ? req.user.id : 'No user');
    
    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);
    
    // En desarrollo, mostrar todos los planes sin filtrar por usuario
    let query;
    if (process.env.NODE_ENV === 'development') {
      query = sb
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
          status,
          priority,
          plan_tasks (
            id,
            title,
            description,
            due_date,
            completed,
            priority,
            output_id
          )
        `)
        .order('created_at', { ascending: false });
    } else {
      const userId = req.user.id;
      query = sb
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
          status,
          priority,
          plan_tasks (
            id,
            title,
            description,
            due_date,
            completed,
            priority,
            output_id
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    }
    
    const { data: plans, error } = await query;

    if (error) {
      console.error('❌ Error al obtener planes:', error);
      return res.status(500).json({ error: 'Error al obtener los planes de estudio' });
    }

    console.log('✅ Planes obtenidos:', plans ? plans.length : 0, 'planes');
    console.log('📊 Datos:', plans);
    
    res.json(plans);

  } catch (error) {
    console.error('💥 Error al listar planes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener plan específico
router.get('/plans/:planId', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;
    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    let selectQuery = sb
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
        status,
        priority,
        plan_tasks (
          id,
          title,
          description,
          due_date,
          completed,
          priority,
          output_id,
          study_outputs (
            id,
            type,
            content
          )
        )
      `)
      .eq('id', planId);

    // En desarrollo no filtramos por usuario para evitar 404s con datos de prueba
    if (process.env.NODE_ENV !== 'development') {
      selectQuery = selectQuery.eq('user_id', req.user.id);
    }

    const { data: plan, error } = await selectQuery.single();

    if (error || !plan) return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    res.json({ plan });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener el plan de estudio' });
  }
});

// Actualizar plan de estudio
router.put('/plans/:planId', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;
    const { title, description, start_date, end_date, notify_by_email, notify_by_whatsapp, status, priority } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (notify_by_email !== undefined) updateData.notify_by_email = notify_by_email;
    if (notify_by_whatsapp !== undefined) updateData.notify_by_whatsapp = notify_by_whatsapp;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    let updateQuery = sb
      .from('study_plans')
      .update(updateData)
      .eq('id', planId);

    if (process.env.NODE_ENV !== 'development') {
      updateQuery = updateQuery.eq('user_id', req.user.id);
    }

    const { data: plan, error } = await updateQuery
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

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);
    let deleteQuery = sb
      .from('study_plans')
      .delete()
      .eq('id', planId);

    if (process.env.NODE_ENV !== 'development') {
      deleteQuery = deleteQuery.eq('user_id', req.user.id);
    }

    const { error } = await deleteQuery;

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
    const { title, description, due_date, output_id, priority, completed } = req.body;

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
        output_id: output_id || null,
        priority: priority || 'medium',
        completed: !!completed
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
    const { title, description, due_date, completed, output_id, priority } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date) updateData.due_date = due_date;
    if (completed !== undefined) updateData.completed = completed;
    if (output_id !== undefined) updateData.output_id = output_id;
    if (priority !== undefined) updateData.priority = priority;

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

// ==========================================
// ENDPOINTS PARA CONTENIDO GENERADO EN PLANES
// ==========================================

// POST /api/study/plans/:planId/content - Añadir contenido generado a un plan
router.post('/plans/:planId/content', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;
    const { 
      taskId, 
      contentType, 
      title, 
      description, 
      content, 
      sourcePdfId, 
      isExtra, 
      extraGroupName 
    } = req.body;

    // Validaciones
    if (!contentType || !title || !content) {
      return res.status(400).json({ 
        error: 'Tipo de contenido, título y contenido son requeridos' 
      });
    }

    const validContentTypes = [
      'resumen', 'multiple_choice', 'verdadero_falso', 'flashcards', 
      'mapa_mental', 'problema', 'chat_qa', 'recomendacion_video', 'recomendacion_texto'
    ];

    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: 'Tipo de contenido no válido' 
      });
    }

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Normalizar contenido: asegurar cadena o JSON serializado
    const normalizedContent = (typeof content === 'string') ? content : JSON.stringify(content || {});
    // Evitar títulos extremadamente largos que puedan violar restricciones
    const normalizedTitle = (title || '').toString().slice(0, 180);

    // Verificar que el plan pertenece al usuario
    const { data: plan, error: planError } = await sb
      .from('study_plans')
      .select('id, user_id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    }

    if (plan.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este plan' });
    }

    // Si se especifica taskId, verificar que la tarea pertenece al plan
    if (taskId) {
      const { data: task, error: taskError } = await sb
        .from('plan_tasks')
        .select('id')
        .eq('id', taskId)
        .eq('plan_id', planId)
        .single();

      if (taskError || !task) {
        return res.status(404).json({ error: 'Tarea no encontrada en este plan' });
      }
    }

    // Fallback: almacenar en study_outputs y vincular mediante plan_tasks
    let contentJson;
    try {
      contentJson = typeof normalizedContent === 'object' ? normalizedContent : JSON.parse(normalizedContent);
    } catch (_) {
      contentJson = { text: String(normalizedContent || '') };
    }

    if (!sourcePdfId) {
      return res.status(400).json({ error: 'Falta el PDF de origen (sourcePdfId) para adjuntar contenido' });
    }

    // 1) Crear output
    const { data: newOutput, error: outputError } = await sb
      .from('study_outputs')
      .insert([{ pdf_id: sourcePdfId, type: contentType, content: contentJson }])
      .select('id, type, content, created_at, pdf_id')
      .single();

    if (outputError || !newOutput) {
      console.error('Error al crear output:', outputError);
      return res.status(500).json({ error: 'Error al guardar el contenido' });
    }

    // 2) Vincular a tarea
    let taskRecord = null;
    if (taskId) {
      const { data: updatedTask, error: taskUpdateError } = await sb
        .from('plan_tasks')
        .update({ output_id: newOutput.id })
        .eq('id', taskId)
        .select('id, title, created_at')
        .single();

      if (taskUpdateError) {
        console.error('Error actualizando tarea con output:', taskUpdateError);
        return res.status(500).json({ error: 'Error al vincular contenido con la tarea' });
      }
      taskRecord = updatedTask;
    } else {
      const { data: newTask, error: taskInsertError } = await sb
        .from('plan_tasks')
        .insert([{ 
          plan_id: planId,
          title: normalizedTitle,
          description: description || null,
          due_date: null,
          completed: false,
          priority: 'medium',
          output_id: newOutput.id
        }])
        .select('id, title, created_at')
        .single();

      if (taskInsertError || !newTask) {
        console.error('Error creando tarea para contenido:', taskInsertError);
        return res.status(500).json({ error: 'Error al guardar el contenido' });
      }
      taskRecord = newTask;
    }

    // 3) Respuesta con formato compatible
    res.status(201).json({
      message: 'Contenido añadido exitosamente al plan',
      content: {
        id: taskRecord.id,
        content_type: newOutput.type,
        title: taskRecord.title,
        description: description || null,
        created_at: taskRecord.created_at || newOutput.created_at,
        plan_tasks: { id: taskRecord.id, title: taskRecord.title },
        pdf_uploads: { id: sourcePdfId }
      }
    });

  } catch (error) {
    console.error('Error POST /plans/:planId/content:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/study/plans/:planId/content - Obtener contenido generado de un plan
router.get('/plans/:planId/content', authMiddleware, async (req, res) => {
  try {
    const { planId } = req.params;
    const { taskId, contentType, isExtra, extraGroupName } = req.query;

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Verificar que el plan pertenece al usuario
    const { data: plan, error: planError } = await sb
      .from('study_plans')
      .select('id, user_id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    }

    if (plan.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para ver este plan' });
    }

    // Fallback: construir contenido desde plan_tasks + study_outputs
    const { data: tasksWithOutputs, error: contentsError } = await sb
      .from('plan_tasks')
      .select(`
        id,
        title,
        created_at,
        study_outputs:output_id (
          id,
          type,
          content,
          created_at,
          pdf_uploads:pdf_id (
            id,
            title,
            file_name
          )
        )
      `)
      .eq('plan_id', planId)
      .order('created_at', { ascending: false });

    if (contentsError) {
      console.error('Error al obtener contenido:', contentsError);
      return res.status(500).json({ error: 'Error al obtener el contenido del plan' });
    }

    let contents = (tasksWithOutputs || [])
      .filter(item => item.study_outputs)
      .map(item => ({
        // ID de la tarea del plan asociada
        id: item.id,
        // ID del output para referencias futuras
        output_id: item.study_outputs?.id || null,
        // Tipo y datos del contenido
        content_type: item.study_outputs?.type,
        content: item.study_outputs?.content || null,
        // Metadatos y relaciones
        title: item.title || (item.study_outputs?.pdf_uploads?.title) || 'Sin título',
        created_at: item.created_at || item.study_outputs?.created_at,
        plan_tasks: { id: item.id, title: item.title },
        pdf_uploads: item.study_outputs?.pdf_uploads || null
      }));

    if (contentType) {
      contents = contents.filter(c => c.content_type === contentType);
    }

    res.json(contents);

  } catch (error) {
    console.error('Error GET /plans/:planId/content:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/study/plans/:planId/content/:contentId - Actualizar contenido generado
router.put('/plans/:planId/content/:contentId', authMiddleware, async (req, res) => {
  try {
    const { planId, contentId } = req.params;
    const { title, description, content, isExtra, extraGroupName } = req.body;

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Verificar que el contenido existe y pertenece al usuario
    const { data: existingContent, error: contentError } = await sb
      .from('plan_generated_content')
      .select(`
        *,
        study_plans!inner(user_id)
      `)
      .eq('id', contentId)
      .eq('plan_id', planId)
      .single();

    if (contentError || !existingContent) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    if (existingContent.study_plans.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para modificar este contenido' });
    }

    // Preparar datos de actualización
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (isExtra !== undefined) updateData.is_extra = isExtra;
    if (extraGroupName !== undefined) updateData.extra_group_name = extraGroupName;

    // Actualizar contenido
    const { data: updatedContent, error: updateError } = await sb
      .from('plan_generated_content')
      .update(updateData)
      .eq('id', contentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error al actualizar contenido:', updateError);
      return res.status(500).json({ error: 'Error al actualizar el contenido' });
    }

    res.json({
      message: 'Contenido actualizado exitosamente',
      content: updatedContent
    });

  } catch (error) {
    console.error('Error PUT /plans/:planId/content/:contentId:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/study/plans/:planId/content/:contentId - Eliminar contenido generado
router.delete('/plans/:planId/content/:contentId', authMiddleware, async (req, res) => {
  try {
    const { planId, contentId } = req.params;

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Verificar que el contenido existe y pertenece al usuario
    const { data: existingContent, error: contentError } = await sb
      .from('plan_generated_content')
      .select(`
        *,
        study_plans!inner(user_id)
      `)
      .eq('id', contentId)
      .eq('plan_id', planId)
      .single();

    if (contentError || !existingContent) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    if (existingContent.study_plans.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este contenido' });
    }

    // Eliminar contenido
    const { error: deleteError } = await sb
      .from('plan_generated_content')
      .delete()
      .eq('id', contentId);

    if (deleteError) {
      console.error('Error al eliminar contenido:', deleteError);
      return res.status(500).json({ error: 'Error al eliminar el contenido' });
    }

    res.json({
      message: 'Contenido eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error DELETE /plans/:planId/content/:contentId:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/study/plans/:planId/content/:contentId/progress - Registrar progreso en contenido
router.post('/plans/:planId/content/:contentId/progress', authMiddleware, async (req, res) => {
  try {
    const { planId, contentId } = req.params;
    const { interactionType, score, timeSpent } = req.body;

    if (!interactionType) {
      return res.status(400).json({ error: 'Tipo de interacción es requerido' });
    }

    const validInteractionTypes = ['leido', 'completado', 'respondido', 'favorito'];
    if (!validInteractionTypes.includes(interactionType)) {
      return res.status(400).json({ error: 'Tipo de interacción no válido' });
    }

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Verificar que el contenido existe y pertenece al usuario
    const { data: content, error: contentError } = await sb
      .from('plan_generated_content')
      .select(`
        *,
        study_plans!inner(user_id)
      `)
      .eq('id', contentId)
      .eq('plan_id', planId)
      .single();

    if (contentError || !content) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    if (content.study_plans.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para registrar progreso en este contenido' });
    }

    // Insertar o actualizar progreso (upsert)
    const { data: progress, error: progressError } = await sb
      .from('plan_content_progress')
      .upsert([{
        user_id: req.user.id,
        plan_content_id: contentId,
        interaction_type: interactionType,
        score: score || null,
        time_spent: timeSpent || 0
      }], {
        onConflict: 'user_id,plan_content_id,interaction_type'
      })
      .select('*')
      .single();

    if (progressError) {
      console.error('Error al registrar progreso:', progressError);
      return res.status(500).json({ error: 'Error al registrar el progreso' });
    }

    res.json({
      message: 'Progreso registrado exitosamente',
      progress
    });

  } catch (error) {
    console.error('Error POST /plans/:planId/content/:contentId/progress:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/study/plans/:planId/content/:contentId/progress - Obtener progreso de contenido
router.get('/plans/:planId/content/:contentId/progress', authMiddleware, async (req, res) => {
  try {
    const { planId, contentId } = req.params;

    const sb = process.env.NODE_ENV === 'development' ? supabase : (req.supabase || supabase);

    // Verificar que el contenido existe y pertenece al usuario
    const { data: content, error: contentError } = await sb
      .from('plan_generated_content')
      .select(`
        *,
        study_plans!inner(user_id)
      `)
      .eq('id', contentId)
      .eq('plan_id', planId)
      .single();

    if (contentError || !content) {
      return res.status(404).json({ error: 'Contenido no encontrado' });
    }

    if (content.study_plans.user_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permisos para ver el progreso de este contenido' });
    }

    // Obtener progreso
    const { data: progress, error: progressError } = await sb
      .from('plan_content_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('plan_content_id', contentId)
      .order('completed_at', { ascending: false });

    if (progressError) {
      console.error('Error al obtener progreso:', progressError);
      return res.status(500).json({ error: 'Error al obtener el progreso' });
    }

    res.json({
      contentId: parseInt(contentId),
      progress: progress || []
    });

  } catch (error) {
    console.error('Error GET /plans/:planId/content/:contentId/progress:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;