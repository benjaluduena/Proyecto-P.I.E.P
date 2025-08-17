const supabase = require('./config/supabase');

async function testClassroomTables() {
  try {
    console.log('Verificando tablas de classroom...');
    
    // Verificar si la tabla classrooms existe
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('count')
      .limit(1);
    
    if (classroomsError) {
      console.error('❌ Error accediendo a tabla classrooms:', classroomsError.message);
      console.log('💡 Necesitas ejecutar las migraciones de classroom');
    } else {
      console.log('✅ Tabla classrooms existe');
    }
    
    // Verificar si la tabla classroom_enrollments existe
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('classroom_enrollments')
      .select('count')
      .limit(1);
    
    if (enrollmentsError) {
      console.error('❌ Error accediendo a tabla classroom_enrollments:', enrollmentsError.message);
      console.log('💡 Necesitas ejecutar las migraciones de classroom');
    } else {
      console.log('✅ Tabla classroom_enrollments existe');
    }
    
    // Verificar si la tabla classroom_materials existe
    const { data: materials, error: materialsError } = await supabase
      .from('classroom_materials')
      .select('count')
      .limit(1);
    
    if (materialsError) {
      console.error('❌ Error accediendo a tabla classroom_materials:', materialsError.message);
      console.log('💡 Necesitas ejecutar las migraciones de classroom');
    } else {
      console.log('✅ Tabla classroom_materials existe');
    }
    
    console.log('\n📋 Resumen:');
    console.log('- Si ves errores arriba, necesitas ejecutar las migraciones');
    console.log('- Si todas las tablas existen, el problema puede ser otro');
    
  } catch (error) {
    console.error('Error general:', error);
  }
}

testClassroomTables(); 