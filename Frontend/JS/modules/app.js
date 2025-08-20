// Módulo principal de la aplicación
import { initializeAuth, authModule } from './auth.js';
import { createApiModule } from './api.js';
import { uiModule } from './ui.js';
import { createUploadModule } from './upload.js';

class App {
  constructor() {
    this.authModule = null;
    this.apiModule = null;
    this.uiModule = uiModule;
    this.uploadModule = null;
    this.supabase = null;
    this.isInitialized = false;
  }

  // Inicializar aplicación
  async initialize() {
    try {
      console.log('Inicializando aplicación...');

      // 1. Inicializar UI
      this.uiModule.initialize();

      // 2. Inicializar Supabase
      await this.initializeSupabase();

      // 3. Inicializar autenticación
      await this.initializeAuth();

      // 4. Inicializar API
      this.initializeApi();

      // 5. Inicializar módulos específicos
      this.initializeModules();

      // 6. Configurar navegación
      this.setupNavigation();

      // 7. Verificar autenticación inicial
      this.checkInitialAuth();

      this.isInitialized = true;
      console.log('Aplicación inicializada correctamente');

      return true;
    } catch (error) {
      console.error('Error inicializando aplicación:', error);
      this.uiModule.showNotification('Error al inicializar la aplicación', 'error');
      return false;
    }
  }

  // Cargar configuración de Supabase (no necesario para implementación personalizada)
  // async loadSupabaseConfig() {
  //   // Tu implementación personalizada no requiere configuración del servidor
  // }

  // Inicializar cliente de Supabase
  async initializeSupabase() {
    if (window.supabase) {
      // Tu implementación personalizada ya está lista, solo asignarla
      this.supabase = window.supabase;
      
      // Crear función helper para otros scripts
      window.waitForSupabase = () => Promise.resolve(this.supabase);
      
      console.log('✅ Supabase personalizado inicializado correctamente desde app.js');
    } else {
      throw new Error('Supabase no está disponible');
    }
  }

  // Inicializar autenticación
  async initializeAuth() {
    const success = await initializeAuth(this.supabase);
    if (success) {
      this.authModule = authModule;
      
      // Configurar callback de cambios de estado
      this.authModule.onAuthStateChanged = (event, session) => {
        this.handleAuthStateChange(event, session);
      };
    } else {
      throw new Error('Error inicializando autenticación');
    }
  }

  // Inicializar API
  initializeApi() {
    this.apiModule = createApiModule(this.authModule);
    window.apiModule = this.apiModule; // Compatibilidad global
  }

  // Inicializar módulos específicos
  initializeModules() {
    // Módulo de upload (solo en páginas que lo necesiten)
    if (document.getElementById('uploadBox')) {
      this.uploadModule = createUploadModule(this.apiModule, this.uiModule);
      this.uploadModule.initialize();
    }

    // Otros módulos se pueden agregar aquí
    this.initializeSubscriptions();
    this.initializeProfile();
  }

  // Inicializar funcionalidad de suscripciones
  initializeSubscriptions() {
    const btnCambiarPlan = document.getElementById('btnCambiarPlan');
    if (btnCambiarPlan) {
      btnCambiarPlan.addEventListener('click', async () => {
        try {
          await this.startSubscription({ amount: 1500, currency: 'ARS' });
        } catch (error) {
          this.uiModule.showNotification('No se pudo iniciar el cambio de plan', 'error');
        }
      });
    }
  }

  // Inicializar funcionalidad de perfil
  initializeProfile() {
    // Rellenar información del usuario
    this.populateUserInfo();

    // Configurar dropdown de perfil
    this.setupProfileDropdown();
  }

  // Configurar navegación
  setupNavigation() {
    // Configurar botones del sidebar
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const action = this.getMenuAction(item);
        if (action) {
          this.handleMenuAction(action, e);
        }
      });
    });

    // Configurar logout
    this.setupLogoutButtons();
  }

  // Configurar botones de logout
  setupLogoutButtons() {
    const logoutButtons = document.querySelectorAll('[data-action="logout"], #btnCerrarSesion');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', () => this.logout());
    });

    // Buscar botón por icono de logout
    const sidebarButtons = document.querySelectorAll('.sidebar-footer .menu-item');
    sidebarButtons.forEach(btn => {
      const svg = btn.querySelector('use');
      if (svg && svg.getAttribute('href')?.includes('icon-logout')) {
        btn.addEventListener('click', () => this.logout());
      }
    });
  }

  // Obtener acción del menú
  getMenuAction(menuItem) {
    // Implementar lógica para determinar la acción basada en el elemento
    const text = menuItem.textContent.trim().toLowerCase();
    const onclick = menuItem.getAttribute('onclick');
    
    if (onclick) {
      const match = onclick.match(/cargarSeccion\('(.+)'\)/);
      if (match) return { type: 'loadSection', section: match[1] };
    }
    
    if (text.includes('calendario')) return { type: 'showCalendar' };
    if (text.includes('historial')) return { type: 'showHistory' };
    if (text.includes('ayuda')) return { type: 'showHelp' };
    
    return null;
  }

  // Manejar acción del menú
  handleMenuAction(action, event) {
    event.preventDefault();
    
    switch (action.type) {
      case 'loadSection':
        this.loadSection(action.section);
        break;
      case 'showCalendar':
        this.showCalendar();
        break;
      case 'showHistory':
        this.showHistory();
        break;
      case 'showHelp':
        this.showHelp();
        break;
    }
  }

  // Cargar sección
  async loadSection(sectionName) {
    try {
      this.uiModule.showLoading('Cargando sección...');
      
      const response = await fetch(`Pages/${sectionName}.html`);
      const html = await response.text();
      
      const contenedor = document.getElementById('contenido');
      if (contenedor) {
        contenedor.innerHTML = html;
        
        // Cargar script específico de la sección
        await this.loadSectionScript(sectionName);
        
        // Actualizar menú activo
        this.updateActiveMenu(sectionName);
      }
    } catch (error) {
      console.error('Error cargando sección:', error);
      this.uiModule.showNotification('Error al cargar la sección', 'error');
    } finally {
      this.uiModule.hideLoading();
    }
  }

  // Cargar script de sección con caché optimizado
  loadSectionScript(sectionName) {
    return new Promise((resolve) => {
      // Cache de scripts cargados
      if (!window.loadedScripts) {
        window.loadedScripts = new Set();
      }

      // Si ya está cargado, resolver inmediatamente
      if (window.loadedScripts.has(sectionName)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `/JS/${sectionName}.js`;
      script.type = 'text/javascript';
      script.defer = true;
      
      script.onload = () => {
        window.loadedScripts.add(sectionName);
        resolve();
      };
      
      script.onerror = (error) => {
        console.warn(`Script ${sectionName}.js no pudo cargarse:`, error);
        resolve(); // Continuar aunque el script falle
      };
      
      document.head.appendChild(script);
    });
  }

  // Actualizar menú activo
  updateActiveMenu(sectionName) {
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[onclick*="${sectionName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  // Configurar dropdown de perfil
  setupProfileDropdown() {
    const userProfile = document.getElementById('userProfile');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (!userProfile || !profileDropdown) return;

    let isDropdownOpen = false;

    const toggleDropdown = () => {
      isDropdownOpen = !isDropdownOpen;
      profileDropdown.classList.toggle('show', isDropdownOpen);
    };

    const closeDropdown = () => {
      isDropdownOpen = false;
      profileDropdown.classList.remove('show');
    };

    userProfile.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    document.addEventListener('click', (e) => {
      if (!userProfile.contains(e.target)) {
        closeDropdown();
      }
    });

    // Configurar botón de ajustes
    const btnAjustes = document.getElementById('btnAjustes');
    if (btnAjustes) {
      btnAjustes.addEventListener('click', () => {
        closeDropdown();
        window.location.href = '/perfil.html';
      });
    }
  }

  // Rellenar información del usuario
  async populateUserInfo() {
    const nameEl = document.querySelector('.user-info .user-name');
    const emailEl = document.querySelector('.user-info .user-email');
    const avatarImg = document.querySelector('#userAvatar img');

    if (!nameEl || !emailEl) return;

    if (this.authModule && this.authModule.isAuthenticated()) {
      const user = this.authModule.getCurrentUser();
      
      if (nameEl) nameEl.textContent = this.authModule.getDisplayName();
      if (emailEl && user?.email) emailEl.textContent = user.email;
      
      if (avatarImg) {
        const avatarUrl = this.authModule.getAvatarUrl();
        this.setAvatarImage(avatarImg, avatarUrl);
      }
    }
  }

  // Configurar imagen de avatar
  setAvatarImage(imgEl, url) {
    if (!imgEl) return;
    
    const defaultAvatar = '/Assets/Imagenes/usuario-sin-foto.png';
    
    imgEl.onerror = () => {
      imgEl.onerror = null;
      imgEl.src = defaultAvatar;
    };
    
    imgEl.src = url || defaultAvatar;
  }

  // Manejar cambios de estado de autenticación
  handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event);
    
    switch (event) {
      case 'SIGNED_IN':
        this.populateUserInfo();
        break;
      case 'SIGNED_OUT':
        this.handleSignOut();
        break;
    }
  }

  // Manejar cierre de sesión
  handleSignOut() {
    // Limpiar UI específica
    this.clearUserInfo();
    
    // Redirigir si no estamos en landing o login
    const currentPath = window.location.pathname;
    if (!currentPath.includes('landing') && !currentPath.includes('login')) {
      this.authModule.redirectToLogin();
    }
  }

  // Limpiar información del usuario
  clearUserInfo() {
    const nameEl = document.querySelector('.user-info .user-name');
    const emailEl = document.querySelector('.user-info .user-email');
    const avatarImg = document.querySelector('#userAvatar img');

    if (nameEl) nameEl.textContent = 'Usuario';
    if (emailEl) emailEl.textContent = '';
    if (avatarImg) {
      this.setAvatarImage(avatarImg, null);
    }
  }

  // Verificar autenticación inicial
  checkInitialAuth() {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('login') || 
                      currentPath.includes('landing') ||
                      currentPath === '/';
    
    console.log('CheckInitialAuth:', { currentPath, isAuthPage });
    
    if (isAuthPage) {
      console.log('En página de auth, saltando verificación');
      return;
    }
    
    // Verificar localStorage primero antes de usar authModule
    const storedSession = localStorage.getItem('session');
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        const now = Math.floor(Date.now() / 1000);
        
        if (sessionData.expires_at && sessionData.expires_at > now + 300) {
          console.log('Sesión válida encontrada en localStorage');
          return; // Sesión válida, no redirigir
        }
      } catch (error) {
        console.warn('Error parseando sesión stored:', error);
      }
    }
    
    // Solo como último recurso, verificar con authModule
    if (!this.authModule.isAuthenticated()) {
      console.log('No hay autenticación válida, redirigiendo a login');
      setTimeout(() => {
        this.authModule.redirectToLogin();
      }, 500); // Pequeño delay para evitar condiciones de carrera
    }
  }

  // Cerrar sesión
  async logout() {
    try {
      this.uiModule.showLoading('Cerrando sesión...');
      
      const result = await this.authModule.logout();
      
      if (result.success) {
        this.uiModule.showNotification('Sesión cerrada correctamente', 'success');
      }
      
      // Siempre redirigir a login después del logout
      setTimeout(() => {
        this.authModule.redirectToLogin();
      }, 1000);
      
    } catch (error) {
      console.error('Error en logout:', error);
      this.uiModule.showNotification('Error al cerrar sesión', 'error');
    } finally {
      this.uiModule.hideLoading();
    }
  }

  // Iniciar suscripción
  async startSubscription(options = {}) {
    try {
      const defaultOptions = {
        reason: 'Suscripción mensual P.I.E.P.',
        amount: 1500,
        currency: 'ARS',
        frequency: 1,
        frequencyType: 'months',
        plan: 'estudiante'
      };

      const subscriptionData = { ...defaultOptions, ...options };
      
      // Usar la URL del perfil como backUrl
      subscriptionData.backUrl = `${window.location.origin}/perfil.html`;
      
      const result = await this.apiModule.createSubscription(subscriptionData);
      
      if (result && (result.init_point || result.sandbox_init_point)) {
        const url = result.init_point || result.sandbox_init_point;
        window.location.href = url;
      } else {
        throw new Error('No se recibió URL de pago');
      }
      
      return result;
    } catch (error) {
      console.error('Error iniciando suscripción:', error);
      throw error;
    }
  }

  // Mostrar calendario
  showCalendar() {
    this.loadSection('calendario');
  }

  // Mostrar historial
  showHistory() {
    this.uiModule.showNotification('Funcionalidad de historial próximamente', 'info');
  }

  // Mostrar ayuda
  showHelp() {
    this.uiModule.showNotification('Funcionalidad de ayuda próximamente', 'info');
  }
}

// Instancia global de la aplicación
const app = new App();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
  app.initialize();
}

// Exponer globalmente para compatibilidad
window.app = app;

export default app;