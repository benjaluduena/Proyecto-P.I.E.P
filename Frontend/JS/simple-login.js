// Login simplificado que funciona directamente
console.log('🔍 Cargando simple-login.js...');

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ DOM listo, inicializando login...');
  
  const loginForm = document.getElementById('login-form');
  console.log('📋 Formulario encontrado:', loginForm);
  
  if (!loginForm) {
    console.error('❌ No se encontró el formulario de login');
    return;
  }

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('🚀 Procesando login...');
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    console.log('📧 Email:', email);
    console.log('🔑 Password length:', password.length);
    
    if (!email || !password) {
      alert('Por favor completa todos los campos');
      return;
    }
    
    try {
      console.log('🔍 Esperando Supabase...');
      
      // Verificar que window.supabase esté disponible
      if (!window.supabase) {
        throw new Error('Supabase no está disponible');
      }
      
      console.log('✅ Supabase disponible, intentando login...');
      
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email: email,
        password: password
      });
      
      console.log('📝 Respuesta login:', { data, error });
      
      if (error) {
        alert('Error: ' + error.message);
        return;
      }
      
      // Tu implementación personalizada devuelve los tokens directamente en data
      if (data && data.access_token) {
        console.log('🎉 Login exitoso!');
        
        // Crear objeto de sesión compatible
        const session = {
          access_token: data.access_token,
          token_type: data.token_type,
          expires_in: data.expires_in,
          expires_at: data.expires_at,
          refresh_token: data.refresh_token,
          user: data.user
        };
        
        // Guardar en localStorage
        localStorage.setItem('session', JSON.stringify(session));
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        alert('Login exitoso! Redirigiendo...');
        
        // Redirigir al home
        window.location.href = 'index.html';
      } else {
        console.error('❌ Respuesta inesperada:', data);
        alert('Error: Respuesta de login inválida');
      }
      
    } catch (error) {
      console.error('❌ Error en login:', error);
      alert('Error: ' + error.message);
    }
  });
  
  // Google Auth
  const googleBtn = document.getElementById('google-auth-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', async function() {
      console.log('🔍 Intentando Google Auth...');
      
      try {
        if (!window.supabase) {
          throw new Error('Supabase no está disponible');
        }
        
        const { error } = await window.supabase.auth.signInWithOAuth('google', {
          redirectTo: window.location.origin + '/index.html'
        });
        
        if (error) {
          alert('Error Google Auth: ' + error.message);
        }
      } catch (error) {
        console.error('❌ Error Google Auth:', error);
        alert('Error: ' + error.message);
      }
    });
  }
  
  console.log('✅ Login inicializado correctamente');
});