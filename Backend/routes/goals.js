const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, supabaseAuth en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;
const router = express.Router();

// Crear tabla de metas si no existe (esto debe ejecutarse una vez)
// En un entorno real, esto se haría a través de migraciones
const initializeGoalsTable = async () => {
  try {
    // Crear tabla user_goals si no existe
    const { error } = await supabase.rpc('create_user_goals_table');
    if (error && !error.message.includes('already exists')) {
      console.error('Error creando tabla user_goals:', error);
    }
  } catch (error) {
    console.error('Error inicializando tabla de metas:', error);
  }
};

// Obtener metas del usuario
router.get('/user/goals', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Intentar obtener metas de la base de datos
    let { data: goalsData, error: goalsError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    // Si la tabla no existe o hay error, crear la tabla
    if (goalsError && goalsError.code === '42P01') {
      await initializeGoalsTable();
      goalsData = [];
    } else if (goalsError) {
      console.error('Error obteniendo metas:', goalsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener metas' 
      });
    }

    // Calcular progreso para cada meta
    if (goalsData && goalsData.length > 0) {
      for (const goal of goalsData) {
        goal.progress = await calculateGoalProgress(userId, goal);
      }
    }

    res.json({
      success: true,
      data: goalsData || []
    });

  } catch (error) {
    console.error('Error en /user/goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Crear nueva meta
router.post('/user/goals', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, type, target, deadline } = req.body;

    // Validar datos
    if (!title || !type || !target || !deadline) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: title, type, target, deadline'
      });
    }

    const validTypes = ['daily_content', 'weekly_hours', 'monthly_pdfs', 'streak_days'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de meta inválido'
      });
    }

    // Intentar insertar en la base de datos
    const goalData = {
      user_id: userId,
      title,
      type,
      target: parseInt(target),
      deadline,
      active: true,
      created_at: new Date().toISOString()
    };

    let { data: newGoal, error: insertError } = await supabase
      .from('user_goals')
      .insert([goalData])
      .select()
      .single();

    // Si la tabla no existe, crearla e intentar de nuevo
    if (insertError && insertError.code === '42P01') {
      await initializeGoalsTable();
      const { data: retryGoal, error: retryError } = await supabase
        .from('user_goals')
        .insert([goalData])
        .select()
        .single();
      
      if (retryError) {
        console.error('Error creando meta (retry):', retryError);
        return res.status(500).json({
          success: false,
          error: 'Error al crear meta'
        });
      }
      newGoal = retryGoal;
    } else if (insertError) {
      console.error('Error creando meta:', insertError);
      return res.status(500).json({
        success: false,
        error: 'Error al crear meta'
      });
    }

    // Calcular progreso inicial
    if (newGoal) {
      newGoal.progress = await calculateGoalProgress(userId, newGoal);
    }

    res.json({
      success: true,
      data: newGoal
    });

  } catch (error) {
    console.error('Error en POST /user/goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Actualizar meta
router.put('/user/goals/:goalId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.goalId;
    const { title, type, target, deadline, active } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (type) updateData.type = type;
    if (target) updateData.target = parseInt(target);
    if (deadline) updateData.deadline = deadline;
    if (active !== undefined) updateData.active = active;

    const { data: updatedGoal, error: updateError } = await supabase
      .from('user_goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando meta:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar meta'
      });
    }

    if (updatedGoal) {
      updatedGoal.progress = await calculateGoalProgress(userId, updatedGoal);
    }

    res.json({
      success: true,
      data: updatedGoal
    });

  } catch (error) {
    console.error('Error en PUT /user/goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Eliminar meta
router.delete('/user/goals/:goalId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.goalId;

    const { error: deleteError } = await supabase
      .from('user_goals')
      .update({ active: false })
      .eq('id', goalId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error eliminando meta:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar meta'
      });
    }

    res.json({
      success: true,
      message: 'Meta eliminada correctamente'
    });

  } catch (error) {
    console.error('Error en DELETE /user/goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Función para calcular el progreso de una meta
async function calculateGoalProgress(userId, goal) {
  try {
    let current = 0;
    
    switch (goal.type) {
      case 'daily_content':
        // Calcular interacciones de hoy
        const today = new Date().toISOString().split('T')[0];
        const { data: todayProgress } = await supabase
          .from('progress_tracking')
          .select('id')
          .eq('user_id', userId)
          .gte('interacted_at', today + 'T00:00:00')
          .lt('interacted_at', today + 'T23:59:59');
        current = todayProgress?.length || 0;
        break;
        
      case 'weekly_hours':
        // Calcular horas de esta semana
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const { data: weekProgress } = await supabase
          .from('progress_tracking')
          .select('id')
          .eq('user_id', userId)
          .gte('interacted_at', weekStart.toISOString());
        
        // Estimar horas (15 minutos por interacción)
        current = Math.round((weekProgress?.length || 0) * 0.25);
        break;
        
      case 'monthly_pdfs':
        // Calcular PDFs subidos este mes
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const { data: monthPdfs } = await supabase
          .from('pdf_uploads')
          .select('id')
          .eq('user_id', userId)
          .gte('uploaded_at', monthStart.toISOString());
        current = monthPdfs?.length || 0;
        break;
        
      case 'streak_days':
        // Calcular racha actual
        const { data: progressData } = await supabase
          .from('progress_tracking')
          .select('interacted_at')
          .eq('user_id', userId)
          .order('interacted_at', { ascending: false });

        if (progressData && progressData.length > 0) {
          const uniqueDates = [...new Set(
            progressData.map(item => new Date(item.interacted_at).toDateString())
          )].sort((a, b) => new Date(b) - new Date(a));

          let streak = 0;
          let checkDate = new Date();
          
          for (const dateStr of uniqueDates) {
            if (dateStr === checkDate.toDateString()) {
              streak++;
              checkDate.setDate(checkDate.getDate() - 1);
            } else {
              break;
            }
          }
          current = streak;
        }
        break;
    }
    
    const progressPercentage = Math.min((current / goal.target) * 100, 100);
    
    return {
      current,
      target: goal.target,
      percentage: Math.round(progressPercentage)
    };
    
  } catch (error) {
    console.error('Error calculando progreso de meta:', error);
    return {
      current: 0,
      target: goal.target,
      percentage: 0
    };
  }
}

module.exports = router;