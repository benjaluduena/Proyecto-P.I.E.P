const { createClient } = require('@supabase/supabase-js');

<<<<<<< HEAD
const supabaseUrl = process.env.SUPABASE_URL || 'https://fqmpmseabhtvahzdavej.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE';
=======
const supabaseUrl = process.env.SUPABASE_URL;
// Preferir la clave de servicio en el backend para evitar problemas con RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}
>>>>>>> origin/feat-plan-estudio

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;