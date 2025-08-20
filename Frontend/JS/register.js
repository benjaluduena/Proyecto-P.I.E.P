// Formulario de registro
const registerForm = document.getElementById('register-form');

registerForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const education_level = document.getElementById('education_level').value;
  const terms = document.getElementById('terms').checked;

  // Validaciones
  if (!name || !email || !password || !role) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }

  if (!terms) {
    alert('Debes aceptar los términos y condiciones para continuar.');
    return;
  }

  try {
    console.log('Iniciando registro...', { email, role, education_level });
    
    // Registrar con Supabase Auth
    const { data, error } = await supabase.auth.signUp({
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

    console.log('Respuesta de Supabase:', { data, error });

    if (error) {
      console.error('Error de Supabase:', error);
      
      // Si el error es por confirmación de email, mostrar mensaje de éxito
      if (error.message && (
        error.message.toLowerCase().includes('confirm') ||
        error.message.toLowerCase().includes('verification') ||
        error.message.toLowerCase().includes('email')
      )) {
        mostrarPantallaVerificaEmail();
        registerForm.reset();
        return;
      }
      
      // Mostrar el error específico
      alert(`Error al registrar: ${error.message}`);
      return;
    }

    // Si no hay error, verificar si el usuario fue creado
    if (data.user) {
      console.log('Usuario creado exitosamente:', data.user);
      
      // Siempre mostrar pantalla de verificación (Supabase requiere confirmación por defecto)
      mostrarPantallaVerificaEmail();
      registerForm.reset();
    } else {
      console.log('No se recibió usuario en la respuesta');
      alert('Error inesperado en el registro');
    }

  } catch (err) {
    console.error('Error en registro:', err);
    alert(`Error de red o del servidor: ${err.message}`);
  }
});

// Verificar si ya hay una sesión activa al cargar la página
window.addEventListener('load', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // Hay una sesión activa, redirigir al home
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
    redirectToHome();
  }
});

// Escuchar cambios en la autenticación
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Cambio de estado de auth:', event, session);
  
  if (event === 'SIGNED_IN' && session) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
  } else if (event === 'SIGNED_OUT') {
    clearSession();
  }
});

// Autenticación con Google
document.getElementById('google-auth-btn').addEventListener('click', async function () {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/index.html'
      }
    });
    
    if (error) {
      console.error('Error con Google:', error);
      alert(`Error al autenticar con Google: ${error.message}`);
    }
  } catch (err) {
    console.error('Error en OAuth Google:', err);
    alert('Error al conectar con Google');
  }
});

// Mostrar pantalla de verificación de email
function mostrarPantallaVerificaEmail() {
  document.querySelector('.form-container form').style.display = 'none';
  document.getElementById('verify-email-container').style.display = '';
}

// Evento para el botón 'Ya lo verifiqué'
document.getElementById('btn-verified-email').addEventListener('click', function() {
  document.querySelector('.form-container form').style.display = '';
  document.getElementById('verify-email-container').style.display = 'none';
  // Redirigir al login
  window.location.href = 'login.html';
});

// Función para redirigir al home
function redirectToHome() {
  window.location.href = 'index.html';
}

// Función para limpiar la sesión
function clearSession() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
}
