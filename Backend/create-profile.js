const supabase = require('./config/supabase');

async function createProfile() {
  try {
    console.log('🔍 Verificando perfil del usuario...');
    
    // ID del usuario docente (extraído del token)
    const userId = 'e3064e9c-b775-44b5-bb95-1cf853e5817d';
    
    // Verificar si el perfil existe
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando perfil:', checkError);
      return;
    }
    
    if (existingProfile) {
      console.log('✅ Perfil ya existe:', existingProfile);
      return;
    }
    
    console.log('📝 Creando perfil...');
    
    // Crear el perfil
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        name: 'Marta',
        role: 'docente',
        education_level: 'secundario'
      }])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creando perfil:', createError);
      return;
    }
    
    console.log('✅ Perfil creado exitosamente:', newProfile);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createProfile();
