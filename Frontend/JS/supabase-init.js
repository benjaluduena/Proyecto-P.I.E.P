// Inicialización de Supabase para páginas que no usan el sistema modular
let initializationInProgress = false;
let initializationCompleted = false;

async function initializeSupabaseForLogin() {
  // Evitar múltiples inicializaciones simultáneas
  if (initializationInProgress || initializationCompleted) {
    return;
  }
  initializationInProgress = true;
  try {
    if (window.supabase) {
      console.log('Supabase personalizado encontrado...');
      
      // Usar directamente el cliente personalizado de supabase.js
      window.supabaseClient = window.supabase;
      console.log('✅ Supabase inicializado correctamente');
      initializationCompleted = true;
      
      // Disparar evento personalizado para notificar que Supabase está listo
      document.dispatchEvent(new CustomEvent('supabaseReady', { detail: window.supabaseClient }));
    } else {
      throw new Error('Librería de Supabase no disponible');
    }
  } catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    
    // No hay fallback - mostrar error crítico
    console.error('💥 Error crítico inicializando Supabase:', error);
    document.dispatchEvent(new CustomEvent('supabaseError', { detail: error }));
  } finally {
    initializationInProgress = false;
  }
}

// Función para esperar a que Supabase esté disponible
function waitForSupabase() {
  return new Promise((resolve, reject) => {
    // Si ya está inicializado y disponible
    if (initializationCompleted && window.supabaseClient && typeof window.supabaseClient.auth !== 'undefined') {
      resolve(window.supabaseClient);
      return;
    }
    
    // Si está en proceso de inicialización o no ha comenzado
    if (!initializationCompleted) {
      // Escuchar evento de inicialización
      const onReady = (event) => {
        document.removeEventListener('supabaseReady', onReady);
        document.removeEventListener('supabaseError', onError);
        resolve(event.detail);
      };
      
      const onError = (event) => {
        document.removeEventListener('supabaseReady', onReady);
        document.removeEventListener('supabaseError', onError);
        reject(event.detail);
      };
      
      document.addEventListener('supabaseReady', onReady);
      document.addEventListener('supabaseError', onError);
      
      // Timeout después de 10 segundos
      setTimeout(() => {
        document.removeEventListener('supabaseReady', onReady);
        document.removeEventListener('supabaseError', onError);
        reject(new Error('Timeout esperando inicialización de Supabase'));
      }, 10000);
    } else {
      // Ya está completada pero no disponible - algo salió mal
      reject(new Error('Supabase no disponible después de la inicialización'));
    }
  });
}

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSupabaseForLogin);
} else {
  initializeSupabaseForLogin();
}

// Exponer función globalmente para otros scripts
window.waitForSupabase = waitForSupabase;