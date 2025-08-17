const express = require('express');
const router = express.Router();

// Endpoint para obtener configuración de Supabase para el frontend
router.get('/supabase', (req, res) => {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ 
        error: 'Configuración de Supabase no disponible en el servidor' 
      });
    }

    res.json({
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY
    });
  } catch (error) {
    console.error('Error al obtener configuración de Supabase:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor' 
    });
  }
});

module.exports = router;