const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth, devAuth } = require('../middleware/auth');

// Usar devAuth en desarrollo, supabaseAuth en producción
const authMiddleware = process.env.NODE_ENV === 'development' ? devAuth : supabaseAuth;
const router = express.Router();

// Obtener progreso del usuario (interacciones con contenido)
router.get('/user/progress', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener datos de progress_tracking
    const { data: progressData, error: progressError } = await supabase
      .from('progress_tracking')
      .select(`
        *,
        study_outputs (
          type,
          created_at,
          pdf_uploads (
            title,
            file_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (progressError) {
      console.error('Error obteniendo progreso:', progressError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener datos de progreso' 
      });
    }

    res.json({
      success: true,
      data: progressData || []
    });

  } catch (error) {
    console.error('Error en /user/progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener datos del perfil del usuario
router.get('/user/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener datos del perfil
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener datos del perfil' 
      });
    }

    // Obtener datos de auth.users para fecha de creación
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    const responseData = {
      ...profileData,
      email: userData?.user?.email,
      created_at: userData?.user?.created_at
    };

    res.json({
      success: true,
      user: responseData
    });

  } catch (error) {
    console.error('Error en /user/profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener PDFs del usuario
router.get('/user/pdfs', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: pdfsData, error: pdfsError } = await supabase
      .from('pdf_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });

    if (pdfsError) {
      console.error('Error obteniendo PDFs:', pdfsError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener PDFs' 
      });
    }

    res.json({
      success: true,
      data: pdfsData || []
    });

  } catch (error) {
    console.error('Error en /user/pdfs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener tareas del usuario
router.get('/user/tasks', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: tasksData, error: tasksError } = await supabase
      .from('plan_tasks')
      .select(`
        *,
        study_plans (
          title,
          description
        )
      `)
      .eq('study_plans.user_id', userId)
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error obteniendo tareas:', tasksError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener tareas' 
      });
    }

    res.json({
      success: true,
      data: tasksData || []
    });

  } catch (error) {
    console.error('Error en /user/tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Calcular racha de estudio
router.get('/user/streak', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener todas las fechas de interacción únicas
    const { data: progressData, error: progressError } = await supabase
      .from('progress_tracking')
      .select('interacted_at')
      .eq('user_id', userId)
      .order('interacted_at', { ascending: false });

    if (progressError) {
      console.error('Error obteniendo datos para racha:', progressError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al calcular racha' 
      });
    }

    // Calcular racha
    let currentStreak = 0;
    if (progressData && progressData.length > 0) {
      const uniqueDates = [...new Set(
        progressData.map(item => new Date(item.interacted_at).toDateString())
      )].sort((a, b) => new Date(b) - new Date(a));

      const today = new Date().toDateString();
      let checkDate = new Date();
      
      for (const dateStr of uniqueDates) {
        if (dateStr === checkDate.toDateString()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    res.json({
      success: true,
      streak: {
        current: currentStreak,
        goal: 7 // Meta por defecto
      }
    });

  } catch (error) {
    console.error('Error en /user/streak:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener estadísticas de uso mensual
router.get('/user/usage/monthly', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Obtener contenido generado este mes
    const { data: contentData, error: contentError } = await supabase
      .from('study_outputs')
      .select(`
        type,
        created_at,
        pdf_uploads!inner (
          user_id
        )
      `)
      .eq('pdf_uploads.user_id', userId)
      .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
      .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString());

    if (contentError) {
      console.error('Error obteniendo uso mensual:', contentError);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener datos de uso' 
      });
    }

    // Contar por tipo
    const usage = {
      total: contentData?.length || 0,
      summaries: 0,
      flashcards: 0,
      exercises: 0,
      mindMaps: 0
    };

    if (contentData) {
      contentData.forEach(item => {
        switch (item.type) {
          case 'resumen':
            usage.summaries++;
            break;
          case 'flashcards':
            usage.flashcards++;
            break;
          case 'multiple_choice':
          case 'verdadero_falso':
          case 'problema':
            usage.exercises++;
            break;
          case 'mapa_mental':
            usage.mindMaps++;
            break;
        }
      });
    }

    res.json({
      success: true,
      usage: usage
    });

  } catch (error) {
    console.error('Error en /user/usage/monthly:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

// Obtener estadísticas generales del usuario
router.get('/user/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Ejecutar consultas en paralelo para mejor rendimiento
    const [
      progressResult,
      pdfsResult,
      tasksResult,
      profileResult
    ] = await Promise.allSettled([
      supabase.from('progress_tracking').select('*').eq('user_id', userId),
      supabase.from('pdf_uploads').select('*').eq('user_id', userId),
      supabase.from('plan_tasks').select('*, study_plans!inner(user_id)').eq('study_plans.user_id', userId),
      supabase.from('profiles').select('created_at').eq('id', userId).single()
    ]);

    const stats = {
      totalInteractions: 0,
      totalPdfs: 0,
      completedTasks: 0,
      averageScore: 0,
      daysActive: 0
    };

    // Procesar interacciones
    if (progressResult.status === 'fulfilled' && progressResult.value.data) {
      const progressData = progressResult.value.data;
      stats.totalInteractions = progressData.length;
      
      // Calcular promedio de puntuación
      const scoresData = progressData.filter(item => item.score !== null && item.score !== undefined);
      if (scoresData.length > 0) {
        stats.averageScore = Math.round(
          scoresData.reduce((sum, item) => sum + (item.score || 0), 0) / scoresData.length
        );
      }
    }

    // Procesar PDFs
    if (pdfsResult.status === 'fulfilled' && pdfsResult.value.data) {
      stats.totalPdfs = pdfsResult.value.data.length;
    }

    // Procesar tareas
    if (tasksResult.status === 'fulfilled' && tasksResult.value.data) {
      const tasksData = tasksResult.value.data;
      stats.completedTasks = tasksData.filter(task => task.completed).length;
    }

    // Calcular días activo
    if (profileResult.status === 'fulfilled' && profileResult.value.data) {
      const createdDate = new Date(profileResult.value.data.created_at);
      const now = new Date();
      stats.daysActive = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    }

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error en /user/stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;