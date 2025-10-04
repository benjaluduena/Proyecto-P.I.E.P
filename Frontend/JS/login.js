// Formulario de login
const loginForm = document.getElementById('login-form');
const isRegister = false; // Esta es la página de login, no de registro

// Asegurarse de que el formulario esté disponible antes de agregar el listener
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (isRegister) {
    // Registro con Supabase Auth
    const name = document.getElementById('name').value.trim();
    const role = document.getElementById('role').value;
    const education_level = document.getElementById('education_level').value;

    if (!name || !email || !password || !role) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }
    if (!role) {
      alert('Por favor selecciona un rol antes de registrarte.');
      return;
    }

    try {
      // Registrar con Supabase Auth
      const supabase = await window.waitForSupabase();
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

      if (error) {
        // Si el error es por confirmación de email, mostrar mensaje de éxito
        if (error.message && (
          error.message.toLowerCase().includes('confirm') ||
          error.message.toLowerCase().includes('verification') ||
          error.message.toLowerCase().includes('email')
        )) {
          mostrarPantallaVerificaEmail();
          authForm.reset();
          return;
        }
        // Si es otro error, mostrarlo normalmente
        alert(error.message || 'Error al registrar usuario');
        return;
      }

      // Si no hay error, verificar si el usuario fue creado pero requiere confirmación
      if (data.user && !data.session) {
        // Usuario creado pero requiere confirmación de email
        mostrarPantallaVerificaEmail();
        loginForm.reset();
        return;
      }

      if (data.user && data.session) {
        // Usuario creado y confirmado automáticamente (poco común)
        // Crear perfil en el backend
        const response = await fetch(CONFIG.API.BASE_URL + CONFIG.API.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, education_level })
        });

        if (response.ok) {
          // Guardar sesión y redirigir
          localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(data.session));
          localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.user));
          redirectToHome();
        } else {
          // Si falla el backend, mostrar mensaje pero NO eliminar el usuario de auth
          const errorData = await response.json();
          alert(errorData.error || 'Error al completar el registro');
        }
      } else if (data.user === null && data.session === null && !error) {
        // Caso: usuario creado pero requiere confirmación de email
        mostrarPantallaVerificaEmail();
        loginForm.reset();
      }
    } catch (err) {
      console.error('Error en registro:', err);
      // Verificar si el error es por confirmación de email
      if (err.message && (
        err.message.toLowerCase().includes('confirm') ||
        err.message.toLowerCase().includes('verification') ||
        err.message.toLowerCase().includes('email')
      )) {
        mostrarPantallaVerificaEmail();
        loginForm.reset();
        return;
      }
      alert('Error de red o del servidor');
    }
  } else {
    // Login con Supabase Auth
    try {
      const supabase = await window.waitForSupabase();
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
        
        console.log('Login exitoso, redirigiendo...');
        
        // Redirigir inmediatamente - el perfil se cargará en el home
        setTimeout(() => {
          redirectToHome();
        }, 100);
      }
    } catch (err) {
      console.error('Error en login:', err);
      if (err.message && err.message.includes('Supabase')) {
        alert('Error de configuración. Por favor, intenta más tarde o contacta al soporte.');
      } else {
        alert('Error de red o del servidor');
      }
    }
  }
  });
} else {
  console.error('Formulario de login no encontrado');
}

// Función waitForSupabase se carga desde supabase-init.js

// Mostrar pantalla de verificación de email
function mostrarPantallaVerificaEmail() {
  document.querySelector('.form-container form').style.display = 'none';
  document.getElementById('verify-email-container').style.display = '';
}

// Función para mostrar el formulario de login
function showLogin() {
  document.querySelector('.form-container form').style.display = '';
  document.getElementById('verify-email-container').style.display = 'none';
}

// Verificar si ya hay una sesión activa al cargar la página (solo para login)
let sessionCheckPerformed = false;

async function checkExistingSession() {
  if (sessionCheckPerformed) return;
  sessionCheckPerformed = true;

  try {
    // Solo verificar localStorage para evitar llamadas innecesarias
    const storedSession = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        const now = Math.floor(Date.now() / 1000);
        
        // Si la sesión no ha expirado, redirigir directamente
        if (sessionData.expires_at && sessionData.expires_at > now + 300) { // buffer de 5 min
          console.log('Sesión válida encontrada, redirigiendo...');
          redirectToHome();
          return;
        } else {
          // Sesión expirada, limpiar
          clearSession();
        }
      } catch (parseError) {
        clearSession();
      }
    }
    
    // No verificar con Supabase aquí para evitar bucles
    console.log('No se encontró sesión válida, mostrando login');
  } catch (error) {
    console.error('Error verificando sesión:', error);
  }
}

// Escuchar cambios en la autenticación (solo para login)
async function setupAuthStateListenerForLogin() {
  try {
    const supabase = await window.waitForSupabase();
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
        redirectToHome();
      } else if (event === 'SIGNED_OUT') {
        clearSession();
      }
    });
  } catch (error) {
    console.error('Error configurando listener de auth:', error);
  }
}

// Solo configurar en login.html
if (window.location.pathname.includes('login.html')) {
  // TEMPORALMENTE DESHABILITADO para evitar bucles
  // window.addEventListener('load', checkExistingSession);
  document.addEventListener('supabaseReady', setupAuthStateListenerForLogin);
}

const googleAuthBtn = document.getElementById('google-auth-btn');
if (googleAuthBtn) {
  googleAuthBtn.addEventListener('click', async function () {
  try {
    const supabase = await window.waitForSupabase();
    const { error } = await supabase.auth.signInWithOAuth('google', {
      redirectTo: window.location.origin + '/home'
    });
    if (error) {
      alert('Error al autenticar con Google');
    }
  } catch (err) {
    console.error('Error en Google Auth:', err);
    alert('Error al inicializar autenticación con Google');
  }
  });
} else {
  console.error('Botón de Google Auth no encontrado');
}

// Función para redirigir al home
function redirectToHome() {
  window.location.href = 'index.html';
}

// Evento para el botón 'Ya lo verifiqué'
const btnVerifiedEmail = document.getElementById('btn-verified-email');
if (btnVerifiedEmail) {
  btnVerifiedEmail.addEventListener('click', function() {
    document.querySelector('.form-container form').style.display = '';
    document.getElementById('verify-email-container').style.display = 'none';
    showLogin();
  });
}

// Detectar parámetro URL para forzar limpieza de sesión
if (window.location.search.includes('clear=true')) {
  console.log('Limpiando sesión por parámetro URL');
  localStorage.clear();
  sessionStorage.clear();
  
  // Limpiar URL sin recargar
  const url = new URL(window.location);
  url.searchParams.delete('clear');
  window.history.replaceState({}, '', url);
  
  alert('Sesión limpiada. Puedes iniciar sesión normalmente.');
} 