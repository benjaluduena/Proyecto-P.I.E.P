// Configuración centralizada de rutas y constantes
const CONFIG = {
  // Rutas de la aplicación
  ROUTES: {
    LOGIN: '/login.html',
    HOME: '/index.html',
    ROOT: '/',
    PROFILE: '/perfil.html',
    UPDATE_PASSWORD: '/update-password.html'
  },
  
  // URLs de la API
  API: {
    BASE_URL: 'http://localhost:5500',
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    REFRESH: '/api/auth/refresh'
  },
  
  // Claves de localStorage
  STORAGE_KEYS: {
    USER: 'user',
    SESSION: 'session',
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    THEME: 'theme',
    LANGUAGE: 'language'
  },

  // Configuración de la aplicación
  APP: {
    NAME: 'StudyAI',
    VERSION: '1.0.0',
    DEBUG: false,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas en ms
    REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutos antes de expirar
  }
};

// Configuración de Supabase
const SUPABASE_CONFIG = {
  url: 'https://fqmpmseabhtvahzdavej.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE'
};

// Inicializar cliente de Supabase con manejo de errores
let supabase;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  } else {
    console.error('Supabase no está disponible');
    throw new Error('Supabase no está disponible');
  }
} catch (error) {
  console.error('Error al inicializar Supabase:', error);
  // Continuar sin Supabase, pero mostrar advertencia
}

// Función para verificar autenticación
function isAuthenticated() {
  try {
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return false;
    
    const sessionData = JSON.parse(session);
    const now = Date.now();
    
    // Verificar si la sesión ha expirado
    if (sessionData.expires_at && sessionData.expires_at * 1000 < now) {
      // Sesión expirada, limpiar
      clearSession();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    clearSession();
    return false;
  }
}

// Función para obtener el token de acceso
function getAccessToken() {
  try {
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return null;
    
    const sessionData = JSON.parse(session);
    return sessionData.access_token || null;
  } catch (error) {
    console.error('Error al obtener token de acceso:', error);
    return null;
  }
}

// Función para obtener el token de refresco
function getRefreshToken() {
  try {
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return null;
    
    const sessionData = JSON.parse(session);
    return sessionData.refresh_token || null;
  } catch (error) {
    console.error('Error al obtener token de refresco:', error);
    return null;
  }
}

// Función para obtener headers de autorización
function getAuthHeaders() {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    'X-Client-Version': CONFIG.APP.VERSION
  };
}

// Función para redirigir a login
function redirectToLogin() {
  try {
    // Guardar la URL actual para redirigir después del login
    if (window.location.pathname !== CONFIG.ROUTES.LOGIN) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
    }
    window.location.replace(CONFIG.ROUTES.LOGIN);
  } catch (error) {
    console.error('Error al redirigir a login:', error);
    window.location.href = CONFIG.ROUTES.LOGIN;
  }
}

// Función para redirigir a home
function redirectToHome() {
  try {
    window.location.replace(CONFIG.ROUTES.HOME);
  } catch (error) {
    console.error('Error al redirigir a home:', error);
    window.location.href = CONFIG.ROUTES.HOME;
  }
}

// Función para limpiar sesión
function clearSession() {
  try {
    Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
      if (key !== 'THEME' && key !== 'LANGUAGE') {
        localStorage.removeItem(key);
      }
    });
    
    // Limpiar también sessionStorage
    sessionStorage.removeItem('redirectAfterLogin');
    
    console.log('Sesión limpiada exitosamente');
  } catch (error) {
    console.error('Error al limpiar sesión:', error);
  }
}

// Función para hacer llamadas a la API con autenticación y reintentos
async function apiCall(url, options = {}) {
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      const headers = getAuthHeaders();
      
      // Si el body es FormData, no agregues Content-Type
      let finalHeaders = { ...headers, ...options.headers };
      if (options.body instanceof FormData) {
        delete finalHeaders['Content-Type'];
      }

      const config = {
        ...options,
        headers: finalHeaders
      };

      const response = await fetch(CONFIG.API.BASE_URL + url, config);
      
      if (response.status === 401) {
        // Token expirado o inválido, intentar renovar
        const refreshed = await refreshAccessToken();
        if (refreshed && retryCount < maxRetries - 1) {
          retryCount++;
          continue; // Reintentar con el nuevo token
        } else {
          // No se pudo renovar, limpiar sesión y redirigir
          clearSession();
          redirectToLogin();
          return null;
        }
      }
      
      if (response.status >= 500) {
        // Error del servidor, reintentar
        if (retryCount < maxRetries - 1) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Backoff exponencial
          continue;
        }
      }
      
      return response;
    } catch (error) {
      console.error(`Error en llamada a API (intento ${retryCount + 1}):`, error);
      
      if (retryCount < maxRetries - 1) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        continue;
      }
      
      throw error;
    }
  }
  
  throw new Error('Máximo número de reintentos alcanzado');
}

// Función para renovar el token de acceso
async function refreshAccessToken() {
  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    
    const response = await fetch(CONFIG.API.BASE_URL + CONFIG.API.REFRESH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Actualizar la sesión en localStorage
      const currentSession = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
      if (currentSession) {
        const sessionData = JSON.parse(currentSession);
        sessionData.access_token = data.access_token;
        sessionData.expires_at = data.expires_at;
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al renovar token:', error);
    return false;
  }
}

// Función para verificar si la sesión está por expirar
function isSessionExpiringSoon() {
  try {
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
    if (!session) return false;
    
    const sessionData = JSON.parse(session);
    const now = Date.now();
    const expiresAt = sessionData.expires_at * 1000;
    
    return (expiresAt - now) < CONFIG.APP.REFRESH_THRESHOLD;
  } catch (error) {
    console.error('Error al verificar expiración de sesión:', error);
    return false;
  }
}

// Función para obtener información del usuario actual
function getCurrentUser() {
  try {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return null;
  }
}

// Función para validar configuración
function validateConfig() {
  const errors = [];
  
  if (!SUPABASE_CONFIG.url) {
    errors.push('URL de Supabase no configurada');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    errors.push('Clave anónima de Supabase no configurada');
  }
  
  if (!CONFIG.API.BASE_URL) {
    errors.push('URL base de API no configurada');
  }
  
  if (errors.length > 0) {
    console.error('Errores de configuración:', errors);
    return false;
  }
  
  return true;
}

// Función para obtener configuración del tema
function getTheme() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.THEME) || 'light';
}

// Función para establecer tema
function setTheme(theme) {
  if (['light', 'dark'].includes(theme)) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Función para obtener idioma
function getLanguage() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.LANGUAGE) || 'es';
}

// Función para establecer idioma
function setLanguage(lang) {
  if (['es', 'en'].includes(lang)) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.LANGUAGE, lang);
    document.documentElement.setAttribute('lang', lang);
  }
}

// Inicializar configuración al cargar
document.addEventListener('DOMContentLoaded', () => {
  // Validar configuración
  if (!validateConfig()) {
    console.error('Configuración inválida. La aplicación puede no funcionar correctamente.');
  }
  
  // Aplicar tema guardado
  const savedTheme = getTheme();
  setTheme(savedTheme);
  
  // Aplicar idioma guardado
  const savedLanguage = getLanguage();
  setLanguage(savedLanguage);
  
  // Verificar si la sesión está por expirar
  if (isSessionExpiringSoon()) {
    console.warn('La sesión expirará pronto. Considera renovarla.');
  }
});

// Exportar configuración para uso en otros módulos
window.CONFIG = CONFIG;
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabase = supabase; 