// Alternancia entre Iniciar Sesión y Registrarse
const loginToggle = document.getElementById('login-toggle');
const registerToggle = document.getElementById('register-toggle');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');

const nameGroup = document.getElementById('name-group');
const roleGroup = document.getElementById('role-group');
const educationGroup = document.getElementById('education-group');
const loginExtra = document.getElementById('login-extra');

const authForm = document.getElementById('auth-form');

function showLogin() {
  loginToggle.classList.add('active');
  registerToggle.classList.remove('active');
  formTitle.textContent = 'Iniciar Sesión';
  submitBtn.textContent = 'Entrar';
  nameGroup.classList.add('hidden');
  roleGroup.classList.add('hidden');
  educationGroup.classList.add('hidden');
  loginExtra.style.display = '';
  document.getElementById('google-btn-text').textContent = 'Iniciar con Google';
}

function showRegister() {
  loginToggle.classList.remove('active');
  registerToggle.classList.add('active');
  formTitle.textContent = 'Registrarse';
  submitBtn.textContent = 'Registrarse';
  nameGroup.classList.remove('hidden');
  roleGroup.classList.remove('hidden');
  educationGroup.classList.remove('hidden');
  loginExtra.style.display = 'none';
  document.getElementById('google-btn-text').textContent = 'Registrarte con Google';
}

loginToggle.addEventListener('click', showLogin);
registerToggle.addEventListener('click', showRegister);

// Por defecto, mostrar login
showLogin();

authForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  // Detectar si estamos en modo registro o login
  const isRegister = registerToggle.classList.contains('active');

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
        authForm.reset();
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
        authForm.reset();
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
        authForm.reset();
        return;
      }
      alert('Error de red o del servidor');
    }
  } else {
    // Login con Supabase Auth
    try {
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

document.getElementById('google-auth-btn').addEventListener('click', async function () {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/Frontend/index.html'
    }
  });
  if (error) {
    alert('Error al autenticar con Google');
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
  showLogin();
}); 