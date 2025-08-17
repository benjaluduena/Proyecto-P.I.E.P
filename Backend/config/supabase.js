const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://fqmpmseabhtvahzdavej.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración global para OpenAI/OpenRouter

module.exports = supabase; 