// Módulo de autenticación
export class AuthModule {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.currentUser = null;
    this.sessionData = null;
  }

  // Inicializar módulo de autenticación
  async initialize() {
    try {
      await this.loadStoredSession();
      this.setupAuthStateListener();
      return true;
    } catch (error) {
      console.error('Error inicializando auth:', error);
      return false;
    }
  }

  // Cargar sesión guardada
  async loadStoredSession() {
    try {
      const storedSession = localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION);
      if (storedSession) {
        this.sessionData = JSON.parse(storedSession);
      }

      const storedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }

      // Verificar con Supabase si la sesión sigue válida
      if (this.supabase) {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session && session.user) {
          this.updateStoredData(session.user, session);
        }
      }
    } catch (error) {
      console.warn('Error cargando sesión:', error);
      this.clearStoredData();
    }
  }

  // Configurar listener de cambios de autenticación
  setupAuthStateListener() {
    if (this.supabase?.auth?.onAuthStateChange) {
      this.supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
          this.updateStoredData(session.user, session);
          this.onAuthStateChanged?.(event, session);
        } else if (event === 'SIGNED_OUT') {
          this.clearStoredData();
          this.onAuthStateChanged?.(event, null);
        }
      });
    }
  }

  // Actualizar datos en localStorage
  updateStoredData(user, session) {
    try {
      this.currentUser = user;
      this.sessionData = session;
      localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
    } catch (error) {
      console.error('Error guardando datos de autenticación:', error);
    }
  }

  // Limpiar datos almacenados
  clearStoredData() {
    this.currentUser = null;
    this.sessionData = null;
    Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    return this.sessionData !== null && this.currentUser !== null;
  }

  // Obtener token de acceso
  getAccessToken() {
    return this.sessionData?.access_token || null;
  }

  // Obtener headers de autorización
  getAuthHeaders() {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Obtener usuario actual
  getCurrentUser() {
    return this.currentUser;
  }

  // Obtener nombre para mostrar
  getDisplayName() {
    if (!this.currentUser) return 'Usuario';
    
    const metaName = this.currentUser.user_metadata && 
      (this.currentUser.user_metadata.name || this.currentUser.user_metadata.full_name);
    const directName = this.currentUser.name;
    const fromEmail = this.currentUser.email ? 
      this.currentUser.email.split('@')[0] : null;
    
    return directName || metaName || fromEmail || 'Usuario';
  }

  // Obtener URL del avatar
  getAvatarUrl() {
    if (!this.currentUser) return null;
    
    return (
      this.currentUser.avatar_url ||
      (this.currentUser.user_metadata && 
        (this.currentUser.user_metadata.avatar_url || 
         this.currentUser.user_metadata.picture)) ||
      null
    );
  }

  // Cerrar sesión
  async logout() {
    try {
      console.log('Cerrando sesión...');
      
      // Cerrar sesión en Supabase
      if (this.supabase) {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
          console.error('Error al cerrar sesión en Supabase:', error);
        }
      }
      
      // Llamar al endpoint del servidor
      try {
        await fetch(CONFIG.API.LOGOUT, {
          method: 'POST',
          headers: this.getAuthHeaders()
        });
      } catch (apiError) {
        console.warn('Error cerrando sesión en servidor:', apiError);
      }
      
      // Limpiar datos locales
      this.clearStoredData();
      
      return { success: true };
    } catch (error) {
      console.error('Error en logout:', error);
      // Limpiar datos locales incluso si hay errores
      this.clearStoredData();
      return { success: false, error };
    }
  }

  // Redirigir a login
  redirectToLogin() {
    window.location.replace(CONFIG.ROUTES.LOGIN);
  }

  // Redirigir a home
  redirectToHome() {
    window.location.replace(CONFIG.ROUTES.HOME);
  }

  // Callback para cambios de estado (puede ser sobrescrito)
  onAuthStateChanged(event, session) {
    // Override en implementación específica
  }
}

// Instancia global (se inicializará cuando esté disponible Supabase)
export let authModule = null;

// Función para inicializar el módulo de autenticación
export async function initializeAuth(supabaseClient) {
  authModule = new AuthModule(supabaseClient);
  const success = await authModule.initialize();
  
  // Exponer globalmente para compatibilidad con código existente
  window.authModule = authModule;
  
  return success;
}