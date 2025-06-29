const supabase = require('../config/supabase');

// Middleware para verificar usuario y contraseña en cada request
async function simpleAuth(req, res, next) {
  const { email, password } = req.headers;
  if (!email || !password) {
    return res.status(401).json({ error: 'Email y contraseña requeridos en los headers' });
  }
  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, password_hash, role, education_level')
    .eq('email', email)
    .single();
  if (error || !user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  // Verificar contraseña (en texto plano para simplicidad local)
  if (user.password_hash !== password) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  req.user = user;
  next();
}

module.exports = { simpleAuth }; 