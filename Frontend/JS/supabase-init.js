// Inicialización de Supabase para páginas que no usan el sistema modular
let supabase;
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
      console.log('Inicializando Supabase para login...');
      
      // Intentar cargar configuración del servidor
      let config;
      try {
        const response = await fetch('/api/config/supabase');
        if (response.ok) {
          config = await response.json();
          console.log('Configuración cargada desde servidor');
        } else {
          throw new Error('No se pudo cargar desde servidor');
        }
      } catch (error) {
        console.error('Error crítico: No se pudo cargar configuración del servidor:', error.message);
        throw new Error('Configuración de Supabase no disponible. Contacte al administrador.');
      }
      
      if (config.url && config.anonKey) {
        supabase = window.supabase.createClient(config.url, config.anonKey);
        window.supabase = supabase; // Exponer globalmente para compatibilidad
        console.log('✅ Supabase inicializado correctamente');
        initializationCompleted = true;
        
        // Disparar evento personalizado para notificar que Supabase está listo
        document.dispatchEvent(new CustomEvent('supabaseReady', { detail: supabase }));
      } else {
        throw new Error('Configuración de Supabase incompleta');
      }
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
    if (initializationCompleted && window.supabase && typeof window.supabase.auth !== 'undefined') {
      resolve(window.supabase);
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