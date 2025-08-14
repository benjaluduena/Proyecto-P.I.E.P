const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');

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

module.exports = router;