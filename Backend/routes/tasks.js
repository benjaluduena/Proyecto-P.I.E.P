const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/tasks - Listar tareas del usuario autenticado
router.get('/', supabaseAuth, async (req, res) => {
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
        due_at,
        completed,
        created_at,
        study_plans!inner ( user_id )
      `)
      .eq('study_plans.user_id', req.user.id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error al listar tareas:', error);
      return res.status(500).json({ error: 'Error al obtener tareas' });
    }

    // Remover join de respuesta
    const sanitized = (tasks || []).map(t => ({
      id: t.id,
      plan_id: t.plan_id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      due_at: t.due_at,
      completed: t.completed,
      created_at: t.created_at
    }));

    res.json({ tasks: sanitized });
  } catch (err) {
    console.error('Error GET /tasks:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/tasks - Crear tarea
router.post('/', supabaseAuth, async (req, res) => {
  try {
    const { plan_id, title, description, due_date, due_at, completed } = req.body;
    if (!plan_id || !title || !due_date) {
      return res.status(400).json({ error: 'plan_id, title y due_date son requeridos' });
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
        description: description || null, 
        due_date, 
        due_at: due_at || null,
        completed: !!completed 
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error al crear tarea:', error);
      return res.status(500).json({ error: 'Error al crear la tarea' });
    }

    res.status(201).json({ task });
  } catch (err) {
    console.error('Error POST /tasks:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/tasks/:id - Editar tarea
router.put('/:id', supabaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, due_at, completed, plan_id } = req.body;

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
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (due_date !== undefined) update.due_date = due_date;
    if (due_at !== undefined) update.due_at = due_at;
    if (completed !== undefined) update.completed = completed;
    if (plan_id !== undefined) update.plan_id = plan_id; // opcional mover tarea a otro plan del mismo user

    const { data: task, error } = await sb
      .from('plan_tasks')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar tarea:', error);
      return res.status(500).json({ error: 'Error al actualizar la tarea' });
    }

    res.json({ task });
  } catch (err) {
    console.error('Error PUT /tasks/:id:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/tasks/:id - Eliminar tarea
router.delete('/:id', supabaseAuth, async (req, res) => {
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


