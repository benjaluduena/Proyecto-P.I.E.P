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
    REGISTER: '/api/auth/register'
  },
  
  // Claves de localStorage
  STORAGE_KEYS: {
    USER: 'user',
    EMAIL: 'email',
    PASSWORD: 'password'
  }
};

// Función para verificar autenticación
function isAuthenticated() {
  return localStorage.getItem(CONFIG.STORAGE_KEYS.USER) !== null;
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