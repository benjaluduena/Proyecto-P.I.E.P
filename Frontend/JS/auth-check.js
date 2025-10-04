// Sistema simplificado de verificación de autenticación
class AuthChecker {
  constructor() {
    this.isChecking = false;
    this.checkPromise = null;
  }

  async performAuthCheck() {
    // Evitar múltiples verificaciones simultáneas
    if (this.isChecking) {
      return this.checkPromise;
    }

    this.isChecking = true;
    this.checkPromise = this._doAuthCheck();
    
    try {
      return await this.checkPromise;
    } finally {
      this.isChecking = false;
      this.checkPromise = null;
    }
  }

  async _doAuthCheck() {
    try {
      // Verificar si tenemos un authModule inicializado
      if (window.authModule) {
        // Usar el módulo centralizado de autenticación
        if (window.authModule.isAuthenticated()) {
          return true;
        }
      }

      // Fallback: verificar localStorage
      const storedSession = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
      if (storedSession) {
        try {
          const sessionData = JSON.parse(storedSession);
          const now = Math.floor(Date.now() / 1000);
          
          // Verificar si la sesión no ha expirado (con buffer de 5 minutos)
          if (sessionData.expires_at && sessionData.expires_at > now + 300) {
            return true;
          }
        } catch (parseError) {
          console.warn('Error parsing stored session:', parseError);
        }
      }

      // No hay sesión válida, limpiar y redirigir
      this._clearSessionAndRedirect();
      return false;

    } catch (error) {
      console.error('Error en verificación de autenticación:', error);
      this._clearSessionAndRedirect();
      return false;
    }
  }

  _clearSessionAndRedirect() {
    // Limpiar datos de sesión
    Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });

    // Redirigir a login si no estamos ya ahí
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login') && !currentPath.includes('landing')) {
      redirectToLogin();
    }
  }
}

// Instancia global del verificador de autenticación
const authChecker = new AuthChecker();

// Función de compatibilidad para código existente
async function performAuthCheck() {
  return await authChecker.performAuthCheck();
}

// Auto-verificación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Solo verificar si no estamos en páginas públicas
  const currentPath = window.location.pathname;
  const isPublicPage = currentPath.includes('login') || 
                      currentPath.includes('landing') || 
                      currentPath === '/' ||
                      currentPath.includes('index.html');
  
  console.log('AuthChecker: Página actual:', currentPath, 'Es pública:', isPublicPage);
  
  if (!isPublicPage) {
    console.log('AuthChecker: Iniciando verificación de autenticación');
    performAuthCheck();
  } else {
    console.log('AuthChecker: Saltando verificación en página pública');
  }
});

// Exponer para uso global
window.authChecker = authChecker; 