const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase desde variables de entorno
const supabaseUrl = process.env.SUPABASE_URL || 'https://fqmpmseabhtvahzdavej.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupClassroomTables() {
  try {
    console.log('🚀 Configurando tablas de Classroom...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'migrations', 'create_classroom_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Archivo SQL leído correctamente');
    
    // Ejecutar el SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error ejecutando SQL:', error);
      
      // Si no existe la función exec_sql, intentar ejecutar directamente
      console.log('🔄 Intentando método alternativo...');
      
      // Dividir el SQL en comandos individuales
      const commands = sqlContent.split(';').filter(cmd => cmd.trim());
      
      for (let i = 0; i < commands.length; i++) {
        const command = commands[i].trim();
        if (command) {
          try {
            console.log(`📝 Ejecutando comando ${i + 1}/${commands.length}...`);
            const { error: cmdError } = await supabase.rpc('exec_sql', { sql: command });
            if (cmdError) {
              console.warn(`⚠️ Comando ${i + 1} falló:`, cmdError.message);
            }
          } catch (e) {
            console.warn(`⚠️ Comando ${i + 1} falló:`, e.message);
          }
        }
      }
    } else {
      console.log('✅ SQL ejecutado correctamente');
    }
    
    // Verificar que las tablas se crearon
    console.log('\n🔍 Verificando tablas creadas...');
    
    const tables = ['classrooms', 'classroom_enrollments', 'classroom_materials'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.error(`❌ Tabla ${table} no existe:`, error.message);
        } else {
          console.log(`✅ Tabla ${table} existe`);
        }
      } catch (e) {
        console.error(`❌ Error verificando tabla ${table}:`, e.message);
      }
    }
    
    console.log('\n🎉 Proceso completado!');
    console.log('💡 Si algunas tablas no existen, necesitas ejecutar el SQL manualmente en Supabase');
    
  } catch (error) {
    console.error('❌ Error general:', error);
    console.log('\n📋 Instrucciones manuales:');
    console.log('1. Ve a tu panel de Supabase');
    console.log('2. Abre el SQL Editor');
    console.log('3. Copia y pega el contenido de Backend/migrations/create_classroom_tables.sql');
    console.log('4. Ejecuta el SQL');
  }
}

setupClassroomTables(); 