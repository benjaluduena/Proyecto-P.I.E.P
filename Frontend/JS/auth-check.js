// Verificar autenticación al cargar la página
document.addEventListener('DOMContentLoaded', async function() {
  try {
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

    // Sesión válida, guardar en localStorage si no está
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION)) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
    }

  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    redirectToLogin();
  }
}); 