// Historial Optimizado - StudyAI v2.0
// Manejo avanzado del historial con paginación, filtros mejorados y mejor rendimiento

class HistorialManager {
  constructor() {
    this.data = [];
    this.filteredData = [];
    this.currentFilter = 'all';
    this.currentSort = 'newest';
    this.currentView = 'grid';
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.isLoading = false;
    this.searchQuery = '';
    this.favorites = this.loadFavorites();
    
    // Cache para optimización
    this.cache = new Map();
    this.renderCache = new Map();
    
    // Elementos DOM
    this.elements = {};
    
    // Métricas de uso
    this.metrics = {
      loadTime: 0,
      totalInteractions: 0,
      searchQueries: 0,
      favoritesToggled: 0
    };
    
    this.init();
  }

  // Inicialización del sistema
  async init() {
    try {
      console.log('🚀 Inicializando Historial Optimizado v2.0...');
      this.startLoadTime();
      
      this.bindElements();
      this.setupEventListeners();
      this.setupIntersectionObserver();
      
      await this.loadData();
      this.render();
      
      this.endLoadTime();
      console.log(`✅ Historial inicializado en ${this.metrics.loadTime}ms`);
    } catch (error) {
      console.error('❌ Error en inicialización:', error);
      this.showError('Error al cargar el historial', error.message);
    }
  }

  // Vincular elementos DOM
  bindElements() {
    const elementIds = [
      'contentGrid', 'emptyState', 'noResultsState', 'loadingIndicator',
      'searchInput', 'clearSearch', 'sortSelect', 'gridView', 'listView',
      'totalItems', 'totalPdfs', 'totalFavorites', 'studyTime',
      'filterIndicator', 'filterText', 'clearFilters',
      'pagination', 'prevPage', 'nextPage', 'pageInfo',
      'exportFavorites', 'deleteAll', 'statusIndicators'
    ];
    
    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
    });
    
    this.elements.filterBtns = document.querySelectorAll('.filter-btn');
    this.elements.filterCounts = {};
    
    // Vincular contadores de filtros
    ['all', 'favorites', 'resumen', 'verdadero_falso', 'multiple_choice', 'mapa_mental', 'flashcards'].forEach(filter => {
      this.elements.filterCounts[filter] = document.getElementById(`count-${filter}`);
    });
  }

  // Configurar event listeners optimizados
  setupEventListeners() {
    // Búsqueda con debounce
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', 
        this.debounce((e) => this.handleSearch(e.target.value), 300)
      );
    }
    
    // Limpiar búsqueda
    if (this.elements.clearSearch) {
      this.elements.clearSearch.addEventListener('click', () => this.clearSearch());
    }
    
    // Filtros
    this.elements.filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.filter));
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
    
    // Limpiar filtros
    if (this.elements.clearFilters) {
      this.elements.clearFilters.addEventListener('click', () => this.clearAllFilters());
    }
  }

  // Observer para lazy loading
  setupIntersectionObserver() {
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            this.imageObserver.unobserve(img);
          }
        }
      });
    }, { rootMargin: '50px' });
  }

  // Cargar datos desde API
  async loadData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading(true);
    
    try {
      // Verificar cache
      const cacheKey = 'historial-data';
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData && this.isCacheValid(cachedData.timestamp)) {
        this.data = cachedData.data;
        console.log('📊 Datos cargados desde cache');
      } else {
        // Llamar API
        if (typeof apiCall === 'function') {
          const response = await apiCall('/api/study/outputs');
          if (response && response.ok) {
            this.data = await response.json();
            
            // Guardar en cache
            this.cache.set(cacheKey, {
              data: this.data,
              timestamp: Date.now()
            });
            
            console.log(`📡 ${this.data.length} elementos cargados desde API`);
          } else {
            throw new Error('Error en la respuesta de la API');
          }
        } else {
          console.warn('⚠️ apiCall no disponible, usando datos de prueba');
          this.data = this.generateTestData();
        }
      }
      
      this.processData();
      this.updateFilterCounts();
      
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.showError('Error al cargar el historial', error.message);
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  // Procesar y enriquecer datos
  processData() {
    this.data = this.data.map(item => ({
      ...item,
      searchText: this.generateSearchText(item),
      displayDate: this.formatDate(item.created_at),
      isFavorite: this.favorites.includes(item.id.toString()),
      typeIcon: this.getTypeIcon(item.type),
      typeName: this.getTypeName(item.type)
    }));
    
    this.applyFiltersAndSort();
  }

  // Generar texto de búsqueda optimizado
  generateSearchText(item) {
    const texts = [
      item.pdf_title || item.pdf_name || '',
      this.getTypeName(item.type),
      this.getContentText(item.content, item.type),
      this.formatDate(item.created_at)
    ];
    
    return texts.join(' ').toLowerCase();
  }

  // Extraer texto del contenido para búsqueda
  getContentText(content, type) {
    if (!content) return '';
    
    try {
      switch(type) {
        case 'resumen':
          return [
            content.resumen_general || '',
            (content.conceptos_clave || []).join(' '),
            content.conclusiones || ''
          ].join(' ');
        
        case 'multiple_choice':
        case 'verdadero_falso':
          return (content.preguntas || []).map(p => 
            `${p.enunciado} ${p.explicacion} ${(p.opciones || []).join(' ')}`
          ).join(' ');
        
        case 'flashcards':
          return (content.cards || []).map(card => 
            `${card.pregunta || card.frente} ${card.respuesta || card.reverso}`
          ).join(' ');
        
        case 'mapa_mental':
          const ramas = (content.ramas || []).map(rama => 
            `${rama.titulo} ${(rama.items || []).join(' ')}`
          ).join(' ');
          return `${content.nodo_central} ${ramas}`;
        
        default:
          return JSON.stringify(content);
      }
    } catch (error) {
      console.warn('Error extrayendo texto de contenido:', error);
      return '';
    }
  }

  // Aplicar filtros y ordenamiento
  applyFiltersAndSort() {
    let filtered = [...this.data];
    
    // Aplicar filtro
    if (this.currentFilter === 'favorites') {
      filtered = filtered.filter(item => item.isFavorite);
    } else if (this.currentFilter !== 'all') {
      filtered = filtered.filter(item => item.type === this.currentFilter);
    }
    
    // Aplicar búsqueda
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.searchText.includes(query)
      );
    }
    
    // Aplicar ordenamiento
    filtered.sort((a, b) => {
      switch(this.currentSort) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'type':
          return a.typeName.localeCompare(b.typeName);
        case 'pdf':
          return (a.pdf_title || a.pdf_name || '').localeCompare(b.pdf_title || b.pdf_name || '');
        default:
          return 0;
      }
    });
    
    this.filteredData = filtered;
    this.currentPage = 1; // Reset página
    
    console.log(`🔍 Filtros aplicados: ${filtered.length} elementos`);
  }

  // Renderizar contenido principal
  render() {
    this.updateStats();
    this.updateFilterIndicator();
    this.updatePagination();
    this.renderContent();
    this.updateToolsVisibility();
  }

  // Renderizar contenido con paginación
  renderContent() {
    const container = this.elements.contentGrid;
    if (!container) return;
    
    // Mostrar estados especiales
    if (this.filteredData.length === 0) {
      this.showEmptyState();
      return;
    }
    
    this.hideEmptyStates();
    
    // Calcular elementos para la página actual
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const pageItems = this.filteredData.slice(startIndex, endIndex);
    
    // Generar HTML usando cache si está disponible
    const cacheKey = `render-${this.currentView}-${this.currentPage}-${this.currentFilter}-${this.currentSort}`;
    let html = this.renderCache.get(cacheKey);
    
    if (!html) {
      html = this.generateContentHTML(pageItems);
      this.renderCache.set(cacheKey, html);
    }
    
    container.innerHTML = html;
    container.className = `content-grid ${this.currentView}-view`;
    
    // Configurar lazy loading para imágenes
    container.querySelectorAll('img[data-src]').forEach(img => {
      this.imageObserver.observe(img);
    });
    
    // Animar entrada de elementos
    this.animateEntrance(container.children);
  }

  // Generar HTML del contenido
  generateContentHTML(items) {
    return items.map(item => this.generateItemHTML(item)).join('');
  }

  // Generar HTML de un elemento individual
  generateItemHTML(item) {
    const actions = this.generateActionButtons(item);
    const content = this.formatContentPreview(item.content, item.type);
    
    return `
      <div class="content-item" data-id="${item.id}" data-type="${item.type}">
        <div class="item-header">
          <div class="item-type">
            <span class="type-icon">${item.typeIcon}</span>
            <span class="type-name">${item.typeName}</span>
          </div>
          <div class="item-actions">
            <button onclick="historialManager.toggleFavorite('${item.id}')" 
                    class="btn-favorite ${item.isFavorite ? 'active' : ''}" 
                    title="${item.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>
              </svg>
            </button>
            <button onclick="historialManager.confirmDelete('${item.id}')" 
                    class="btn-delete" 
                    title="Eliminar elemento">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="item-content">
          <div class="pdf-info">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
            </svg>
            <span title="${item.pdf_title || item.pdf_name}">${this.truncateText(item.pdf_title || item.pdf_name, 40)}</span>
          </div>
          
          <div class="content-preview">
            ${content}
          </div>
          
          <div class="item-meta">
            <span class="creation-date">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
              </svg>
              ${item.displayDate}
            </span>
          </div>
        </div>
        
        <div class="item-actions-bar">
          ${actions}
        </div>
      </div>
    `;
  }

  // Formatear vista previa del contenido
  formatContentPreview(content, type) {
    if (!content) return '<p class="no-content">Sin contenido disponible</p>';
    
    try {
      switch(type) {
        case 'resumen':
          return `<div class="preview-resumen">
            <p>${this.truncateText(content.resumen_general || 'Sin resumen', 150)}</p>
            ${content.conceptos_clave && content.conceptos_clave.length > 0 ? 
              `<div class="conceptos-preview">
                <strong>Conceptos clave:</strong> ${content.conceptos_clave.slice(0, 3).join(', ')}
                ${content.conceptos_clave.length > 3 ? '...' : ''}
              </div>` : ''
            }
          </div>`;
        
        case 'multiple_choice':
        case 'verdadero_falso':
          const preguntasCount = content.preguntas?.length || 0;
          return `<div class="preview-quiz">
            <div class="quiz-stats">
              <span class="question-count">${preguntasCount} preguntas</span>
            </div>
            ${preguntasCount > 0 ? 
              `<p class="first-question">${this.truncateText(content.preguntas[0].enunciado, 100)}</p>` : ''
            }
          </div>`;
        
        case 'flashcards':
          const cardsCount = content.cards?.length || 0;
          return `<div class="preview-flashcards">
            <div class="cards-stats">
              <span class="cards-count">${cardsCount} tarjetas</span>
            </div>
            ${cardsCount > 0 ? 
              `<div class="card-preview">
                <strong>Ejemplo:</strong> ${this.truncateText(content.cards[0].pregunta || content.cards[0].frente, 80)}
              </div>` : ''
            }
          </div>`;
        
        case 'mapa_mental':
          return `<div class="preview-mapa">
            <div class="central-node">
              <strong>${content.nodo_central || 'Nodo central'}</strong>
            </div>
            <div class="branches-count">
              ${(content.ramas?.length || 0)} ramas principales
            </div>
          </div>`;
        
        default:
          return '<div class="preview-generic">Contenido disponible para revisión</div>';
      }
    } catch (error) {
      console.warn('Error formateando preview:', error);
      return '<div class="preview-error">Error al mostrar vista previa</div>';
    }
  }

  // Generar botones de acción
  generateActionButtons(item) {
    const actions = this.getActionConfig(item.type);
    
    return actions.map(action => `
      <button onclick="historialManager.handleAction('${action.key}', '${item.id}')" 
              class="action-btn ${action.class}" 
              title="${action.title}">
        <span class="btn-icon">${action.icon}</span>
        <span class="btn-text">${action.text}</span>
      </button>
    `).join('');
  }

  // Configuración de acciones por tipo
  getActionConfig(type) {
    const configs = {
      'resumen': [
        { key: 'view', icon: '👁️', text: 'Ver', class: 'primary', title: 'Ver resumen completo' },
        { key: 'export', icon: '📄', text: 'Exportar', class: 'secondary', title: 'Exportar como PDF' }
      ],
      'multiple_choice': [
        { key: 'practice', icon: '🎯', text: 'Practicar', class: 'primary', title: 'Iniciar práctica' },
        { key: 'view', icon: '👁️', text: 'Revisar', class: 'secondary', title: 'Revisar preguntas' }
      ],
      'verdadero_falso': [
        { key: 'practice', icon: '✅', text: 'Practicar', class: 'primary', title: 'Iniciar práctica' },
        { key: 'view', icon: '👁️', text: 'Revisar', class: 'secondary', title: 'Revisar preguntas' }
      ],
      'flashcards': [
        { key: 'study', icon: '📚', text: 'Estudiar', class: 'primary', title: 'Abrir modo estudio' },
        { key: 'export', icon: '📋', text: 'Exportar', class: 'secondary', title: 'Exportar tarjetas' }
      ],
      'mapa_mental': [
        { key: 'interactive', icon: '🧠', text: 'Interactivo', class: 'primary', title: 'Ver mapa interactivo' },
        { key: 'export', icon: '🖼️', text: 'Imagen', class: 'secondary', title: 'Exportar como imagen' }
      ]
    };
    
    return configs[type] || [
      { key: 'view', icon: '👁️', text: 'Ver', class: 'primary', title: 'Ver contenido' }
    ];
  }

  // Manejar acciones de contenido
  async handleAction(action, itemId) {
    const item = this.data.find(i => i.id == itemId);
    if (!item) {
      console.error('Item no encontrado:', itemId);
      return;
    }

    this.trackInteraction('action', { action, type: item.type });

    try {
      switch(action) {
        case 'view':
          this.openContentModal(item);
          break;
        case 'practice':
          this.startPracticeMode(item);
          break;
        case 'study':
          this.openStudyMode(item);
          break;
        case 'interactive':
          this.openInteractiveMode(item);
          break;
        case 'export':
          this.exportContent(item);
          break;
        default:
          console.warn('Acción no implementada:', action);
          this.showToast('⚠️ Funcionalidad en desarrollo');
      }
    } catch (error) {
      console.error('Error ejecutando acción:', error);
      this.showToast('❌ Error al ejecutar la acción');
    }
  }

  // Funciones de acción específicas
  openContentModal(item) {
    // Implementar modal de vista completa
    console.log('Abriendo modal para:', item);
    this.showToast('📖 Abriendo vista completa...');
  }

  startPracticeMode(item) {
    // Guardar datos en sessionStorage y abrir modo práctica
    const practiceData = {
      id: item.id,
      type: item.type,
      content: item.content,
      pdf_title: item.pdf_title || item.pdf_name
    };
    
    sessionStorage.setItem('practiceData', JSON.stringify(practiceData));
    
    // Determinar URL según el tipo
    const urls = {
      'multiple_choice': '/test-historial.html',
      'verdadero_falso': '/test-historial.html'
    };
    
    const url = urls[item.type];
    if (url) {
      window.open(url, '_blank');
      this.showToast('🎯 Iniciando modo práctica...');
    }
  }

  openStudyMode(item) {
    if (item.type === 'flashcards') {
      const flashcardsData = {
        id: item.id,
        content: item.content,
        pdf_title: item.pdf_title || item.pdf_name,
        created_at: item.created_at
      };
      
      sessionStorage.setItem('currentFlashcards', JSON.stringify(flashcardsData));
      window.open('/flashcards.html', '_blank');
      this.showToast('📚 Abriendo modo estudio...');
    }
  }

  openInteractiveMode(item) {
    if (item.type === 'mapa_mental') {
      const mapData = {
        id: item.id,
        content: item.content,
        pdf_title: item.pdf_title || item.pdf_name,
        created_at: item.created_at
      };
      
      sessionStorage.setItem('currentMapaMental', JSON.stringify(mapData));
      window.open('/mapa-mental.html', '_blank');
      this.showToast('🧠 Abriendo mapa interactivo...');
    }
  }

  exportContent(item) {
    // Generar y descargar contenido
    const exportData = this.generateExportData(item);
    this.downloadAsFile(exportData.content, exportData.filename);
    this.showToast(`📄 ${item.typeName} exportado`);
  }

  // Generar datos de exportación
  generateExportData(item) {
    const timestamp = new Date().toISOString().split('T')[0];
    let content = `${item.typeName.toUpperCase()} - ${item.pdf_title || item.pdf_name}\n`;
    content += `Generado: ${item.displayDate}\n`;
    content += `Exportado: ${new Date().toLocaleString()}\n\n`;
    content += '='.repeat(50) + '\n\n';
    
    try {
      switch(item.type) {
        case 'resumen':
          if (item.content.resumen_general) {
            content += `RESUMEN GENERAL:\n${item.content.resumen_general}\n\n`;
          }
          if (item.content.conceptos_clave) {
            content += `CONCEPTOS CLAVE:\n`;
            item.content.conceptos_clave.forEach(concepto => {
              content += `• ${concepto}\n`;
            });
            content += '\n';
          }
          break;
          
        case 'flashcards':
          const cards = item.content.cards || [];
          content += `FLASHCARDS (${cards.length} tarjetas):\n\n`;
          cards.forEach((card, index) => {
            content += `TARJETA ${index + 1}\n`;
            content += `P: ${card.pregunta || card.frente}\n`;
            content += `R: ${card.respuesta || card.reverso}\n\n`;
          });
          break;
          
        // Agregar más casos según necesidad
        default:
          content += JSON.stringify(item.content, null, 2);
      }
    } catch (error) {
      console.error('Error generando exportación:', error);
      content += 'Error al procesar el contenido para exportación';
    }
    
    return {
      content,
      filename: `${item.type}-${item.id}-${timestamp}.txt`
    };
  }

  // Manejo de favoritos optimizado
  toggleFavorite(itemId) {
    const item = this.data.find(i => i.id == itemId);
    if (!item) return;
    
    const itemIdStr = itemId.toString();
    const wasFavorite = this.favorites.includes(itemIdStr);
    
    if (wasFavorite) {
      this.favorites = this.favorites.filter(id => id !== itemIdStr);
      item.isFavorite = false;
      this.showToast('💔 Removido de favoritos');
    } else {
      this.favorites.push(itemIdStr);
      item.isFavorite = true;
      this.showToast('❤️ Agregado a favoritos');
    }
    
    this.saveFavorites();
    this.trackInteraction('favorite', { itemId, action: wasFavorite ? 'remove' : 'add' });
    
    // Actualizar UI
    this.updateFavoriteButton(itemId, !wasFavorite);
    this.updateFilterCounts();
    
    if (this.currentFilter === 'favorites') {
      this.applyFiltersAndSort();
      this.render();
    }
  }

  // Actualizar botón de favorito
  updateFavoriteButton(itemId, isFavorite) {
    const btn = document.querySelector(`[onclick*="toggleFavorite('${itemId}')"]`);
    if (btn) {
      btn.classList.toggle('active', isFavorite);
      btn.title = isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos';
    }
  }

  // Manejo de búsqueda
  handleSearch(query) {
    this.searchQuery = query.trim();
    this.trackInteraction('search', { query: this.searchQuery });
    
    // Mostrar/ocultar botón de limpiar
    if (this.elements.clearSearch) {
      this.elements.clearSearch.style.display = this.searchQuery ? 'flex' : 'none';
    }
    
    this.applyFiltersAndSort();
    this.render();
  }

  clearSearch() {
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    if (this.elements.clearSearch) {
      this.elements.clearSearch.style.display = 'none';
    }
    
    this.handleSearch('');
  }

  // Manejo de filtros
  handleFilter(filter) {
    if (!filter || this.currentFilter === filter) return;
    
    this.currentFilter = filter;
    this.trackInteraction('filter', { filter });
    
    // Actualizar UI de filtros
    this.elements.filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    this.applyFiltersAndSort();
    this.render();
  }

  // Manejo de ordenamiento
  handleSort(sort) {
    if (this.currentSort === sort) return;
    
    this.currentSort = sort;
    this.trackInteraction('sort', { sort });
    
    this.applyFiltersAndSort();
    this.render();
  }

  // Cambiar vista
  setView(view) {
    if (this.currentView === view) return;
    
    this.currentView = view;
    this.trackInteraction('view', { view });
    
    // Actualizar botones de vista
    if (this.elements.gridView && this.elements.listView) {
      this.elements.gridView.classList.toggle('active', view === 'grid');
      this.elements.listView.classList.toggle('active', view === 'list');
    }
    
    // Limpiar cache de renderizado
    this.renderCache.clear();
    
    this.renderContent();
  }

  // Paginación
  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderContent();
      this.updatePagination();
      this.scrollToTop();
    }
  }

  nextPage() {
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderContent();
      this.updatePagination();
      this.scrollToTop();
    }
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
    const showPagination = totalPages > 1;
    
    if (this.elements.pagination) {
      this.elements.pagination.style.display = showPagination ? 'flex' : 'none';
    }
    
    if (showPagination) {
      if (this.elements.prevPage) {
        this.elements.prevPage.disabled = this.currentPage <= 1;
      }
      if (this.elements.nextPage) {
        this.elements.nextPage.disabled = this.currentPage >= totalPages;
      }
      if (this.elements.pageInfo) {
        this.elements.pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
      }
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Actualizar estadísticas
  updateStats() {
    const stats = this.calculateStats();
    
    if (this.elements.totalItems) {
      this.elements.totalItems.textContent = this.filteredData.length;
    }
    if (this.elements.totalPdfs) {
      this.elements.totalPdfs.textContent = stats.uniquePdfs;
    }
    if (this.elements.totalFavorites) {
      this.elements.totalFavorites.textContent = this.favorites.length;
    }
    if (this.elements.studyTime) {
      this.elements.studyTime.textContent = stats.estimatedStudyTime;
    }
  }

  calculateStats() {
    const uniquePdfs = [...new Set(this.filteredData.map(item => item.pdf_id))].length;
    
    // Estimar tiempo de estudio basado en tipo de contenido
    const studyMinutes = this.filteredData.reduce((total, item) => {
      const times = {
        'resumen': 3,
        'multiple_choice': 5,
        'verdadero_falso': 3,
        'flashcards': 10,
        'mapa_mental': 7
      };
      return total + (times[item.type] || 5);
    }, 0);
    
    const estimatedStudyTime = studyMinutes >= 60 ? 
      `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m` : 
      `${studyMinutes}m`;
    
    return {
      uniquePdfs,
      estimatedStudyTime
    };
  }

  // Actualizar contadores de filtros
  updateFilterCounts() {
    const counts = {
      all: this.data.length,
      favorites: this.favorites.length,
      resumen: this.data.filter(item => item.type === 'resumen').length,
      verdadero_falso: this.data.filter(item => item.type === 'verdadero_falso').length,
      multiple_choice: this.data.filter(item => item.type === 'multiple_choice').length,
      mapa_mental: this.data.filter(item => item.type === 'mapa_mental').length,
      flashcards: this.data.filter(item => item.type === 'flashcards').length
    };
    
    Object.keys(counts).forEach(filter => {
      const element = this.elements.filterCounts[filter];
      if (element) {
        element.textContent = counts[filter];
        element.style.display = counts[filter] > 0 ? 'inline' : 'none';
      }
    });
  }

  // Actualizar indicador de filtros
  updateFilterIndicator() {
    if (!this.elements.filterIndicator) return;
    
    let text = '';
    if (this.currentFilter === 'all' && !this.searchQuery) {
      text = `Mostrando todos los elementos (${this.filteredData.length})`;
    } else {
      const filters = [];
      if (this.currentFilter !== 'all') {
        filters.push(this.getTypeName(this.currentFilter));
      }
      if (this.searchQuery) {
        filters.push(`"${this.searchQuery}"`);
      }
      text = `Filtrado por: ${filters.join(', ')} (${this.filteredData.length} resultados)`;
    }
    
    if (this.elements.filterText) {
      this.elements.filterText.textContent = text;
    }
    
    const hasFilters = this.currentFilter !== 'all' || this.searchQuery;
    if (this.elements.clearFilters) {
      this.elements.clearFilters.style.display = hasFilters ? 'flex' : 'none';
    }
  }

  // Limpiar todos los filtros
  clearAllFilters() {
    this.currentFilter = 'all';
    this.searchQuery = '';
    
    // Actualizar UI
    if (this.elements.searchInput) {
      this.elements.searchInput.value = '';
    }
    if (this.elements.clearSearch) {
      this.elements.clearSearch.style.display = 'none';
    }
    
    this.elements.filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
    
    this.applyFiltersAndSort();
    this.render();
  }

  // Mostrar/ocultar estados vacíos
  showEmptyState() {
    this.hideAllElements();
    
    if (this.searchQuery || this.currentFilter !== 'all') {
      this.showElement('noResultsState');
    } else {
      this.showElement('emptyState');
    }
  }

  hideEmptyStates() {
    this.hideElement('emptyState');
    this.hideElement('noResultsState');
  }

  // Mostrar loading
  showLoading(show) {
    if (this.elements.statusIndicators) {
      this.elements.statusIndicators.style.display = show ? 'block' : 'none';
    }
    if (this.elements.loadingIndicator) {
      this.elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  // Utilidades de UI
  showElement(elementId) {
    const element = this.elements[elementId];
    if (element) element.style.display = 'flex';
  }

  hideElement(elementId) {
    const element = this.elements[elementId];
    if (element) element.style.display = 'none';
  }

  hideAllElements() {
    if (this.elements.contentGrid) {
      this.elements.contentGrid.innerHTML = '';
    }
  }

  // Actualizar visibilidad de herramientas
  updateToolsVisibility() {
    const hasFavorites = this.favorites.length > 0;
    const hasData = this.data.length > 0;
    
    if (this.elements.exportFavorites) {
      this.elements.exportFavorites.style.display = hasFavorites ? 'flex' : 'none';
    }
    if (this.elements.deleteAll) {
      this.elements.deleteAll.style.display = hasData ? 'flex' : 'none';
    }
  }

  // Animaciones
  animateEntrance(elements) {
    Array.from(elements).forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        el.style.transition = 'all 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }

  // Funciones utilitarias
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
      
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
  }

  getTypeName(type) {
    const names = {
      'resumen': 'Resumen',
      'multiple_choice': 'Multiple Choice',
      'verdadero_falso': 'Verdadero o Falso',
      'mapa_mental': 'Mapa Mental',
      'flashcards': 'Flashcards',
      'chat-qa': 'Preguntas y Respuestas'
    };
    return names[type] || type;
  }

  getTypeIcon(type) {
    const icons = {
      'resumen': '📄',
      'multiple_choice': '🎯',
      'verdadero_falso': '✅',
      'mapa_mental': '🧠',
      'flashcards': '🗂️',
      'chat-qa': '💬'
    };
    return icons[type] || '📝';
  }

  // Manejo de cache
  isCacheValid(timestamp) {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    return (Date.now() - timestamp) < CACHE_DURATION;
  }

  // Favoritos persistentes
  loadFavorites() {
    try {
      const favorites = localStorage.getItem('studyai-favorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch (error) {
      console.warn('Error cargando favoritos:', error);
      return [];
    }
  }

  saveFavorites() {
    try {
      localStorage.setItem('studyai-favorites', JSON.stringify(this.favorites));
    } catch (error) {
      console.warn('Error guardando favoritos:', error);
    }
  }

  // Tracking de métricas
  trackInteraction(type, data = {}) {
    this.metrics.totalInteractions++;
    
    if (type === 'search') {
      this.metrics.searchQueries++;
    }
    if (type === 'favorite') {
      this.metrics.favoritesToggled++;
    }
    
    // Enviar a analytics si está disponible
    if (typeof gtag !== 'undefined') {
      gtag('event', 'historial_interaction', {
        'interaction_type': type,
        'custom_data': data
      });
    }
  }

  startLoadTime() {
    this.metrics.loadStartTime = performance.now();
  }

  endLoadTime() {
    this.metrics.loadTime = Math.round(performance.now() - this.metrics.loadStartTime);
  }

  // Manejo de errores
  showError(title, message) {
    console.error(`${title}: ${message}`);
    // Implementar UI de error si es necesario
  }

  // Toast notifications
  showToast(message, type = 'info') {
    // Crear o reutilizar elemento toast
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // Utilidades de descarga
  downloadAsFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Exportar favoritos
  async exportFavorites() {
    const favoriteItems = this.data.filter(item => 
      this.favorites.includes(item.id.toString())
    );
    
    if (favoriteItems.length === 0) {
      this.showToast('📝 No tienes favoritos para exportar', 'warning');
      return;
    }
    
    let content = `FAVORITOS - StudyAI\n`;
    content += `Exportado: ${new Date().toLocaleString()}\n`;
    content += `Total: ${favoriteItems.length} elementos\n\n`;
    content += '='.repeat(60) + '\n\n';
    
    favoriteItems.forEach((item, index) => {
      content += `${index + 1}. ${item.typeName.toUpperCase()}\n`;
      content += `PDF: ${item.pdf_title || item.pdf_name}\n`;
      content += `Fecha: ${item.displayDate}\n`;
      content += '-'.repeat(40) + '\n\n';
    });
    
    const filename = `favoritos-studyai-${new Date().toISOString().split('T')[0]}.txt`;
    this.downloadAsFile(content, filename);
    this.showToast(`📄 ${favoriteItems.length} favoritos exportados`, 'success');
  }

  // Confirmar eliminación
  confirmDelete(itemId) {
    const item = this.data.find(i => i.id == itemId);
    if (!item) return;
    
    const confirmed = confirm(
      `¿Eliminar este ${item.typeName.toLowerCase()}?\n\n` +
      `PDF: ${item.pdf_title || item.pdf_name}\n` +
      `Fecha: ${item.displayDate}\n\n` +
      `Esta acción no se puede deshacer.`
    );
    
    if (confirmed) {
      this.deleteItem(itemId);
    }
  }

  // Eliminar elemento
  async deleteItem(itemId) {
    try {
      this.showToast('🗑️ Eliminando...', 'info');
      
      // Intentar eliminar del servidor
      if (typeof apiCall === 'function') {
        const response = await apiCall(`/api/study/outputs/${itemId}`, {
          method: 'DELETE'
        });
        
        if (!response || !response.ok) {
          throw new Error('Error del servidor');
        }
      }
      
      // Eliminar de datos locales
      this.data = this.data.filter(item => item.id != itemId);
      
      // Eliminar de favoritos
      this.favorites = this.favorites.filter(id => id !== itemId.toString());
      this.saveFavorites();
      
      // Actualizar vista
      this.applyFiltersAndSort();
      this.render();
      
      this.showToast('✅ Elemento eliminado', 'success');
      
    } catch (error) {
      console.error('Error eliminando elemento:', error);
      this.showToast('❌ Error al eliminar', 'error');
    }
  }

  // Confirmar eliminación masiva
  confirmDeleteAll() {
    if (this.data.length === 0) {
      this.showToast('📝 No hay elementos para eliminar', 'warning');
      return;
    }
    
    const confirmed = confirm(
      `⚠️ ELIMINACIÓN MASIVA\n\n` +
      `Se eliminarán TODOS los ${this.data.length} elementos del historial.\n` +
      `Esta acción NO SE PUEDE DESHACER.\n\n` +
      `¿Continuar?`
    );
    
    if (confirmed) {
      this.deleteAll();
    }
  }

  // Eliminar todos los elementos
  async deleteAll() {
    try {
      this.showToast('🗑️ Eliminando todos los elementos...', 'info');
      
      // Limpiar datos locales
      this.data = [];
      this.filteredData = [];
      this.favorites = [];
      this.saveFavorites();
      
      // Limpiar cache
      this.cache.clear();
      this.renderCache.clear();
      
      // Actualizar vista
      this.render();
      
      this.showToast('✅ Historial limpiado completamente', 'success');
      
    } catch (error) {
      console.error('Error en eliminación masiva:', error);
      this.showToast('❌ Error al limpiar historial', 'error');
    }
  }

  // Generar datos de prueba
  generateTestData() {
    return [
      {
        id: 1,
        type: 'resumen',
        pdf_id: 1,
        pdf_title: 'Introducción a la Física Cuántica',
        content: {
          resumen_general: 'La física cuántica estudia el comportamiento de la materia y la energía a nivel subatómico...',
          conceptos_clave: ['Dualidad onda-partícula', 'Principio de incertidumbre', 'Entrelazamiento cuántico'],
          conclusiones: 'Los principios cuánticos revolucionaron nuestra comprensión del universo.'
        },
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        type: 'multiple_choice',
        pdf_id: 2,
        pdf_title: 'Historia de España - Siglo XX',
        content: {
          preguntas: [
            {
              enunciado: '¿En qué año comenzó la Guerra Civil Española?',
              opciones: ['1934', '1936', '1938', '1939'],
              respuesta: 1,
              explicacion: 'La Guerra Civil Española comenzó el 17 de julio de 1936.'
            }
          ]
        },
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }
}

// Inicializar cuando el DOM esté listo
let historialManager;

document.addEventListener('DOMContentLoaded', () => {
  // Verificar si ya hay una sesión
  if (typeof checkSession === 'function') {
    const sessionStatus = checkSession();
    if (!sessionStatus.hasSession && typeof createDemoSession === 'function') {
      console.log('🔧 Creando sesión demo...');
      createDemoSession();
    }
  }
  
  // Inicializar el historial con un pequeño delay
  setTimeout(() => {
    historialManager = new HistorialManager();
    window.historialManager = historialManager; // Exponer globalmente para las acciones
  }, 500);
});

// Función global para inicializar (compatibilidad)
window.initializeHistorial = function() {
  if (historialManager) {
    console.log('🔄 Reinicializando historial...');
    historialManager.init();
  }
};

console.log('📜 Historial Optimizado v2.0 cargado');