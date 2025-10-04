const express = require('express');
const supabase = require('../config/supabase');
const { supabaseAuth } = require('../middleware/auth');
const { validate, authSchemas } = require('../middleware/validation');
const router = express.Router();

<<<<<<< HEAD
// 📌 Registro de usuario con Supabase Auth + creación en profiles
router.post('/register', async (req, res) => {
=======
// Registro de usuario con Supabase Auth
router.post('/register', validate(authSchemas.register), async (req, res) => {
>>>>>>> origin/feat-plan-estudio
  try {
    const { name, email, password, role, education_level } = req.body;

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, education_level } // 👈 esto va al user_metadata
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
        name,
        role,
        education_level
      }]);

    if (profileError) {
      console.error('Error al crear perfil en profiles:', profileError);
    }

    res.status(201).json({ 
      message: 'Usuario registrado exitosamente',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role,
        education_level
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

<<<<<<< HEAD
// 📌 Login con Supabase Auth + carga de perfil desde profiles
router.post('/login', async (req, res) => {
=======
// Login de usuario con Supabase Auth
router.post('/login', validate(authSchemas.login), async (req, res) => {
>>>>>>> origin/feat-plan-estudio
  try {
    const { email, password } = req.body;

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

    // Consultar perfil en la tabla profiles
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, role, education_level')
      .eq('id', authData.user.id)
      .maybeSingle();

    // Si no existe perfil → crearlo automáticamente
    if (!profile) {
      console.log('📝 Creando perfil automáticamente para:', authData.user.email);

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          name: authData.user.user_metadata?.name || 'Usuario',
          role: authData.user.user_metadata?.role || 'estudiante',
          education_level: authData.user.user_metadata?.education_level || 'universitario'
        }])
        .select('name, role, education_level')
        .single();

      if (createError) {
        console.error('❌ Error creando perfil automáticamente:', createError);
        profile = null;
      } else {
        profile = newProfile;
        console.log('✅ Perfil creado automáticamente:', profile);
      }
    }

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

// 📌 Logout
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

// 📌 Obtener perfil del usuario autenticado (usa middleware supabaseAuth)
router.get('/profile', supabaseAuth, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

<<<<<<< HEAD
// 📌 Crear perfil manualmente
router.post('/create-profile', supabaseAuth, async (req, res) => {
  try {
    const { name, role, education_level } = req.body;
    const userId = req.user.id;

    // Verificar si ya existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      return res.status(400).json({ 
        error: 'El perfil ya existe',
        message: 'Este usuario ya tiene un perfil creado'
      });
    }

    // Crear nuevo
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        name: name || req.user.name || 'Usuario',
        role: role || req.user.role || 'estudiante',
        education_level: education_level || req.user.education_level || 'universitario'
      }])
      .select('name, role, education_level')
      .single();

    if (error) {
      console.error('Error creando perfil:', error);
      return res.status(500).json({ error: 'Error al crear perfil', message: error.message });
    }

    res.json({ message: 'Perfil creado exitosamente', profile });

  } catch (error) {
    console.error('Error creando perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 📌 Actualizar perfil
router.put('/profile', supabaseAuth, async (req, res) => {
=======
// Actualizar perfil del usuario
router.put('/profile', supabaseAuth, validate(authSchemas.updateProfile), async (req, res) => {
>>>>>>> origin/feat-plan-estudio
  try {
    const { name, role, education_level } = req.body;
    const userId = req.user.id;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ name, role, education_level })
      .eq('id', userId)
      .select('name, role, education_level')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Error al actualizar perfil', message: error.message });
    }

    // Sincronizar metadata en Auth
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
