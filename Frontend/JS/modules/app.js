// Módulo principal de la aplicación
import { initializeAuth, authModule } from './auth.js';
import { createApiModule } from './api.js';
import { uiModule } from './ui.js';
import { createUploadModule } from './upload.js';

// Variable global para la instancia de la aplicación
let appInstance = null;

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

      // Guardar instancia global
      appInstance = this;
      
      // Crear función global para cargar secciones
      window.cargarSeccion = (sectionName) => {
        if (appInstance) {
          appInstance.loadSection(sectionName);
        } else {
          console.error('Error: La aplicación no está inicializada');
        }
      };

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
      
      // Exponer funciones de autenticación globalmente para compatibilidad
      window.getAuthHeaders = () => this.authModule.getAuthHeaders();
      window.getAccessToken = () => this.authModule.getAccessToken();
      
      // Configurar callback de cambios de estado
      this.authModule.onAuthStateChanged = (event, session) => {
        this.handleAuthStateChange(event, session);
      };
      
      console.log('✅ Auth module y funciones globales inicializados');
    } else {
      throw new Error('Error inicializando autenticación');
    }
  }

  // Inicializar API
  initializeApi() {
    this.apiModule = createApiModule(this.authModule);
    window.apiModule = this.apiModule; // Compatibilidad global
    
    // Exponer función apiCall global para compatibilidad con código legacy
    window.apiCall = (url, options = {}) => {
      return this.apiModule.call(url, options);
    };
    
    console.log('✅ API module y apiCall global inicializados');
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
      // Solo navegar a la sección "cambiar-plan".
      // La redirección a MercadoPago debe ocurrir únicamente cuando el usuario elige un plan nuevo.
      btnCambiarPlan.addEventListener('click', () => {
        try {
          this.loadSection('cambiar-plan');
        } catch (error) {
          this.uiModule.showNotification('No se pudo abrir la sección de cambio de plan', 'error');
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
    const menuItems = document.querySelectorAll('.btn-sidebar-menu');
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
    const sidebarButtons = document.querySelectorAll('.sidebar-footer .btn-sidebar-menu');
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
      // Carga fluida del historial dentro del contenedor principal
      if (sectionName === 'historial') {
        // Limpiar y mostrar loading coherente
        this.forceCleanupLoading();
        this.uiModule.showLoading('Cargando historial...');

        // Inyectar CSS del historial unificado si no existe
        if (!document.querySelector('#historial-unified-css')) {
          const link = document.createElement('link');
          link.id = 'historial-unified-css';
          link.rel = 'stylesheet';
          link.href = '/Css/historial-unified.css';
          document.head.appendChild(link);
        }

        // Obtener HTML y extraer contenido del body
        const response = await fetch('Pages/historial-unified.html');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const body = doc.body;

        const contenedor = document.getElementById('contenido');
        if (contenedor) {
          contenedor.innerHTML = '';

          // Insertar elementos principales del historial
          const loading = body.querySelector('#loadingIndicator');
          const container = body.querySelector('.historial-container');

          if (loading) contenedor.appendChild(loading);
          if (container) {
            contenedor.appendChild(container);
          } else {
            // Fallback: insertar todos los hijos de body
            Array.from(body.children).forEach(node => contenedor.appendChild(node));
          }

          // Cargar script específico y inicializar sección
          await this.loadSectionScript('historial');
          await this.initializeSection('historial');

          // Actualizar el menú activo
          this.updateActiveMenu('historial');
        }

        // Asegurar limpieza del loading
        this.forceCleanupLoading();
        setTimeout(() => this.forceCleanupLoading(), 200);
        return;
      }
      // Limpiar completamente antes de cargar nueva sección
      this.forceCleanupLoading();
      this.uiModule.showLoading('Cargando sección...');
      
      // Guardar la sección anterior para limpieza
      const previousSection = window.activeScript;
      console.log(`🔄 Cambiando de sección: ${previousSection || 'ninguna'} -> ${sectionName}`);
      
      // Limpiar variables y funciones de la sección anterior
      this.cleanupPreviousSection();
      
      const response = await fetch(`Pages/${sectionName}.html`);
      const html = await response.text();
      
      const contenedor = document.getElementById('contenido');
      if (contenedor) {
        // Limpiar contenedor antes de insertar nuevo contenido
        contenedor.innerHTML = '';
        
        // Pequeña pausa para asegurar limpieza del DOM
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Insertar nuevo contenido
        contenedor.innerHTML = html;
        
        // Cargar script específico de la sección
        await this.loadSectionScript(sectionName);
        
        // Inicializaciones específicas por sección
        await this.initializeSection(sectionName);
        
        // Actualizar menú activo
        this.updateActiveMenu(sectionName);
      }
    } catch (error) {
      console.error('Error cargando sección:', error);
      this.uiModule.showNotification('Error al cargar la sección', 'error');
      
      // Mostrar mensaje de error en el contenedor
      const contenedor = document.getElementById('contenido');
      if (contenedor) {
        contenedor.innerHTML = `
          <div class="error-state">
            <h3>Error</h3>
            <p>No se pudo cargar la sección ${sectionName}</p>
            <button onclick="app.loadSection('home')" class="btn-primary">
              <i class="fas fa-home"></i> Volver al inicio
            </button>
          </div>
        `;
      }
    } finally {
      // Asegurar que el loading se oculte siempre con múltiples intentos
      this.forceCleanupLoading();
      setTimeout(() => {
        this.forceCleanupLoading();
      }, 200);
    }
  }

  // Cargar script de sección con caché optimizado y limpieza de scripts anteriores
  loadSectionScript(sectionName) {
    return new Promise((resolve) => {
      // Limpiar variables globales y funciones de la sección anterior
      this.cleanupPreviousSection();
      
      // Cache de scripts cargados y scripts activos
      if (!window.loadedScripts) {
        window.loadedScripts = new Set();
      }
      
      if (!window.activeScript) {
        window.activeScript = null;
      }

      // Registrar el script activo actual
      window.activeScript = sectionName;
      
      // Verificar si ya existe un script con este ID y eliminarlo
      const existingScript = document.getElementById(`section-script-${sectionName}`);
      if (existingScript) {
        existingScript.remove();
        console.log(`🗑️ Script existente de ${sectionName} eliminado`);
      }

      // Eliminar cualquier script duplicado previamente cargado por otros sistemas
      const scriptPath = sectionName === 'historial' ? 'historial-unified' : sectionName;
      const duplicates = Array.from(document.querySelectorAll('script[src]')).filter(s => {
        const src = s.getAttribute('src') || '';
        return src.includes(`/JS/${scriptPath}.js`);
      });
      duplicates.forEach(s => {
        // Evitar eliminar el mismo que pudiéramos estar actualizando por ID
        if (s.id !== `section-script-${sectionName}`) {
          s.remove();
          console.log(`🗑️ Script duplicado eliminado: ${s.src}`);
        }
      });
      
      const script = document.createElement('script');
      // Usar versión unificada para historial
      script.src = `/JS/${scriptPath}.js?t=${new Date().getTime()}`; // Añadir timestamp para evitar caché
      script.type = 'text/javascript';
      script.defer = true;
      script.id = `section-script-${sectionName}`;
      
      script.onload = () => {
        window.loadedScripts.add(sectionName);
        console.log(`📜 Script de ${sectionName} cargado correctamente`);
        resolve();
      };
      
      script.onerror = (error) => {
        console.warn(`Script ${sectionName}.js no pudo cargarse:`, error);
        resolve(); // Continuar aunque el script falle
      };
      
      // Pequeña pausa antes de añadir el script
      setTimeout(() => {
        document.head.appendChild(script);
      }, 100);
    });
  }

  // Actualizar menú activo
  updateActiveMenu(sectionName) {
    document.querySelectorAll('.btn-sidebar-menu').forEach(item => {
      item.classList.remove('active');
    });
    
    // Buscar botón por onclick (para botones con cargarSeccion)
    const activeItem = document.querySelector(`[onclick*="${sectionName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    } else if (sectionName === 'home') {
      // Caso especial para el botón home que no tiene onclick
      const homeBtn = document.getElementById('homeBtn');
      if (homeBtn) {
        homeBtn.classList.add('active');
      }
    }
  }
  
  // Inicializar sección específica
  async initializeSection(sectionName) {
    console.log(`Inicializando sección: ${sectionName}`);
    
    try {
      switch (sectionName) {
        case 'home':
          if (window.initializeHomeIfNeeded) {
            console.log('Llamando a initializeHomeIfNeeded...');
            window.initializeHomeIfNeeded();
          } else {
            console.warn('initializeHomeIfNeeded no está disponible');
            // Esperar un poco más y volver a intentar
            setTimeout(() => {
              if (window.initializeHomeIfNeeded) {
                console.log('initializeHomeIfNeeded disponible en segundo intento');
                window.initializeHomeIfNeeded();
              } else {
                console.error('initializeHomeIfNeeded no disponible después del segundo intento');
              }
            }, 500);
          }
          break;

        case 'calendario':
          if (window.initializeCalendar) {
            const safeInit = () => {
              try { window.initializeCalendar(); } catch (_) {}
            };
            // Primer intento
            setTimeout(safeInit, 200);
            // Segundo intento por si el DOM tarda en renderizar
            setTimeout(safeInit, 600);
          }
          break;

        case 'historial':
          if (window.initializeHistorial) {
            const safeInit = () => {
              try { window.initializeHistorial(); } catch (_) {}
            };
            setTimeout(safeInit, 200);
            setTimeout(safeInit, 600);
          }
          break;
          
        case 'cambiar-plan':
          if (window.initializeCambiarPlan) {
            setTimeout(() => window.initializeCambiarPlan(), 200);
          }
          break;
          
        case 'planes-estudio':
          if (window.initializeStudyPlans) {
            const safeInit = () => {
              try { window.initializeStudyPlans(); } catch (_) {}
            };
            setTimeout(safeInit, 200);
            setTimeout(safeInit, 600);
          }
          break;

        case 'suscripciones':
          if (window.initializeSuscripciones) {
            setTimeout(() => window.initializeSuscripciones(), 200);
          }
          break;

        case 'perfil':
          if (window.initializePerfil) {
            setTimeout(() => window.initializePerfil(), 200);
          }
          break;
          
        default:
          console.log(`No hay inicialización específica para: ${sectionName}`);
      }
    } catch (error) {
      console.error(`Error inicializando sección ${sectionName}:`, error);
    }
  }
  
  // Forzar limpieza completa de todos los elementos de loading
  forceCleanupLoading() {
    // Usar el módulo UI
    this.uiModule.hideLoading();
    
    // Buscar y eliminar todos los overlays de loading
    const allLoadingOverlays = document.querySelectorAll('#loadingOverlay, .loading-overlay');
    allLoadingOverlays.forEach(overlay => {
      overlay.style.display = 'none';
    });
    
    // Buscar y eliminar todos los elementos de loading del historial
    const historialLoadings = document.querySelectorAll('.historial-loading, .historial-loading-content');
    historialLoadings.forEach(loading => {
      if (loading.parentNode) {
        loading.parentNode.removeChild(loading);
      }
    });
    
    // Remover clases de loading de todos los elementos
    const elementsWithLoading = document.querySelectorAll('.loading');
    elementsWithLoading.forEach(el => {
      el.classList.remove('loading');
    });
    
    // Limpiar específicamente el contentGrid si existe
    const contentGrid = document.getElementById('contentGrid') || document.querySelector('.content-grid');
    if (contentGrid) {
      contentGrid.classList.remove('loading');
      // Solo limpiar el contenido si parece ser de loading
      if (contentGrid.innerHTML.includes('historial-loading') || contentGrid.innerHTML.includes('Procesando')) {
        contentGrid.innerHTML = '';
      }
    }
  }
  
  // Limpiar variables y funciones de la sección anterior
  cleanupPreviousSection() {
    // Primero ocultar cualquier loading que pueda estar activo
    this.uiModule.hideLoading();
    
    // Limpiar cualquier elemento de loading específico que pueda quedar en el DOM
    const loadingElements = document.querySelectorAll('.historial-loading, .loading-spinner-modern, .loading');
    loadingElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Remover clases de loading de elementos que puedan tenerlas
    const elementsWithLoadingClass = document.querySelectorAll('.loading');
    elementsWithLoadingClass.forEach(el => {
      el.classList.remove('loading');
    });
    
    // Eliminar scripts anteriores por ID
    if (window.activeScript) {
      const oldScriptId = `section-script-${window.activeScript}`;
      const oldScript = document.getElementById(oldScriptId);
      if (oldScript) {
        oldScript.remove();
      }
      
      // Eliminar cualquier otro script dinámico que pueda haber sido añadido
      const dynamicScripts = document.querySelectorAll(`script[src*="/JS/${window.activeScript}.js"]`);
      dynamicScripts.forEach(script => script.remove());
      
      // Eliminar cualquier script adicional que pueda haber sido añadido sin src
      const inlineScripts = document.querySelectorAll('script:not([src])');
      inlineScripts.forEach(script => {
        // Solo eliminar scripts que parezcan ser dinámicos (no los originales del HTML)
        if (script.textContent.includes('initializeHistorial') || 
            script.textContent.includes('refreshHistorial')) {
          script.remove();
        }
      });
    }
    
    // Limpiar variables globales específicas según la sección anterior
    if (window.activeScript === 'home') {
      // Limpiar instancia del carousel si existe
      if (window.carouselInstance && typeof window.carouselInstance.destroy === 'function') {
        window.carouselInstance.destroy();
        window.carouselInstance = null;
      }
      
      // NO limpiar las variables DOM del home - se necesitan para re-inicialización
      // Las variables se volverán a asignar en getHomeElements()
      window.homeInitialized = false; // Permitir re-inicialización
      
      console.log('🧹 Limpieza del carousel del home realizada');
    }

    if (window.activeScript === 'calendario') {
      if (window.cleanupCalendar) {
        try { window.cleanupCalendar(); } catch (_) {}
      }
    }

    if (window.activeScript === 'suscripciones') {
      if (window.cleanupSuscripciones) {
        try { window.cleanupSuscripciones(); } catch (_) {}
      }
    }

    if (window.activeScript === 'perfil') {
      if (window.cleanupPerfil) {
        try { window.cleanupPerfil(); } catch (_) {}
      }
    }

    if (window.activeScript === 'planes-estudio') {
      if (window.cleanupStudyPlans) {
        try { window.cleanupStudyPlans(); } catch (_) {}
      }
    }

    // Limpiar variables globales específicas de historial
    if (window.activeScript === 'historial') {
      // Intentar limpieza explícita si el módulo la expone
      if (window.cleanupHistorial) {
        try { window.cleanupHistorial(); } catch (_) {}
      }
      // Primero limpiar cualquier loading específico del historial que pueda estar activo
      const contentGrid = document.getElementById('contentGrid') || document.querySelector('.content-grid');
      if (contentGrid) {
        contentGrid.classList.remove('loading');
        contentGrid.innerHTML = '';
      }
      
      // Limpiar variables globales del historial
      // NOTA: No eliminamos initializeHistorial para mantener compatibilidad con historial-simple.js
      window.historialData = undefined;
      window.filteredData = undefined;
      window.currentFilter = undefined;
      window.refreshHistorial = undefined;
      window.historialInitialized = undefined;
      
      // Limpiar otras variables que puedan interferir
      window.contentGrid = undefined;
      window.emptyState = undefined;
      // historialLoadingOverlay removido - usando módulo UI global
      window.filterButtons = undefined;
      window.confirmModal = undefined;
      window.previewModal = undefined;
      window.totalItems = undefined;
      window.totalPdfs = undefined;
      window.favType = undefined;
      
      // Eliminar event listeners específicos del historial
      const filterButtons = document.querySelectorAll('.filter-btn');
      if (filterButtons && filterButtons.length > 0) {
        filterButtons.forEach(btn => {
          const newBtn = btn.cloneNode(true);
          if (btn.parentNode) {
            btn.parentNode.replaceChild(newBtn, btn);
          }
        });
      }
      
      // Eliminar otros elementos que puedan tener event listeners
      const btnLimpiarHistorial = document.getElementById('btnLimpiarHistorial');
      if (btnLimpiarHistorial) {
        const newBtn = btnLimpiarHistorial.cloneNode(true);
        if (btnLimpiarHistorial.parentNode) {
          btnLimpiarHistorial.parentNode.replaceChild(newBtn, btnLimpiarHistorial);
        }
      }
      
      // Eliminar modales que puedan quedar abiertos
      const modales = document.querySelectorAll('.modal-overlay');
      modales.forEach(modal => {
        modal.style.display = 'none';
      });
      
      // Eliminar cualquier timeout o interval que pueda estar corriendo
      // Esto es una medida extrema pero puede ayudar con problemas de memoria
      const highestTimeoutId = setTimeout(";");
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }
      
      console.log('🧹 Limpieza completa del historial realizada');
      // Resetear instancia para permitir nueva inicialización
      if (window.cleanupHistorial) {
        try { window.cleanupHistorial(); } catch (_) {}
      }
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
    this.loadSection('historial');
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