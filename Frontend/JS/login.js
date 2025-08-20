// Formulario de login
const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    // Login con Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message || 'Error al iniciar sesión');
      return;
    }

    if (data.user && data.session) {
      // Guardar sesión en localStorage
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(data.session));
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.user));
      
      // Obtener perfil del backend
      try {
        const profileResponse = await apiCall(CONFIG.API.PROFILE);
        if (profileResponse && profileResponse.ok) {
          const profileData = await profileResponse.json();
          localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(profileData.user));
        }
      } catch (profileError) {
        console.warn('No se pudo obtener el perfil:', profileError);
      }

      // Redirigir al home
      redirectToHome();
    }
  } catch (err) {
    console.error('Error en login:', err);
    alert('Error de red o del servidor');
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
  if (event === 'SIGNED_IN' && session) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
  } else if (event === 'SIGNED_OUT') {
    clearSession();
  }
});

// Autenticación con Google
document.getElementById('google-auth-btn').addEventListener('click', async function () {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html'
    }
  });
  if (error) {
    alert('Error al autenticar con Google');
  }
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