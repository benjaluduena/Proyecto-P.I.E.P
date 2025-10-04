const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');

// Endpoint temporal para eliminar planes específicos
router.delete('/delete-plan/:id', async (req, res) => {
  try {
    const planId = req.params.id;
    
    // Primero eliminar las tareas del plan
    const { error: tasksError } = await supabase
      .from('plan_tasks')
      .delete()
      .eq('plan_id', planId);
    
    if (tasksError) {
      console.error('Error eliminando tareas:', tasksError);
    }
    
    // Luego eliminar el plan
    const { error: planError } = await supabase
      .from('study_plans')
      .delete()
      .eq('id', planId);
    
    if (planError) {
      console.error('Error eliminando plan:', planError);
      return res.status(500).json({ error: 'Error al eliminar el plan' });
    }
    
    res.json({ message: `Plan ${planId} eliminado correctamente` });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Diagnóstico de suscripción para un usuario específico
router.get('/subscription/diagnostic/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar si el usuario tiene permisos para ver este diagnóstico
    // (Solo para propósitos de diagnóstico, en producción esto debería estar restringido)
    
    console.log(`Diagnosticando suscripción para usuario: ${userId}`);
    
    // Obtener información del usuario
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email, name, role, subscription_status')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('Error al obtener perfil del usuario:', userError);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener información de suscripción
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Obtener información de autenticación
    let authUser = null;
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (!error && data.user) {
        authUser = data.user;
      }
    } catch (authError) {
      console.warn('No se pudo obtener información de auth:', authError);
    }
    
    // Preparar respuesta
    const diagnostic = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription_status: user.subscription_status
      },
      subscription: subscription || null,
      auth: authUser ? {
        id: authUser.id,
        email: authUser.email,
        confirmed_at: authUser.confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at
      } : null,
      timestamp: new Date().toISOString()
    };
    
    console.log('Diagnóstico completado:', diagnostic);
    res.json(diagnostic);
  } catch (error) {
    console.error('Error en diagnóstico de suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Diagnóstico de suscripción para el usuario actual (autenticado)
router.get('/subscription/diagnostic', supabaseAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Diagnosticando suscripción para usuario autenticado: ${userId}`);
    
    // Obtener información de suscripción
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Preparar respuesta
    const diagnostic = {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      },
      subscription: subscription || null,
      timestamp: new Date().toISOString()
    };
    
    console.log('Diagnóstico completado:', diagnostic);
    res.json(diagnostic);
  } catch (error) {
    console.error('Error en diagnóstico de suscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Diagnóstico completo del sistema
router.get('/system/health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        tables: {}
      },
      mercadopago: {
        configured: !!process.env.MP_ACCESS_TOKEN,
        back_url: process.env.MP_BACK_URL || null
      },
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5500
      }
    };

    // Verificar conexión a BD y tablas
    try {
      // Verificar tabla subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .limit(1);
      
      health.database.connected = true;
      health.database.tables.subscriptions = !subError;
      
      // Verificar tabla profiles
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      health.database.tables.profiles = !profError;
      
    } catch (dbError) {
      health.database.connected = false;
      health.database.error = dbError.message;
    }

    res.json(health);
  } catch (error) {
    console.error('Error en health check:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;