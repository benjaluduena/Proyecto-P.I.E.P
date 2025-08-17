const supabase = require('../config/supabase');
const { createClient } = require('@supabase/supabase-js');

// Middleware para verificar JWT de Supabase Auth
async function supabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autorización requerido',
        message: 'Debe incluir un token Bearer en el header Authorization'
      });
    }

    const token = authHeader.substring(7); // Remover 'Bearer ' del token

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'El token de autorización no es válido o ha expirado'
      });
    }

    // Obtener datos adicionales del perfil si existen
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role, education_level')
      .eq('id', user.id)
      .single();

    // Combinar datos del usuario de auth con el perfil
    req.user = {
      id: user.id,
      email: user.email,
      name: profile?.name || user.user_metadata?.name || 'Usuario',
      role: profile?.role || 'estudiante',
      education_level: profile?.education_level || 'universitario'
    };

    // Crear un cliente de Supabase "scopeado" al usuario usando su token,
    // para que las policies RLS vean auth.uid()
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        req.supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } }
        });
      }
    } catch (e) {
      // Si falla la creación, continuamos sin bloquear
    }

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ 
      error: 'Error en la autenticación',
      message: 'Error interno del servidor durante la verificación del token'
    });
  }
}

// Middleware para desarrollo que permite peticiones sin autenticación
function devAuth(req, res, next) {
  // Solo permitir bypass en desarrollo y localhost
  if (process.env.NODE_ENV !== 'development') {
    return supabaseAuth(req, res, next);
  }
  
  // Verificar que la request viene de localhost
  const isLocalhost = req.ip === '127.0.0.1' || 
                     req.ip === '::1' || 
                     req.hostname === 'localhost' ||
                     req.hostname === '127.0.0.1';
  
  if (!isLocalhost) {
    return supabaseAuth(req, res, next);
  }
  
  // Para desarrollo local, crear un usuario de prueba si no hay autenticación
  if (!req.headers.authorization) {
    console.warn('⚠️ Usando usuario de desarrollo - SOLO para localhost en desarrollo');
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440000', // UUID válido para desarrollo
      name: 'Usuario de Desarrollo',
      email: 'dev@test.com',
      role: 'estudiante',
      education_level: 'universitario'
    };
    return next();
  }
  
  // Si hay token de autorización, usar la autenticación de Supabase
  return supabaseAuth(req, res, next);
}

// Middleware legacy para compatibilidad (deprecated)
async function simpleAuth(req, res, next) {
  console.warn('⚠️ simpleAuth está deprecado. Use supabaseAuth en su lugar.');
  return supabaseAuth(req, res, next);
}

module.exports = { supabaseAuth, devAuth, simpleAuth }; 