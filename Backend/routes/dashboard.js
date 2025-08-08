const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');
const router = express.Router();

// Obtener estadísticas generales del dashboard
router.get('/stats', supabaseAuth, async (req, res) => {
  try {
    // Obtener estadísticas usando la vista user_dashboard_stats
    const { data: stats, error } = await supabase
      .from('user_dashboard_stats')
      .select('*');

    if (error) {
      console.error('Error obteniendo estadísticas:', error);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }

    // Calcular totales
    const totals = {
      users: stats.length,
      pdfs: stats.reduce((sum, stat) => sum + (stat.total_pdfs || 0), 0),
      outputs: stats.reduce((sum, stat) => sum + (stat.total_outputs || 0), 0),
      plans: stats.reduce((sum, stat) => sum + (stat.total_plans || 0), 0),
      tasks: stats.reduce((sum, stat) => sum + (stat.total_tasks || 0), 0),
      completedTasks: stats.reduce((sum, stat) => sum + (stat.completed_tasks || 0), 0)
    };

    res.json({ stats: totals });
  } catch (error) {
    console.error('Error en endpoint de estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas del usuario actual
router.get('/user-stats', supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener estadísticas específicas del usuario
    const { data: userStats, error } = await supabase
      .from('user_dashboard_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error obteniendo estadísticas del usuario:', error);
      return res.status(500).json({ error: 'Error al obtener estadísticas del usuario' });
    }

    res.json({ userStats });
  } catch (error) {
    console.error('Error en endpoint de estadísticas del usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener actividad reciente
router.get('/recent-activity', supabaseAuth, async (req, res) => {
  try {
    const { data: recentContent, error } = await supabase
      .from('recent_content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error obteniendo actividad reciente:', error);
      return res.status(500).json({ error: 'Error al obtener actividad reciente' });
    }

    res.json({ recentActivity: recentContent });
  } catch (error) {
    console.error('Error en endpoint de actividad reciente:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener distribución de tipos de contenido
router.get('/content-distribution', supabaseAuth, async (req, res) => {
  try {
    const { data: contentTypes, error } = await supabase
      .from('study_outputs')
      .select('type');

    if (error) {
      console.error('Error obteniendo distribución de contenido:', error);
      return res.status(500).json({ error: 'Error al obtener distribución de contenido' });
    }

    // Contar por tipo
    const distribution = contentTypes.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    res.json({ distribution });
  } catch (error) {
    console.error('Error en endpoint de distribución de contenido:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener progreso mensual del usuario
router.get('/monthly-progress', supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener tareas completadas este mes
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: tasks, error } = await supabase
      .from('plan_tasks')
      .select('*')
      .eq('completed', true)
      .gte('created_at', startOfMonth.toISOString());

    if (error) {
      console.error('Error obteniendo progreso mensual:', error);
      return res.status(500).json({ error: 'Error al obtener progreso mensual' });
    }

    const completedThisMonth = tasks.length;
    const progressPercentage = Math.min(completedThisMonth * 10, 100); // 10% por tarea

    res.json({ 
      completedThisMonth,
      progressPercentage
    });
  } catch (error) {
    console.error('Error en endpoint de progreso mensual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de crecimiento (comparación con mes anterior)
router.get('/growth-stats', supabaseAuth, async (req, res) => {
  try {
    const currentMonth = new Date();
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    // Obtener estadísticas del mes actual
    const { data: currentStats, error: currentError } = await supabase
      .from('pdf_uploads')
      .select('*')
      .gte('uploaded_at', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString());

    if (currentError) {
      console.error('Error obteniendo estadísticas del mes actual:', currentError);
      return res.status(500).json({ error: 'Error al obtener estadísticas de crecimiento' });
    }

    // Obtener estadísticas del mes anterior
    const { data: previousStats, error: previousError } = await supabase
      .from('pdf_uploads')
      .select('*')
      .gte('uploaded_at', new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1).toISOString())
      .lt('uploaded_at', new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString());

    if (previousError) {
      console.error('Error obteniendo estadísticas del mes anterior:', previousError);
      return res.status(500).json({ error: 'Error al obtener estadísticas de crecimiento' });
    }

    const currentCount = currentStats.length;
    const previousCount = previousStats.length;
    
    let growthPercentage = 0;
    if (previousCount > 0) {
      growthPercentage = ((currentCount - previousCount) / previousCount) * 100;
    } else if (currentCount > 0) {
      growthPercentage = 100; // Si no había actividad el mes anterior pero sí este mes
    }

    res.json({
      currentMonth: currentCount,
      previousMonth: previousCount,
      growthPercentage: Math.round(growthPercentage)
    });
  } catch (error) {
    console.error('Error en endpoint de estadísticas de crecimiento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 