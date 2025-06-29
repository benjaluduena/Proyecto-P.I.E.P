const express = require('express');
const supabase = require('../config/supabase');
const { simpleAuth } = require('../middleware/auth');
const router = express.Router();

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, education_level } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    // Verificar si el email ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    // Guardar usuario (contraseña en texto plano para simplicidad local)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ name, email, password_hash: password, role, education_level }])
      .select('id, name, email, role, education_level, created_at')
      .single();
    if (error) {
      return res.status(500).json({ error: 'Error al crear el usuario' });
    }
    res.status(201).json({ message: 'Usuario registrado exitosamente', user: newUser });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Login de usuario
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash, role, education_level')
      .eq('email', email)
      .single();
    if (error || !user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    // No se devuelve token, solo los datos del usuario
    res.json({ message: 'Login exitoso', user });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener perfil (requiere autenticación simple)
router.get('/profile', simpleAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router; 