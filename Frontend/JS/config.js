// Configuración centralizada de rutas y constantes
if (typeof CONFIG === 'undefined') {
  window.CONFIG = {
  // Rutas de la aplicación
  ROUTES: {
    LOGIN: '/login.html',
    HOME: '/home',
    ROOT: '/'
  },
  
  // URLs de la API
  API: {
    // Usar el mismo origen del servidor que sirve el frontend
    BASE_URL: window.location.origin,
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    CREATE_SUBSCRIPTION: '/api/payments/mp/create-subscription'
  },
  
  // Claves de localStorage
  STORAGE_KEYS: {
    USER: 'user',
    SESSION: 'session',
    ACCESS_TOKEN: 'access_token'
  }
};
}

// Configuración de Supabase - obtenida del servidor
let SUPABASE_CONFIG = {
  url: null,
  anonKey: null
};

// Función para obtener configuración del servidor
async function loadSupabaseConfig() {
  try {
    const response = await fetch('/api/config/supabase');
    if (response.ok) {
      SUPABASE_CONFIG = await response.json();
    } else {
      throw new Error('No se pudo obtener configuración del servidor');
    }
  } catch (error) {
    console.error('Error crítico: No se pudo cargar configuración de Supabase del servidor');
    throw new Error('Configuración de Supabase no disponible. Contacte al administrador.');
  }
}

// El cliente de Supabase ahora se inicializa en app.js
// Esta configuración se mantiene para compatibilidad con código legacy

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
  // Sólo incluir Authorization si hay token
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// Variables para evitar múltiples redirecciones
let redirectInProgress = false;
let redirectHistory = [];

// Función para detectar bucles de redirección
function detectRedirectLoop(targetUrl) {
  const now = Date.now();
  const currentPath = window.location.pathname;
  
  // Limpiar historial antiguo (más de 10 segundos)
  redirectHistory = redirectHistory.filter(item => now - item.timestamp < 10000);
  
  // Agregar redirección actual
  redirectHistory.push({ from: currentPath, to: targetUrl, timestamp: now });
  
  // Detectar si hay más de 3 redirecciones en los últimos 5 segundos
  const recentRedirects = redirectHistory.filter(item => now - item.timestamp < 5000);
  if (recentRedirects.length > 3) {
    console.error('🚨 Bucle de redirección detectado!', redirectHistory);
    alert('Error: Bucle de redirección detectado. Contacte al soporte.');
    return true;
  }
  
  return false;
}

// Función para redirigir a login
function redirectToLogin() {
  if (redirectInProgress) return;
  
  const targetUrl = CONFIG.ROUTES.LOGIN;
  if (detectRedirectLoop(targetUrl)) return;
  
  redirectInProgress = true;
  console.log('Redirigiendo a login...');
  
  setTimeout(() => {
    window.location.replace(targetUrl);
  }, 100);
}

// Función para redirigir a home
function redirectToHome() {
  if (redirectInProgress) return;
  
  const targetUrl = CONFIG.ROUTES.HOME;
  if (detectRedirectLoop(targetUrl)) return;
  
  redirectInProgress = true;
  console.log('Redirigiendo a home...');
  
  setTimeout(() => {
    window.location.replace(targetUrl);
  }, 100);
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

// Iniciar suscripción de Mercado Pago desde el frontend
async function startSubscription(options = {}) {
  const payload = {};
  if (options.reason) payload.reason = String(options.reason);
  if (options.amount != null) payload.amount = Number(options.amount);
  if (options.currency) payload.currency = String(options.currency);
  if (options.frequency) payload.frequency = Number(options.frequency);
  if (options.frequencyType) payload.frequencyType = String(options.frequencyType);
  if (options.plan) payload.plan = String(options.plan); // Agregar plan al payload
  
  // Usar la URL del perfil como backUrl por defecto
  const defaultBackUrl = `${window.location.origin}/perfil.html`;
  payload.backUrl = defaultBackUrl;
  
  const resp = await apiCall(CONFIG.API.CREATE_SUBSCRIPTION, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!resp || !resp.ok) {
    throw new Error('No se pudo iniciar la suscripción');
  }
  const data = await resp.json();
  if (data && (data.init_point || data.sandbox_init_point)) {
    const url = data.init_point || data.sandbox_init_point;
    window.location.href = url;
  }
  return data;
}

// Exponer helper global simple
window.PIEP = window.PIEP || {};
window.PIEP.startSubscription = startSubscription;