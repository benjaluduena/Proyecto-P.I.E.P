/**
 * Historial Unificado - P.I.E.P. v3.0
 * Sistema optimizado de gestión de historial con mejores prácticas
 * Autor: Sistema de Optimización P.I.E.P.
 * Fecha: 2024
 */

class HistorialUnified {
  constructor() {
    // Configuración del sistema
    this.config = {
      itemsPerPage: 12,
      cacheSize: 100,
      debounceDelay: 300,
      animationDuration: 300,
      lazyLoadOffset: 50
    };

    // Estado del sistema
    this.state = {
      data: [],
      filteredData: [],
      currentFilter: 'all',
      currentSort: 'newest',
      currentView: 'grid',
      currentPage: 1,
      searchQuery: '',
      isLoading: false,
      favorites: this.loadFavorites()
    };

    // Cache y optimización
    this.cache = new Map();
    this.renderCache = new Map();
    this.intersectionObserver = null;

    // Elementos DOM
    this.elements = {};

    // Métricas de rendimiento
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      totalInteractions: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.init();
  }

  /**
   * Inicialización del sistema
   */
  async init() {
    try {
      const startTime = performance.now();

      await this.bindElements();
      this.setupEventListeners();
      this.setupIntersectionObserver();
      this.setupPerformanceMonitoring();
      await this.loadData();
      this.render();

      this.metrics.loadTime = performance.now() - startTime;
      this.trackEvent('historial_initialized', { loadTime: this.metrics.loadTime });
    } catch (error) {
      console.error('❌ [DEBUG] Error en inicialización:', error);
      console.error('❌ [DEBUG] Stack trace:', error.stack);
      this.showError('Error al cargar el historial', error.message);
    }
  }

  /**
   * Vinculación optimizada de elementos DOM
   */
  async bindElements() {
    const elementSelectors = {
      // Contenedores principales
      contentGrid: '#contentGrid',
      emptyState: '#emptyState',
      loadingIndicator: '#loadingIndicator',
      
      // Controles de búsqueda y filtros
      searchInput: '#searchInput',
      clearSearch: '#clearSearch',
      sortSelect: '#sortSelect',
      
      // Controles de vista
      gridView: '#gridView',
      listView: '#listView',
      
      // Estadísticas
      totalItems: '#totalItems',
      totalPdfs: '#totalPdfs',
      totalFavorites: '#totalFavorites',
      
      // Paginación
      pagination: '#pagination',
      prevPage: '#prevPage',
      nextPage: '#nextPage',
      pageInfo: '#pageInfo',
      
      // Herramientas
      exportFavorites: '#exportFavorites',
      deleteAll: '#deleteAll'
    };

    // Vincular elementos con verificación de existencia
    for (const [key, selector] of Object.entries(elementSelectors)) {
      this.elements[key] = document.querySelector(selector);
      if (!this.elements[key] && ['contentGrid', 'searchInput'].includes(key)) {
        console.warn(`⚠️ Elemento crítico no encontrado: ${selector}`);
      }
    }

    // Vincular botones de filtro
    this.elements.filterBtns = document.querySelectorAll('.filter-btn');
    
    // Vincular contadores de filtros
    this.elements.filterCounts = {};
    const filterTypes = ['all', 'favorites', 'resumen', 'verdadero_falso', 'multiple_choice', 'mapa_mental', 'flashcards'];
    filterTypes.forEach(type => {
      this.elements.filterCounts[type] = document.querySelector(`#count-${type}`);
    });

    // Vincular acciones adicionales
    this.elements.advancedSearch = document.getElementById('advancedSearch');
    this.elements.clearFiltersBtn = document.getElementById('clearFiltersBtn');
  }

  /**
   * Configuración optimizada de event listeners
   */
  setupEventListeners() {
    // Búsqueda con debounce optimizado
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', 
        this.debounce((e) => this.handleSearch(e.target.value), this.config.debounceDelay)
      );
    }

    // Limpiar búsqueda
    if (this.elements.clearSearch) {
      this.elements.clearSearch.addEventListener('click', () => this.clearSearch());
    }

    // Búsqueda avanzada (placeholder)
    if (this.elements.advancedSearch) {
      this.elements.advancedSearch.addEventListener('click', () => {
        this.trackEvent('open_advanced_search');
        this.showNotification('info', 'La búsqueda avanzada estará disponible pronto');
      });
    }

    // Limpiar filtros (vacía búsqueda + restaura filtro "Todos")
    if (this.elements.clearFiltersBtn) {
      this.elements.clearFiltersBtn.addEventListener('click', () => this.clearFilters());
    }
    // Filtros con delegación de eventos
    this.elements.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleFilter(e.target.closest('.filter-btn').dataset.filter);
      });
    });

    // Ordenamiento
    if (this.elements.sortSelect) {
      this.elements.sortSelect.addEventListener('change', (e) => this.handleSort(e.target.value));
    }

    // Vista
    if (this.elements.gridView) {
      this.elements.gridView.addEventListener('click', () => this.setView('grid'));
    }
    if (this.elements.listView) {
      this.elements.listView.addEventListener('click', () => this.setView('list'));
    }

    // Paginación
    if (this.elements.prevPage) {
      this.elements.prevPage.addEventListener('click', () => this.prevPage());
    }
    if (this.elements.nextPage) {
      this.elements.nextPage.addEventListener('click', () => this.nextPage());
    }

    // Herramientas
    if (this.elements.exportFavorites) {
      this.elements.exportFavorites.addEventListener('click', () => this.exportFavorites());
    }
    if (this.elements.deleteAll) {
      this.elements.deleteAll.addEventListener('click', () => this.confirmDeleteAll());
    }

    // Delegación de eventos para acciones de contenido
    if (this.elements.contentGrid) {
      this.elements.contentGrid.addEventListener('click', (e) => this.handleContentAction(e));
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
  }

  /**
   * Configuración del Intersection Observer para lazy loading
   */
  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          
          // Lazy load de imágenes
          if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
            element.classList.add('loaded');
          }
          
          // Lazy load de contenido
          if (element.dataset.lazyContent) {
            this.loadLazyContent(element);
          }
          
          this.intersectionObserver.unobserve(element);
        }
      });
    }, { 
      rootMargin: `${this.config.lazyLoadOffset}px`,
      threshold: 0.1
    });
  }

  // Nuevo: observar elementos recién renderizados para lazy loading
  setupLazyLoading() {
    try {
      if (!this.elements?.contentGrid || !this.intersectionObserver) return;
      const toObserve = this.elements.contentGrid.querySelectorAll('[data-src], [data-lazy-content]');
      toObserve.forEach(el => this.intersectionObserver.observe(el));
    } catch (e) {
      console.warn('setupLazyLoading error', e);
    }
  }

  /**
   * Configuración de monitoreo de rendimiento
   */
  setupPerformanceMonitoring() {
    // Monitor de memoria
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.9) {
          console.warn('⚠️ Alto uso de memoria detectado, limpiando cache...');
          this.cleanupCache();
        }
      }, 30000); // Cada 30 segundos
    }

    // Monitor de FPS
    let lastTime = performance.now();
    let frameCount = 0;
    const monitorFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        if (fps < 30) {
          console.warn(`⚠️ FPS bajo detectado: ${fps}`);
        }
        frameCount = 0;
        lastTime = currentTime;
      }
      requestAnimationFrame(monitorFPS);
    };
    requestAnimationFrame(monitorFPS);
  }

  /**
   * Carga optimizada de datos desde la API
   */
  async loadData() {
    try {
      this.showLoading(true);
      const startTime = performance.now();

      // Verificar cache primero
      const cacheKey = 'historial_data';
      const cachedData = this.getFromCache(cacheKey);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp)) {
        this.state.data = cachedData.data;
        this.metrics.cacheHits++;
      } else {
        // Verificar headers de autenticación
        const authHeaders = this.getAuthHeaders();
        
        // Cargar desde API
        const response = await this.apiCall(`${CONFIG.API.BASE_URL}/api/historial/content?limit=100`);
        
        if (!response || !response.ok) {
          throw new Error(`Error HTTP: ${response?.status || 'Desconocido'} - ${response?.statusText || 'Sin descripción'}`);
        }

        const responseData = await response.json();
        
        // Extraer datos del objeto de respuesta
        let data = responseData;
        if (responseData && responseData.success && responseData.data) {
          data = responseData.data;
        } else if (Array.isArray(responseData)) {
          data = responseData;
        }
        
        this.state.data = Array.isArray(data) ? data : [];
        
        // Guardar en cache
        this.setCache(cacheKey, {
          data: this.state.data,
          timestamp: Date.now()
        });
        
        this.metrics.cacheMisses++;
      }

      // Procesar datos
      this.processData();
      this.applyFiltersAndSort();

      const loadTime = performance.now() - startTime;

    } catch (error) {
      console.error('❌ [DEBUG] Error cargando datos:', error);
      console.error('❌ [DEBUG] Stack trace:', error.stack);
      this.state.data = this.generateFallbackData();
      this.showError('Error al cargar datos', 'Mostrando datos de ejemplo');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Procesamiento optimizado de datos
   */
  processData() {
    this.state.data = this.state.data.map(item => ({
      ...item,
      searchText: this.generateSearchText(item),
      isFavorite: this.state.favorites.includes(item.id),
      formattedDate: this.formatDate(item.created_at),
      contentPreview: this.generateContentPreview(item.content, item.type)
    }));
  }

  /**
   * Generación de texto de búsqueda optimizado
   */
  generateSearchText(item) {
    const searchParts = [
      item.pdf_title || '',
      item.pdf_name || '',
      this.getTypeName(item.type),
      this.getContentText(item.content, item.type)
    ];
    
    return searchParts.join(' ').toLowerCase().trim();
  }

  /**
   * Extracción de texto de contenido por tipo
   */
  getContentText(content, type) {
    if (!content || typeof content !== 'object') return '';

    try {
      switch (type) {
        case 'resumen':
          return [
            content.resumen_general || '',
            (content.conceptos_clave || []).join(' '),
            content.conclusiones || ''
          ].join(' ');

        case 'multiple_choice':
        case 'verdadero_falso':
          return (content.preguntas || [])
            .map(p => `${p.enunciado || ''} ${p.explicacion || ''}`)
            .join(' ');

        case 'mapa_mental':
          const ramas = content.ramas || [];
          return [
            content.nodo_central || '',
            ramas.map(r => `${r.titulo || ''} ${(r.items || []).join(' ')}`).join(' ')
          ].join(' ');

        case 'flashcards':
          return (content.tarjetas || [])
            .map(t => `${t.frente || ''} ${t.reverso || ''}`)
            .join(' ');

        default:
          return JSON.stringify(content).toLowerCase();
      }
    } catch (error) {
      console.warn('⚠️ Error extrayendo texto de contenido:', error);
      return '';
    }
  }

  /**
   * Aplicación optimizada de filtros y ordenamiento
   */
  applyFiltersAndSort() {
    let filtered = [...this.state.data];

    // Aplicar filtro de búsqueda
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.searchText.includes(query)
      );
    }

    // Aplicar filtro de tipo
    if (this.state.currentFilter !== 'all') {
      if (this.state.currentFilter === 'favorites') {
        filtered = filtered.filter(item => item.isFavorite);
      } else {
        filtered = filtered.filter(item => item.type === this.state.currentFilter);
      }
    }

    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      switch (this.state.currentSort) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'pdf':
          return (a.pdf_title || '').localeCompare(b.pdf_title || '');
        default:
          return 0;
      }
    });

    this.state.filteredData = filtered;
    this.state.currentPage = 1; // Reset página al filtrar
  }

  /**
   * Renderizado principal optimizado
   */
  render() {
    const startTime = performance.now();

    this.renderContent();
    this.updateStats();
    this.updatePagination();
    this.updateUI();

    this.metrics.renderTime = performance.now() - startTime;
  }

  /**
   * Renderizado optimizado de contenido
   */
  renderContent() {
    const contentGrid = this.elements.contentGrid;
    if (!contentGrid) {
      console.error('❌ [DEBUG] contentGrid no encontrado');
      return;
    }

    // Calcular elementos para la página actual
    const startIndex = (this.state.currentPage - 1) * this.config.itemsPerPage;
    const endIndex = startIndex + this.config.itemsPerPage;
    const pageItems = this.state.filteredData.slice(startIndex, endIndex);

    if (pageItems.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();

    // Renderizar elementos
    const fragment = document.createDocumentFragment();
    pageItems.forEach((item, index) => {
      const card = this.createItemCard(item);
      fragment.appendChild(card);
    });

    contentGrid.innerHTML = '';
    contentGrid.appendChild(fragment);

    // Animar entrada de tarjetas
    this.animateCardEntrance();
  }

  /**
   * Creación optimizada de tarjetas de contenido
   */
  createItemCard(item) {
    const cacheKey = `card_${item.id}_${item.type}`;
    
    // Verificar cache de renderizado
    if (this.renderCache.has(cacheKey)) {
      const cached = this.renderCache.get(cacheKey).cloneNode(true);
      this.updateCardState(cached, item);
      return cached;
    }

    const card = document.createElement('div');
    card.className = `content-card ${this.state.currentView}-view`;
    card.dataset.itemId = item.id;
    card.dataset.itemType = item.type;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-type">
          <span class="type-icon">${this.getTypeIcon(item.type)}</span>
          <span class="type-name">${this.getTypeName(item.type)}</span>
        </div>
        <div class="card-actions">
          <button class="action-btn favorite-btn ${item.isFavorite ? 'active' : ''}" 
                  data-action="favorite" title="Favorito">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>
            </svg>
          </button>
          <button class="action-btn menu-btn" data-action="menu" title="Más opciones">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="card-content">
        <div class="card-file" title="PDF origen">
          <span class="file-pill">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M13,9H18V20H6V4H13V9Z"/>
            </svg>
            ${this.escapeHtml(item.pdf_name || item.pdf_title || 'Documento')}
          </span>
        </div>
        <h3 class="card-title">${this.escapeHtml(item.pdf_title || 'Sin título')}</h3>
        <div class="card-preview">${item.contentPreview}</div>
        <div class="card-meta">
          <span class="card-date">${item.formattedDate}</span>
          <span class="card-size">${this.getContentSize(item.content)}</span>
        </div>
      </div>
      
      <div class="card-footer">
        <div class="card-actions-primary">
          <button class="btn btn-primary" data-action="view">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"/>
            </svg>
            Ver
          </button>
          <button class="btn btn-secondary" data-action="study">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z"/>
            </svg>
            Estudiar
          </button>
        </div>
      </div>
    `;

    // Guardar en cache de renderizado
    this.renderCache.set(cacheKey, card.cloneNode(true));
    
    // Limpiar cache si es muy grande
    if (this.renderCache.size > this.config.cacheSize) {
      const firstKey = this.renderCache.keys().next().value;
      this.renderCache.delete(firstKey);
    }

    return card;
  }

  /**
   * Manejo de acciones de contenido con delegación de eventos
   */
  handleContentAction(event) {
    const actionBtn = event.target.closest('[data-action]');
    if (!actionBtn) return;

    event.preventDefault();
    event.stopPropagation();

    const action = actionBtn.dataset.action;
    const card = actionBtn.closest('.content-card');
    const itemId = card?.dataset.itemId;

    if (!itemId) return;

    this.trackEvent('content_action', { action, itemId });

    switch (action) {
      case 'favorite':
        this.toggleFavorite(itemId);
        break;
      case 'view':
        this.viewContent(itemId);
        break;
      case 'study':
        this.startStudyMode(itemId);
        break;
      case 'menu':
        this.showContextMenu(itemId, actionBtn);
        break;
      default:
        console.warn('Acción no reconocida:', action);
    }
  }

  /**
   * Utilidades y métodos auxiliares
   */
  
  // API call optimizada con retry y timeout
  async apiCall(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Timeout: La solicitud tardó demasiado');
      }
      throw error;
    }
  }

  // Headers de autenticación
  getAuthHeaders() {
    const session = localStorage.getItem('session');
    if (session) {
      try {
        const sessionData = JSON.parse(session);
        return {
          'Authorization': `Bearer ${sessionData.access_token || ''}`
        };
      } catch (error) {
        console.warn('Error parseando sesión:', error);
      }
    }
    return {};
  }

  // Debounce optimizado
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Formateo de fecha optimizado
  formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  // Escape HTML para seguridad
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Gestión de favoritos
  loadFavorites() {
    try {
      const stored = localStorage.getItem('historial_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Error cargando favoritos:', error);
      return [];
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem('historial_favorites', JSON.stringify(this.state.favorites));
    } catch (error) {
      console.warn('Error guardando favoritos:', error);
    }
  }

  // Gestión de cache
  getFromCache(key) {
    return this.cache.get(key);
  }

  setCache(key, value) {
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  isCacheValid(timestamp, maxAge = 300000) { // 5 minutos
    return Date.now() - timestamp < maxAge;
  }

  cleanupCache() {
    this.cache.clear();
    this.renderCache.clear();
  }

  /**
   * Limpia el cache del historial
   */
  clearCache() {
    localStorage.removeItem('historial_cache');
    localStorage.removeItem('historial_cache_timestamp');
  }

  // Tracking de eventos
  trackEvent(eventName, data = {}) {
    this.metrics.totalInteractions++;
    
    // Enviar a analytics si está disponible
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  // Manejo de errores
  showError(title, message) {
    console.error(`❌ ${title}: ${message}`);
    
    // Mostrar notificación al usuario
    this.showNotification('error', `${title}: ${message}`);
  }

  showNotification(type, message) {
    // Implementar sistema de notificaciones
  }

  // Estados de carga
  showLoading(show) {
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  showEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'block';
    }
    if (this.elements.contentGrid) {
      this.elements.contentGrid.style.display = 'none';
    }
  }

  hideEmptyState() {
    if (this.elements.emptyState) {
      this.elements.emptyState.style.display = 'none';
    }
    if (this.elements.contentGrid) {
      this.elements.contentGrid.style.display = 'grid';
    }
  }

  // Métodos placeholder para funcionalidades específicas
  handleSearch(query) {
    this.state.searchQuery = (query || '').trim();
    if (this.elements.clearSearch) {
      this.elements.clearSearch.style.display = this.state.searchQuery ? 'flex' : 'none';
    }
    this.applyFiltersAndSort();
    this.render();
  }
  clearSearch() {
    if (this.state.searchQuery) {
      this.state.searchQuery = '';
      if (this.elements.searchInput) this.elements.searchInput.value = '';
      this.updateUI();
      this.applyFiltersAndSort();
      this.render();
    }
  }
  handleFilter(filter) {
    if (!filter) return;
    if (this.state.currentFilter === filter) return;
    this.state.currentFilter = filter;
    // Actualizar estado visual de pestañas de filtro
    if (this.elements.filterBtns && this.elements.filterBtns.length) {
      this.elements.filterBtns.forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
    }
    this.applyFiltersAndSort();
    this.render();
  }

  // Limpia búsqueda y restablece el filtro "Todos"
  clearFilters() {
    const changed = this.state.searchQuery !== '' || this.state.currentFilter !== 'all';
    this.state.searchQuery = '';
    this.state.currentFilter = 'all';
    if (this.elements.searchInput) this.elements.searchInput.value = '';
    if (this.elements.clearSearch) this.elements.clearSearch.style.display = 'none';
    if (this.elements.filterBtns && this.elements.filterBtns.length) {
      this.elements.filterBtns.forEach(btn => {
        const isActive = btn.dataset.filter === 'all';
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
      });
    }
    if (changed) {
      this.applyFiltersAndSort();
      this.render();
    }
  }
  handleSort(sort) {
    if (!sort) return;
    this.state.currentSort = sort;
    if (this.elements.sortSelect) this.elements.sortSelect.value = sort;
    this.applyFiltersAndSort();
    this.render();
  }
  setView(view) {
    if (!['grid', 'list'].includes(view)) return;
    this.state.currentView = view;
    // Botones
    if (this.elements.gridView) {
      const isGrid = view === 'grid';
      this.elements.gridView.classList.toggle('active', isGrid);
      this.elements.gridView.setAttribute('aria-pressed', String(isGrid));
    }
    if (this.elements.listView) {
      const isList = view === 'list';
      this.elements.listView.classList.toggle('active', isList);
      this.elements.listView.setAttribute('aria-pressed', String(isList));
    }
    // Contenedor
    if (this.elements.contentGrid) {
      this.elements.contentGrid.classList.toggle('list-view', view === 'list');
    }
    // Re-renderizar tarjetas para aplicar clase correspondiente
    this.renderContent();
    this.updateUI();
  }
  prevPage() {
    const totalPages = Math.max(1, Math.ceil(this.state.filteredData.length / this.config.itemsPerPage));
    if (this.state.currentPage > 1) {
      this.state.currentPage -= 1;
      this.renderContent();
      this.updatePagination();
    }
  }
  nextPage() {
    const totalPages = Math.max(1, Math.ceil(this.state.filteredData.length / this.config.itemsPerPage));
    if (this.state.currentPage < totalPages) {
      this.state.currentPage += 1;
      this.renderContent();
      this.updatePagination();
    }
  }
  updateStats() {
    try {
      const totalItems = this.state.data.length;
      const uniquePdfs = new Set(this.state.data.map(i => i.pdf_id).filter(Boolean)).size;
      const totalFavs = this.state.favorites.length;
      if (this.elements.totalItems) this.elements.totalItems.textContent = String(totalItems);
      if (this.elements.totalPdfs) this.elements.totalPdfs.textContent = String(uniquePdfs);
      if (this.elements.totalFavorites) this.elements.totalFavorites.textContent = String(totalFavs);
      const statsBar = document.getElementById('statsBar');
      if (statsBar) statsBar.style.display = totalItems > 0 ? 'grid' : 'none';
    } catch (e) {
      console.warn('updateStats error', e);
    }
  }
  updateFilterCounts() {
    const counts = {
      all: this.state.data.length,
      favorites: this.state.data.filter(i => i.isFavorite).length,
      resumen: this.state.data.filter(i => i.type === 'resumen').length,
      verdadero_falso: this.state.data.filter(i => i.type === 'verdadero_falso').length,
      multiple_choice: this.state.data.filter(i => i.type === 'multiple_choice').length,
      mapa_mental: this.state.data.filter(i => i.type === 'mapa_mental').length,
      flashcards: this.state.data.filter(i => i.type === 'flashcards').length
    };
    Object.entries(this.elements.filterCounts || {}).forEach(([key, el]) => {
      if (el && key in counts) el.textContent = String(counts[key]);
    });
  }
  updatePagination() {
    const totalItems = this.state.filteredData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / this.config.itemsPerPage));
    const current = Math.min(this.state.currentPage, totalPages);
    this.state.currentPage = current;
    if (this.elements.pagination) {
      this.elements.pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
    if (this.elements.pageInfo) {
      this.elements.pageInfo.textContent = `Página ${current} de ${totalPages}`;
    }
    if (this.elements.prevPage) this.elements.prevPage.disabled = current <= 1;
    if (this.elements.nextPage) this.elements.nextPage.disabled = current >= totalPages;
  }
  updateUI() {
    // Vista activa del grid/list
    if (this.elements.contentGrid) {
      this.elements.contentGrid.classList.toggle('list-view', this.state.currentView === 'list');
    }
    if (this.elements.gridView) {
      this.elements.gridView.classList.toggle('active', this.state.currentView === 'grid');
      this.elements.gridView.setAttribute('aria-pressed', String(this.state.currentView === 'grid'));
    }
    if (this.elements.listView) {
      this.elements.listView.classList.toggle('active', this.state.currentView === 'list');
      this.elements.listView.setAttribute('aria-pressed', String(this.state.currentView === 'list'));
    }
    if (this.elements.sortSelect) {
      this.elements.sortSelect.value = this.state.currentSort;
    }
    if (this.elements.clearSearch) {
      this.elements.clearSearch.style.display = this.state.searchQuery ? 'flex' : 'none';
    }
  }
  animateCardEntrance() {
    // Las tarjetas ya tienen animación CSS; aquí podríamos añadir lógica adicional si fuera necesario
  }
  toggleFavorite(itemId) {
    const idStr = String(itemId);
    const item = this.state.data.find(i => String(i.id) === idStr);
    if (!item) return;

    item.isFavorite = !item.isFavorite;

    // Actualizar arreglo de favoritos persistente
    const set = new Set(this.state.favorites.map(v => String(v)));
    if (item.isFavorite) {
      set.add(idStr);
      this.showNotification('success', 'Añadido a favoritos');
    } else {
      set.delete(idStr);
      this.showNotification('info', 'Quitado de favoritos');
    }
    this.state.favorites = Array.from(set);
    this.saveFavorites();

    // Actualizar UI del card si está presente
    const card = this.elements.contentGrid?.querySelector(`.content-card[data-item-id="${CSS.escape(idStr)}"]`);
    if (card) {
      const favBtn = card.querySelector('.favorite-btn');
      if (favBtn) favBtn.classList.toggle('active', item.isFavorite);
    }

    // Si estamos filtrando por favoritos, re-filtrar
    if (this.state.currentFilter === 'favorites') {
      this.applyFiltersAndSort();
      this.renderContent();
      this.updatePagination();
    }

    // Actualizar contadores
    this.updateStats();
    this.updateFilterCounts();
  }
  showContextMenu(itemId, button) {
    // Cerrar menús existentes
    document.querySelectorAll('.hist-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'hist-context-menu';
    menu.setAttribute('role', 'menu');
    menu.style.position = 'absolute';
    menu.style.zIndex = '1000';
    menu.style.minWidth = '180px';
    menu.style.background = '#fff';
    menu.style.border = '1px solid #e2e8f0';
    menu.style.borderRadius = '10px';
    menu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.12)';
    menu.style.padding = '6px';

    const item = this.state.data.find(i => String(i.id) === String(itemId));

    const addItem = (label, action, icon = '') => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'menu-item';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '8px';
      el.style.width = '100%';
      el.style.padding = '10px 12px';
      el.style.border = 'none';
      el.style.background = 'transparent';
      el.style.cursor = 'pointer';
      el.style.borderRadius = '8px';
      el.onmouseenter = () => { el.style.background = '#f8fafc'; };
      el.onmouseleave = () => { el.style.background = 'transparent'; };
      el.textContent = label;
      el.addEventListener('click', () => {
        action();
        closeMenu();
      });
      menu.appendChild(el);
    };

    addItem('Ver', () => this.viewContent(itemId));
    addItem('Estudiar', () => this.startStudyMode(itemId));
    addItem(item?.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos', () => this.toggleFavorite(itemId));
    addItem('Copiar enlace', async () => {
      try {
        const url = this.buildContentUrl(item, { mode: 'view' });
        await navigator.clipboard.writeText(window.location.origin + url);
        this.showNotification('success', 'Enlace copiado');
      } catch (e) {
        this.showNotification('error', 'No se pudo copiar el enlace');
      }
    });

    document.body.appendChild(menu);

    // Posicionar
    const rect = button.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 8;
    const left = window.scrollX + rect.right - 180; // ancho aprox
    menu.style.top = `${top}px`;
    menu.style.left = `${Math.max(8, left)}px`;

    const closeMenu = () => {
      menu.remove();
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onEsc, true);
    };
    const onDocClick = (e) => {
      if (!menu.contains(e.target) && e.target !== button) closeMenu();
    };
    const onEsc = (e) => { if (e.key === 'Escape') closeMenu(); };
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onEsc, true);
    });
  }
  generateContentPreview(content, type) {
    try {
      if (!content) return 'Vista previa...';
      switch (type) {
        case 'resumen':
          return this.escapeHtml((content.resumen_general || '').slice(0, 160)) + '…';
        case 'multiple_choice':
        case 'verdadero_falso':
          const preguntas = (content.preguntas || []).map(p => p.enunciado).filter(Boolean);
          return this.escapeHtml(preguntas.slice(0, 2).join(' • '));
        case 'mapa_mental':
          return this.escapeHtml((content.nodo_central || 'Mapa mental'));
        case 'flashcards':
          return `${(content.tarjetas || []).length} tarjetas`;
        default:
          return 'Vista previa...';
      }
    } catch {
      return 'Vista previa...';
    }
  }
  getContentSize(content) {
    if (!content) return '';
    try {
      if (Array.isArray(content.preguntas)) return `${content.preguntas.length} ítems`;
      if (Array.isArray(content.tarjetas)) return `${content.tarjetas.length} tarjetas`;
      if (Array.isArray(content.conceptos_clave)) return `${content.conceptos_clave.length} conceptos`;
    } catch {}
    return 'Tamaño medio';
  }
  getTypeName(type) {
    const map = {
      resumen: 'RESUMEN',
      verdadero_falso: 'V/F',
      multiple_choice: 'MÚLTIPLE',
      mapa_mental: 'MAPA MENTAL',
      flashcards: 'FLASHCARDS'
    };
    return map[type] || String(type || '').replace('_', ' ').toUpperCase();
  }
  getTypeIcon(type) { return '📄'; }
  generateFallbackData() { return []; }
  handleKeyboardShortcuts(event) {
    const isTyping = ['INPUT', 'TEXTAREA'].includes((event.target || {}).tagName);
    if (isTyping) return;
    if (event.key === 'g') this.setView('grid');
    if (event.key === 'l') this.setView('list');
    if (event.key === 'f') this.handleFilter('favorites');
    if (event.key === 'Escape') {
      document.querySelectorAll('.hist-context-menu').forEach(m => m.remove());
    }
  }
  loadLazyContent(element) { /* No-op: reservado para futuras cargas diferidas */ }
  updateCardState(card, item) {
    const favBtn = card.querySelector('.favorite-btn');
    if (favBtn) favBtn.classList.toggle('active', !!item.isFavorite);
  }
  viewContent(itemId) {
    // Navegar al contenido seleccionado usando los mismos parámetros que utilizan las páginas de detalle
    try {
      const item = this.state?.data?.find(d => String(d.id) === String(itemId));
      if (!item) {
        this.showError('Contenido no encontrado', 'No se pudo localizar el elemento seleccionado');
        return;
      }
      const url = this.buildContentUrl(item, { mode: 'view' });
      this.trackEvent('navigate_view', { itemId: itemId, type: item.type });
      window.location.href = url;
    } catch (error) {
      console.error('Error al abrir contenido:', error);
      this.showError('Error al abrir contenido', 'Inténtalo nuevamente más tarde');
    }
  }
  startStudyMode(itemId) {
    // Iniciar modo estudio con posible pre-carga para flashcards
    try {
      const item = this.state?.data?.find(d => String(d.id) === String(itemId));
      if (!item) {
        this.showError('Contenido no encontrado', 'No se pudo localizar el elemento seleccionado');
        return;
      }
      if (item.type === 'flashcards') {
        try {
          sessionStorage.setItem('currentFlashcards', JSON.stringify(item));
        } catch (e) {
          console.warn('No se pudo pre-cargar flashcards en sessionStorage:', e);
        }
      }
      const url = this.buildContentUrl(item, { mode: 'study' });
      this.trackEvent('navigate_study', { itemId: itemId, type: item.type });
      window.location.href = url;
    } catch (error) {
      console.error('Error al iniciar modo estudio:', error);
      this.showError('Error al iniciar estudio', 'Inténtalo nuevamente más tarde');
    }
  }
  // Implementaciones finales (reemplazan stubs previos)
  exportFavorites() {
    try {
      const favorites = (this.state.data || []).filter(i => i.isFavorite);
      if (!favorites.length) {
        this.showNotification('info', 'No tienes favoritos para exportar');
        return;
      }
      const exportPayload = {
        meta: {
          exportedAt: new Date().toISOString(),
          app: 'P.I.E.P. Historial',
          count: favorites.length
        },
        items: favorites.map(i => ({
          id: i.id,
          type: i.type,
          pdf_id: i.pdf_id ?? null,
          pdf_name: i.pdf_name || i.pdf_title || null,
          created_at: i.created_at || i.date || null,
          content: i.content ?? null
        }))
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const ts = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const fileName = `favoritos_historial_${ts.getFullYear()}${pad(ts.getMonth()+1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      this.trackEvent('export_favorites', { count: favorites.length });
      this.showNotification('success', `Exportados ${favorites.length} favoritos`);
    } catch (e) {
      console.error('Error exportFavorites:', e);
      this.showNotification('error', 'No se pudo exportar tus favoritos');
    }
  }

  async confirmDeleteAll() {
    try {
      const total = this.state.data.length;
      if (!total) {
        this.showNotification('info', 'No hay contenido para borrar');
        return;
      }
      const ok = window.confirm(`¿Seguro que deseas eliminar ${total} elementos de tu historial? Esta acción no se puede deshacer.`);
      if (!ok) return;

      this.showLoading(true);
      const ids = this.state.data.map(i => i.id);
      let success = 0; let failed = 0;

      for (const id of ids) {
        try {
          const resp = await this.apiCall(`/api/historial/content/${id}`, { method: 'DELETE' });
          if (resp && resp.ok) success++; else failed++;
        } catch (e) {
          failed++;
        }
      }

      // Actualizar estado local
      const deletedIds = new Set(ids.map(String));
      this.state.data = this.state.data.filter(i => !deletedIds.has(String(i.id)));
      this.state.favorites = this.state.favorites.filter(fid => !deletedIds.has(String(fid)));
      this.saveFavorites();
      this.applyFiltersAndSort();
      this.render();

      this.trackEvent('delete_all', { total, success, failed });
      if (failed === 0) {
        this.showNotification('success', `Se eliminaron ${success} elementos`);
      } else {
        this.showNotification('warning', `Eliminados ${success}, fallidos ${failed}`);
      }
    } catch (e) {
      console.error('Error eliminando todo:', e);
      this.showNotification('error', 'No se pudieron eliminar todos los elementos');
    } finally {
      this.showLoading(false);
    }
  }

  buildContentUrl(item, { mode } = {}) {
    const typeToPage = {
      resumen: '/resumen.html',
      verdadero_falso: '/verdadero-falso.html',
      multiple_choice: '/multiple-choice.html',
      mapa_mental: '/mapa-mental.html',
      flashcards: '/flashcards.html'
    };
    const base = typeToPage[item.type] || '/index.html';
    const params = new URLSearchParams();
    const fileName = item.pdf_name || item.pdf_title || 'Documento';
    if (item.type === 'flashcards') {
      params.set('id', String(item.id));
    } else {
      if (item.pdf_id) params.set('pdfId', String(item.pdf_id));
      params.set('outputId', String(item.id));
    }
    if (fileName) params.set('fileName', fileName);
    if (mode) params.set('mode', mode);
    return `${base}?${params.toString()}`;
  }
}

// ...

// Inicialización global (restaurada)
let historialUnified;

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHistorial);
  } else {
    initializeHistorial();
  }
}

function initializeHistorial() {
  if (!historialUnified) {
    historialUnified = new HistorialUnified();
    window.historialUnified = historialUnified; // Exponer globalmente
  }
}

// Exponer funciones globales para compatibilidad
window.initializeHistorial = initializeHistorial;
window.refreshHistorial = () => historialUnified?.loadData();