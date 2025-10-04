const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, authMiddleware en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;

const router = express.Router();

// GET /api/tasks - Listar tareas del usuario autenticado
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sb = req.supabase || supabase;
    const { data: tasks, error } = await sb
      .from('plan_tasks')
      .select(`
        id,
        plan_id,
        title,
        description,
        due_date,
        completed,
        priority,
        output_id,
        created_at,
        study_plans!inner ( user_id )
      `)
      .eq('study_plans.user_id', req.user.id)
      .order('due_date', { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    const sanitized = (tasks || []).map(t => ({
      id: t.id,
      plan_id: t.plan_id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      completed: t.completed,
      priority: t.priority,
      output_id: t.output_id,
      created_at: t.created_at
    }));

    res.json({ tasks: sanitized });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

// POST /api/tasks - Crear tarea
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { plan_id, title, description, due_date, completed, output_id, priority } = req.body;

    if (!plan_id || !title || !due_date) {
      return res.status(400).json({ error: 'plan_id, título y due_date son requeridos' });
    }

    const sb = req.supabase || supabase;

    // Verificar que el plan pertenece al usuario
    const { data: plan } = await sb
      .from('study_plans')
      .select('id, user_id')
      .eq('id', plan_id)
      .eq('user_id', req.user.id)
      .single();

    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    const { data: task, error } = await sb
      .from('plan_tasks')
      .insert([{
        plan_id,
        title,
        description,
        due_date,
        completed: !!completed,
        output_id: output_id || null,
        priority: priority || 'medium'
      }])
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

// PUT /api/tasks/:id - Editar tarea
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, completed, plan_id, output_id, priority } = req.body;

    const sb = req.supabase || supabase;

    // Verificar pertenencia (join con study_plans)
    const { data: exists } = await sb
      .from('plan_tasks')
      .select('id, study_plans!inner(user_id)')
      .eq('id', id)
      .single();
    if (!exists || exists.study_plans.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const update = {};
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (due_date) update.due_date = due_date;
    if (completed !== undefined) update.completed = completed;
    if (plan_id !== undefined) update.plan_id = plan_id;
    if (output_id !== undefined) update.output_id = output_id;
    if (priority !== undefined) update.priority = priority;

    const { data, error } = await sb
      .from('plan_tasks')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar tarea' });
  }
});

// DELETE /api/tasks/:id - Eliminar tarea
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const sb = req.supabase || supabase;
    // Verificar pertenencia
    const { data: exists } = await sb
      .from('plan_tasks')
      .select('id, study_plans!inner(user_id)')
      .eq('id', id)
      .single();
    if (!exists || exists.study_plans.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    const { error } = await sb
      .from('plan_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar tarea:', error);
      return res.status(500).json({ error: 'Error al eliminar la tarea' });
    }

    res.json({ message: 'Tarea eliminada exitosamente' });
  } catch (err) {
    console.error('Error DELETE /tasks/:id:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


