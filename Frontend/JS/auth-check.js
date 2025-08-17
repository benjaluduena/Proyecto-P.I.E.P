// Verificar autenticación al cargar la página (evitar llamadas duplicadas)
let authCheckInProgress = false;

async function performAuthCheck() {
  if (authCheckInProgress) return;
  authCheckInProgress = true;

  try {
    // Primero verificar localStorage para evitar llamadas innecesarias
    const storedSession = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        const now = Math.floor(Date.now() / 1000);
        
        // Si la sesión no ha expirado, no necesitamos verificar con Supabase
        if (sessionData.expires_at && sessionData.expires_at > now + 300) { // 5 min buffer
          authCheckInProgress = false;
          return;
        }
      } catch (parseError) {
        // Si hay error parseando, continuar con verificación completa
      }
    }

    // Solo verificar con Supabase si no hay sesión válida en localStorage
    const supabase = await window.waitForSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // No hay sesión activa, redirigir a login
      clearSession();
      redirectToLogin();
      return;
    }

    // Verificar si el token no ha expirado
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      // Token expirado, limpiar sesión y redirigir
      clearSession();
      redirectToLogin();
      return;
    }

    // Sesión válida, actualizar localStorage
    localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));

  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    redirectToLogin();
  } finally {
    authCheckInProgress = false;
  }
}

document.addEventListener('DOMContentLoaded', performAuthCheck); 