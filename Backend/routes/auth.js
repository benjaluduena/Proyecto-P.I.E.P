const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');
const router = express.Router();

// Registro de usuario con Supabase Auth
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, education_level } = req.body;
    
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Registrar usuario con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          role: role,
          education_level: education_level
        }
      }
    });

    if (authError) {
      return res.status(400).json({ 
        error: 'Error al registrar usuario',
        message: authError.message 
      });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'No se pudo crear el usuario' });
    }

    // Crear perfil en la tabla profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        name: name,
        role: role,
        education_level: education_level
      }]);

    if (profileError) {
      console.error('Error al crear perfil:', profileError);
      // No fallamos aquí porque el usuario ya se creó en auth
    }

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: name,
        role: role,
        education_level: education_level
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login de usuario con Supabase Auth
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    // Login con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        message: authError.message 
      });
    }

    if (!authData.user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Obtener datos del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, role, education_level')
      .eq('id', authData.user.id)
      .single();

    res.json({ 
      message: 'Login exitoso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: profile?.name || authData.user.user_metadata?.name || 'Usuario',
        role: profile?.role || 'estudiante',
        education_level: profile?.education_level || 'universitario'
      },
      session: authData.session
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Logout de usuario
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(500).json({ 
        error: 'Error al cerrar sesión',
        message: error.message 
      });
    }

    res.json({ message: 'Sesión cerrada exitosamente' });

  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil del usuario autenticado
router.get('/profile', supabaseAuth, async (req, res) => {
  try {
    // El middleware ya obtiene el perfil, solo devolvemos los datos
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar perfil del usuario
router.put('/profile', supabaseAuth, async (req, res) => {
  try {
    const { name, role, education_level } = req.body;
    const userId = req.user.id;

    // Actualizar perfil en la tabla profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ name, role, education_level })
      .eq('id', userId)
      .select('name, role, education_level')
      .single();

    if (error) {
      return res.status(500).json({ 
        error: 'Error al actualizar perfil',
        message: error.message 
      });
    }

    // Actualizar metadata del usuario en auth si es necesario
    await supabase.auth.updateUser({
      data: { name, role, education_level }
    });

    res.json({ 
      message: 'Perfil actualizado exitosamente',
      user: {
        id: userId,
        email: req.user.email,
        name: profile.name,
        role: profile.role,
        education_level: profile.education_level
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router; 