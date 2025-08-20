// Inicialización específica para login
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.waitForSupabase === 'function') {
    // Cargar dinámicamente login.js después de que supabase esté listo
    const script = document.createElement('script');
    script.src = '/JS/login.js';
    document.body.appendChild(script);
  } else {
    console.error('waitForSupabase no está disponible');
    // Intentar cargar después de un breve delay
    setTimeout(function() {
      if (typeof window.waitForSupabase === 'function') {
        const script = document.createElement('script');
        script.src = '/JS/login.js';
        document.body.appendChild(script);
      } else {
        console.error('No se pudo inicializar waitForSupabase');
      }
    }, 1000);
  }
});