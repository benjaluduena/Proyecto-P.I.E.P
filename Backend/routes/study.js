const express = require('express');
const supabase = require('../config/supabase');
const { simpleAuth } = require('../middleware/auth');

const router = express.Router();

// Crear plan de estudio
router.post('/plans', simpleAuth, async (req, res) => {
  try {
    const { title, description, start_date, end_date, notify_by_email, notify_by_whatsapp } = req.body;

    if (!title || !start_date || !end_date) {
      return res.status(400).json({ error: 'Título, fecha de inicio y fecha de fin son requeridos' });
    }

    const { data: plan, error } = await supabase
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
router.get('/plans', simpleAuth, async (req, res) => {
  try {
    const { data: plans, error } = await supabase
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
          due_date,
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
router.get('/plans/:planId', simpleAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const { data: plan, error } = await supabase
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
router.put('/plans/:planId', simpleAuth, async (req, res) => {
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

    const { data: plan, error } = await supabase
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
router.delete('/plans/:planId', simpleAuth, async (req, res) => {
  try {
    const { planId } = req.params;

    const { error } = await supabase
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
router.post('/plans/:planId/tasks', simpleAuth, async (req, res) => {
  try {
    const { planId } = req.params;
    const { title, description, due_date, related_output_id } = req.body;

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Título y fecha de vencimiento son requeridos' });
    }

    // Verificar que el plan pertenece al usuario
    const { data: plan } = await supabase
      .from('study_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', req.user.id)
      .single();

    if (!plan) {
      return res.status(404).json({ error: 'Plan de estudio no encontrado' });
    }

    const { data: task, error } = await supabase
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
router.put('/tasks/:taskId', simpleAuth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, due_date, completed, related_output_id } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date) updateData.due_date = due_date;
    if (completed !== undefined) updateData.completed = completed;
    if (related_output_id !== undefined) updateData.related_output_id = related_output_id;

    const { data: task, error } = await supabase
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
router.delete('/tasks/:taskId', simpleAuth, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Verificar que la tarea pertenece al usuario
    const { data: task } = await supabase
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

    const { error } = await supabase
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
router.post('/progress', simpleAuth, async (req, res) => {
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
router.get('/progress/stats', simpleAuth, async (req, res) => {
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

    // Tareas completadas vs pendientes
    const { data: tasks, error: tasksError } = await supabase
      .from('plan_tasks')
      .select('completed')
      .eq('study_plans.user_id', req.user.id);

    if (interactionsError || contentError || tasksError) {
      console.error('Error al obtener estadísticas:', { interactionsError, contentError, tasksError });
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }

    const stats = {
      totalInteractions: totalInteractions?.length || 0,
      topContent: topContent || [],
      completedTasks: tasks?.filter(t => t.completed).length || 0,
      pendingTasks: tasks?.filter(t => !t.completed).length || 0
    };

    res.json({ stats });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener historial de progreso
router.get('/progress/history', simpleAuth, async (req, res) => {
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

module.exports = router; 