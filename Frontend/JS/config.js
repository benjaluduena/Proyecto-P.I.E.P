// Configuración centralizada de rutas y constantes
const CONFIG = {
  // Rutas de la aplicación
  ROUTES: {
    LOGIN: '/login.html',
    HOME: '/index.html',
    ROOT: '/'
  },
  
  // URLs de la API
  API: {
    BASE_URL: 'http://localhost:5500',
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile'
  },
  
  // Claves de localStorage
  STORAGE_KEYS: {
    USER: 'user',
    SESSION: 'session',
    ACCESS_TOKEN: 'access_token'
  }
};

// Configuración de Supabase
const SUPABASE_CONFIG = {
  url: 'https://fqmpmseabhtvahzdavej.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxbXBtc2VhYmh0dmFoemRhdmVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4ODc1ODgsImV4cCI6MjA2NjQ2MzU4OH0.LT1av0qw6GR8DmQkSmH1OzFPONsT8yEZJ2lMI1ARohE'
};

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Función para verificar autenticación
function isAuthenticated() {
  const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
  return session !== null;
}

// Función para obtener el token de acceso
function getAccessToken() {
  const session = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
  if (session) {
    const sessionData = JSON.parse(session);
    return sessionData.access_token;
  }
  return null;
}

// Función para obtener headers de autorización
function getAuthHeaders() {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

// Función para redirigir a login
function redirectToLogin() {
  window.location.replace(CONFIG.ROUTES.LOGIN);
}

// Función para redirigir a home
function redirectToHome() {
  window.location.replace(CONFIG.ROUTES.HOME);
}

// Función para limpiar sesión
function clearSession() {
  Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// Función para hacer llamadas a la API con autenticación
async function apiCall(url, options = {}) {
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

  try {
    const response = await fetch(CONFIG.API.BASE_URL + url, config);
    
    if (response.status === 401) {
      // Token expirado o inválido
      clearSession();
      redirectToLogin();
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en llamada a API:', error);
    throw error;
  }
} 