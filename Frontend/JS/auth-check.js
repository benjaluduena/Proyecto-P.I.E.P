// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Mostrar indicador de carga
    showAuthLoadingIndicator();
    
    // Verificar si hay una sesión activa en Supabase
    let { data: { session } } = await supabase.auth.getSession();
    
    // Si venimos del callback OAuth, puede tardar un instante en poblar la sesión
    if (!session && window.location.search.includes('code=')) {
      // esperar brevemente y reintentar
      for (let i = 0; i < 10 && !session; i++) {
        await new Promise(r => setTimeout(r, 200));
        const res = await supabase.auth.getSession();
        session = res.data.session;
      }
    }
    
    if (!session) {
      // No hay sesión activa, redirigir a login
      hideAuthLoadingIndicator();
      redirectToLogin();
      return;
    }

    // Verificar si el token no ha expirado
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      // Token expirado, limpiar sesión y redirigir
      console.warn('Token expirado, limpiando sesión');
      clearSession();
      hideAuthLoadingIndicator();
      redirectToLogin();
      return;
    }

    // Verificar que el usuario tenga los campos mínimos requeridos
    if (!session.user || !session.user.id) {
      console.error('Sesión inválida: usuario no encontrado');
      clearSession();
      hideAuthLoadingIndicator();
      redirectToLogin();
      return;
    }

    // Sesión válida, guardar en localStorage si no está
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION)) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
      } catch (storageError) {
        console.warn('Error al guardar en localStorage:', storageError);
        // Continuar aunque falle el localStorage
      }
    }

    // Verificar que la sesión sea reciente (menos de 24 horas)
    const sessionAge = now - (session.created_at || now);
    const maxSessionAge = 24 * 60 * 60; // 24 horas en segundos
    
    if (sessionAge > maxSessionAge) {
      console.warn('Sesión muy antigua, renovando...');
      try {
        const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
        if (error) {
          throw error;
        }
        if (newSession) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(newSession));
          localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(newSession.user));
        }
      } catch (refreshError) {
        console.warn('Error al renovar sesión:', refreshError);
        // Continuar con la sesión actual
      }
    }

    hideAuthLoadingIndicator();
    console.log('Autenticación verificada exitosamente');

  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    hideAuthLoadingIndicator();
    
    // Mostrar mensaje de error más amigable
    if (error.message && error.message.includes('fetch')) {
      showAuthError('Error de conexión. Verifica tu conexión a internet.');
    } else {
      showAuthError('Error al verificar la autenticación. Redirigiendo al login...');
    }
    
    // Limpiar sesión corrupta
    clearSession();
    
    // Redirigir después de un delay para que el usuario vea el mensaje
    setTimeout(() => {
      redirectToLogin();
    }, 2000);
  }
});

// Función para mostrar indicador de carga de autenticación
function showAuthLoadingIndicator() {
  let loader = document.getElementById('authLoader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'authLoader';
    loader.className = 'auth-loader';
    loader.innerHTML = `
      <div class="auth-loader-content">
        <div class="auth-loader-spinner"></div>
        <p>Verificando autenticación...</p>
      </div>
    `;
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

// Función para ocultar indicador de carga de autenticación
function hideAuthLoadingIndicator() {
  const loader = document.getElementById('authLoader');
  if (loader) {
    loader.style.display = 'none';
  }
}

// Función para mostrar error de autenticación
function showAuthError(message) {
  let errorDiv = document.getElementById('authError');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'authError';
    errorDiv.className = 'auth-error';
    document.body.appendChild(errorDiv);
  }
  
  errorDiv.innerHTML = `
    <div class="auth-error-content">
      <div class="auth-error-icon">⚠️</div>
      <div class="auth-error-text">${message}</div>
    </div>
  `;
  errorDiv.style.display = 'block';
  
  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    if (errorDiv && errorDiv.style.display !== 'none') {
      errorDiv.style.display = 'none';
    }
  }, 5000);
}

// Función para verificar si la sesión está activa (para uso en otros módulos)
function isSessionActive() {
  try {
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return false;
    
    const sessionData = JSON.parse(session);
    const now = Math.floor(Date.now() / 1000);
    
    return sessionData.expires_at && sessionData.expires_at > now;
  } catch (error) {
    console.error('Error al verificar sesión activa:', error);
    return false;
  }
}

// Función para renovar sesión manualmente
async function refreshSession() {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      throw error;
    }
    
    if (session) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al renovar sesión:', error);
    return false;
  }
}

// Exportar funciones para uso en otros módulos
window.authUtils = {
  isSessionActive,
  refreshSession,
  showAuthError
}; 