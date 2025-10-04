// Historial de contenido IA - JavaScript

let historialData = [];
let filteredData = [];
let currentFilter = 'all';

// Variables para elementos DOM (se obtendrán dinámicamente)
let contentGrid, emptyState, filterButtons, confirmModal, previewModal;
let totalItems, totalPdfs, favType;

// Utilidades optimizadas
const utils = {
  // Debounce para optimizar eventos frecuentes
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
  },
  
  // Manejo optimizado de errores
  handleError(error, context = 'Operación') {
    const errorMessage = error?.message || error || 'Error desconocido';
    if (process?.env?.NODE_ENV !== 'production') {
      console.error(`❌ ${context}:`, errorMessage);
    }
    return errorMessage;
  },
  
  // Formateo optimizado de fechas con cache
  formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      // Cache del formateador para mejor rendimiento
      if (!this.dateFormatter) {
        this.dateFormatter = new Intl.DateTimeFormat('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      return this.dateFormatter.format(date);
    } catch (error) {
      return 'Fecha inválida';
    }
  }
};

// Función local para hacer llamadas a la API con autenticación
async function apiCall(url, options = {}) {
  // Obtener headers de autenticación
  const getAuthHeaders = () => {
    const session = localStorage.getItem('session');
    if (session) {
      const sessionData = JSON.parse(session);
      return {
        'Content-Type': 'application/json',
        'Authorization': sessionData.access_token ? `Bearer ${sessionData.access_token}` : ''
      };
    }
    return { 'Content-Type': 'application/json' };
  };

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
    const baseUrl = window.location.origin;
    const response = await fetch(baseUrl + url, config);
    
    if (response.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      window.location.replace('/login.html');
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en llamada a API:', error);
    throw error;
  }
}

// Función para obtener elementos DOM
function getHistorialElements() {
  contentGrid = document.getElementById('contentGrid');
  emptyState = document.getElementById('emptyState');
  // historialLoadingOverlay removido - usando módulo UI global
  filterButtons = document.querySelectorAll('.filter-btn');
  confirmModal = document.getElementById('confirmModal');
  previewModal = document.getElementById('previewModal');
  
  // Stats elements
  totalItems = document.getElementById('totalItems');
  totalPdfs = document.getElementById('totalPdfs');
  favType = document.getElementById('favType');
  
  console.log('📱 Elementos DOM obtenidos:', {
    contentGrid: !!contentGrid,
    emptyState: !!emptyState,
    loadingOverlay: true, // Usando módulo UI global
    filterButtons: filterButtons.length,
    totalItems: !!totalItems
  });
}

// Función de inicialización global
window.initializeHistorial = async function() {
  console.log('🚀 Inicializando historial...');
  
  try {
    // Obtener elementos DOM
    getHistorialElements();
    
    if (!contentGrid) {
      console.error('❌ No se encontró el elemento contentGrid');
      return;
    }
    
    // Verificar si hay contenido nuevo generado desde otra página
    const newContentGenerated = sessionStorage.getItem('newContentGenerated');
    if (newContentGenerated === 'true') {
      console.log('🔄 Detectado contenido nuevo, forzando recarga del historial...');
      sessionStorage.removeItem('newContentGenerated');
    }
    
    // Cargar datos del historial
    await loadHistorialData();
    
    // Configurar event listeners
    setupEventListeners();
    
    console.log('✅ Historial inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando historial:', error);
    showError('Error al cargar el historial');
  }
};

    
    // Simular un pequeño delay para mostrar el loader
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Cargar datos y actualizar la interfaz
    await loadHistorialData();
    
    // Configurar datos en el sistema de búsqueda avanzada
    if (advancedSearch && historialData) {
      advancedSearch.setData(historialData);
    }
// Función para aplicar filtros
function applyFilter(filter) {
  currentFilter = filter;
  
  if (filter === 'all') {
    filteredData = [...historialData];
  } else {
    filteredData = historialData.filter(item => item.type === filter);
  }
  
  renderContent();
  updateFilterButtons();
}

// Actualizar botones de filtro
function updateFilterButtons() {
  filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === currentFilter) {
      btn.classList.add('active');
    }
  });
}

// Renderizar contenido del historial

// Crear tarjeta de historial
function createHistorialCard(item) {
  const card = document.createElement('div');
  card.className = 'historial-card';
  
  const typeIcon = getTypeIcon(item.type);
  const typeName = getTypeName(item.type);
  
  card.innerHTML = `
    <div class="historial-card-header">
      <div class="historial-card-icon">${typeIcon}</div>
      <div class="historial-card-type">${typeName}</div>
    </div>
    <div class="historial-card-content">
      <h3 class="historial-card-title">PDF: ${item.pdf_title || 'Sin título'}</h3>
      <p class="historial-card-date">${utils.formatDate(item.created_at)}</p>
      <div class="historial-card-actions">
        <button class="btn-preview" onclick="previewItem(${item.id})">Ver</button>
        <button class="btn-delete" onclick="deleteItem(${item.id})">Eliminar</button>
      </div>
    </div>
  `;
  
  return card;
}

// Obtener icono por tipo
function getTypeIcon(type) {
  const icons = {
    'resumen': '📄',
    'verdadero_falso': '✅',
    'multiple_choice': '🔘',
    'mapa_mental': '🗺️',
    'chat-qa': '💬'
  };
  return icons[type] || '📋';
}

// Obtener nombre por tipo
function getTypeName(type) {
  const names = {
    'resumen': 'Resumen',
    'verdadero_falso': 'Verdadero o Falso',
    'multiple_choice': 'Multiple Choice',
    'mapa_mental': 'Mapa Mental',
    'chat-qa': 'Preguntas y Respuestas'
  };
  return names[type] || 'Contenido';
}

// Función para limpiar recursos del historial
function cleanupHistorial() {
  console.log('🧹 Limpiando recursos del historial...');
  
  // Remover event listeners previos
  const oldFilterButtons = document.querySelectorAll('.filter-btn');
  if (oldFilterButtons) {
    oldFilterButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
  }
  
  // Limpiar botón de limpiar historial
  const oldBtnLimpiar = document.getElementById('btnLimpiarHistorial');
  if (oldBtnLimpiar) {
    const newBtn = oldBtnLimpiar.cloneNode(true);
    if (oldBtnLimpiar.parentNode) {
      oldBtnLimpiar.parentNode.replaceChild(newBtn, oldBtnLimpiar);
    }
  }
  
  // Limpiar botón de limpiar historial en la parte inferior
  const oldBtnLimpiarBottom = document.getElementById('btnLimpiarHistorialBottom');
  if (oldBtnLimpiarBottom) {
    const newBtn = oldBtnLimpiarBottom.cloneNode(true);
    if (oldBtnLimpiarBottom.parentNode) {
      oldBtnLimpiarBottom.parentNode.replaceChild(newBtn, oldBtnLimpiarBottom);
    }
  }
  
  // Limpiar botones de previsualización y eliminación
  const previewButtons = document.querySelectorAll('.preview-btn');
  if (previewButtons && previewButtons.length > 0) {
    previewButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
  }
  
  const deleteButtons = document.querySelectorAll('.delete-btn');
  if (deleteButtons && deleteButtons.length > 0) {
    deleteButtons.forEach(btn => {
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });
  }
  
  // Cerrar modales si están abiertos
  if (confirmModal) confirmModal.style.display = 'none';
  if (previewModal) previewModal.style.display = 'none';
  
  // Eliminar cualquier timeout o interval que pueda estar corriendo
  const highestTimeoutId = setTimeout(";");
  for (let i = 0; i < highestTimeoutId; i++) {
    clearTimeout(i);
  }
  
  // Limpiar variables globales
  historialData = [];
  filteredData = [];
  currentFilter = 'all';
  
  // Limpiar referencias a elementos DOM
  contentGrid = null;
  emptyState = null;
  // historialLoadingOverlay removido - usando módulo UI global
  filterButtons = null;
  confirmModal = null;
  previewModal = null;
  totalItems = null;
  totalPdfs = null;
  favType = null;
}

// Función global para refrescar el historial cuando se genera nuevo contenido
window.refreshHistorial = async function() {
  console.log('🔄 Refrescando historial por nuevo contenido...');
  
  // Solo refrescar si estamos en la página del historial o si los elementos existen
  const historialElements = document.getElementById('contentGrid');
  if (!historialElements) {
    console.log('📋 No estamos en la página del historial, guardando para después...');
    return;
  }
  
  try {
    // Limpiar cualquier estado previo
    cleanupHistorial();
    
    // Obtener elementos DOM actualizados
    getHistorialElements();
    showLoading();
    
    // Mostrar mensaje de carga en el grid
    if (contentGrid) {
      contentGrid.innerHTML = `
        <div class="loading-message">
          <p>Cargando historial...</p>
        </div>
      `;
    }
    
    // Ocultar mensaje de error si existe
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer) {
      statsContainer.style.display = 'flex';
    }
    
    await loadHistorialData();
    updateStats();
    renderContent();
    setupEventListeners(); // Volver a configurar event listeners
    console.log('✅ Historial refrescado exitosamente');
  } catch (error) {
    console.error('❌ Error refrescando historial:', error);
    showError(error.message || 'Error al cargar el historial');
  } finally {
    hideLoading();
  }
};

// Variable para controlar si ya se inicializó
let historialInitialized = false;

// Inicialización inmediata si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!historialInitialized) {
      // Inicializar sistema de búsqueda avanzada
      advancedSearch = new AdvancedSearchSystem();
      advancedSearch.init();
      
      window.initializeHistorial();
      historialInitialized = true;
    }
  });
} else {
  // Si el DOM ya está listo, ejecutar inmediatamente
  if (!historialInitialized) {
    // Inicializar sistema de búsqueda avanzada
    advancedSearch = new AdvancedSearchSystem();
    advancedSearch.init();
    
    window.initializeHistorial();
    historialInitialized = true;
  }
}

// Configurar event listeners
function setupEventListeners() {
  console.log('⚙️ Configurando event listeners del historial...');
  
  // Event listeners para filtros
  const currentFilterButtons = document.querySelectorAll('.filter-btn');
  currentFilterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      applyFilter(filter);
    });
  });
// Funciones auxiliares
function showEmptyState(show) {
  if (emptyState) {
    emptyState.style.display = show ? 'block' : 'none';
  }
}


function showError(message) {
  console.error(message);
  // Implementar mostrar error en UI si es necesario
}

// Funciones globales para ventana
window.previewItem = async function(id) {
  try {
    const response = await apiCall(`/api/study/outputs/${id}`);
    if (response && response.ok) {
      const item = await response.json();
      showPreviewModal(item);
    } else {
      showError('Error al cargar el elemento');
    }
  } catch (error) {
    console.error('Error al previsualizar:', error);
    showError('Error al cargar el elemento');
  }
};

window.deleteItem = async function(id) {
  if (confirm('¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.')) {
    try {
      const response = await apiCall(`/api/study/outputs/${id}`, {
        method: 'DELETE'
      });
      
      if (response && response.ok) {
        // Remover el item del historial local
        historialData = historialData.filter(item => item.id !== id);
        applyFilter(currentFilter);
        updateStats();
        showSuccess('Elemento eliminado correctamente');
      } else {
        showError('Error al eliminar el elemento');
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
      showError('Error al eliminar el elemento');
    }
  }
};

// Función para mostrar el modal de previsualización
function showPreviewModal(item) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content modal-large">
      <div class="modal-header">
        <h3>${getTypeName(item.type)} - ${item.pdf_title}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="preview-content">
          ${formatContent(item.content, item.type)}
        </div>
        <div class="preview-meta">
          <small>Creado: ${utils.formatDate(item.created_at)}</small>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        <button class="btn-primary" onclick="openFullView('${item.type}', ${item.id})">Ver Completo</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Cerrar con click fuera del modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Función para formatear contenido según el tipo
function formatContent(content, type) {
  if (!content) return '<p>Sin contenido disponible</p>';
  
  try {
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
    
    switch (type) {
      case 'resumen':
        return `<div class="summary-preview">${parsedContent.summary || parsedContent}</div>`;
      
      case 'multiple_choice':
        if (Array.isArray(parsedContent)) {
          const previewQuestions = parsedContent.slice(0, 2);
          return `
            <div class="questions-preview">
              ${previewQuestions.map((q, i) => `
                <div class="question-item">
                  <strong>${i + 1}. ${q.question}</strong>
                  <ul style="margin-left: 20px; margin-top: 8px;">
                    ${q.options.map(opt => `<li>${opt}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
              ${parsedContent.length > 2 ? `<p><em>... y ${parsedContent.length - 2} preguntas más</em></p>` : ''}
            </div>
          `;
        }
        break;
      
      case 'verdadero_falso':
        if (Array.isArray(parsedContent)) {
          return `
            <div class="tf-preview">
              ${parsedContent.slice(0, 3).map((q, i) => `
                <div class="tf-item">
                  <strong>${i + 1}. ${q.statement}</strong>
                  <span style="color: #666; margin-left: 10px;">(${q.answer ? 'Verdadero' : 'Falso'})</span>
                </div>
              `).join('')}
              ${parsedContent.length > 3 ? `<p><em>... y ${parsedContent.length - 3} más</em></p>` : ''}
            </div>
          `;
        }
        break;
      
      case 'mapa_mental':
        return `<div class="mindmap-preview"><pre style="max-height: 200px; overflow-y: auto;">${parsedContent}</pre></div>`;
      
      default:
        return `<div class="content-preview">${JSON.stringify(parsedContent, null, 2)}</div>`;
    }
  } catch (error) {
    return `<div class="content-preview">${content}</div>`;
  }
}

// Función para abrir vista completa
function openFullView(type, id) {
  const urls = {
    'resumen': '/resumen.html',
    'multiple_choice': '/multiple-choice.html',
    'verdadero_falso': '/verdadero-falso.html',
    'mapa_mental': '/mapa-mental.html',
    'chat-qa': '/chat-qa.html'
  };
  
  const url = urls[type];
  if (url) {
    window.open(`${url}?output_id=${id}`, '_blank');
  }
}

// Función para mostrar mensajes de éxito
function showSuccess(message) {
  console.log('✅', message);
  // Implementar toast notification si se desea
};

// Botón limpiar historial
const btnLimpiarHistorial = document.getElementById('btnLimpiarHistorial');
if (btnLimpiarHistorial) {
    btnLimpiarHistorial.setAttribute('data-tooltip', 'Eliminar todo el historial');
    btnLimpiarHistorial.addEventListener('click', (e) => {
      // Añadir efecto visual
      e.target.style.transform = 'scale(0.95)';
      setTimeout(() => {
        e.target.style.transform = '';
      }, 150);
      showConfirmModal();
    });
  }

  // Modal confirmación
  const btnCerrarConfirm = document.getElementById('btnCerrarConfirm');
  const btnCancelarLimpieza = document.getElementById('btnCancelarLimpieza');
  const btnConfirmarLimpieza = document.getElementById('btnConfirmarLimpieza');

  if (btnCerrarConfirm) btnCerrarConfirm.addEventListener('click', hideConfirmModal);
  if (btnCancelarLimpieza) btnCancelarLimpieza.addEventListener('click', hideConfirmModal);
  if (btnConfirmarLimpieza) btnConfirmarLimpieza.addEventListener('click', confirmClearHistory);

  // Modal preview
  const btnCerrarPreview = document.getElementById('btnCerrarPreview');
  const btnCerrarVistaPrevia = document.getElementById('btnCerrarVistaPrevia');
  const btnAbrirCompleto = document.getElementById('btnAbrirCompleto');

  if (btnCerrarPreview) btnCerrarPreview.addEventListener('click', hidePreviewModal);
  if (btnCerrarVistaPrevia) btnCerrarVistaPrevia.addEventListener('click', hidePreviewModal);
  if (btnAbrirCompleto) btnAbrirCompleto.addEventListener('click', openFullContent);

  // Cerrar modales con click fuera
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) hideConfirmModal();
    });
  }

  if (previewModal) {
    previewModal.addEventListener('click', (e) => {
      if (e.target === previewModal) hidePreviewModal();
    });
  }
}



// Cargar datos del historial
async function loadHistorialData() {
  try {
    console.log('🔄 Cargando datos del historial...');
    
    // Verificar que apiCall esté disponible
    if (typeof apiCall !== 'function') {
      console.error('❌ apiCall no está disponible. Esperando inicialización...');
      
      // Esperar hasta que apiCall esté disponible
      let retries = 0;
      while (typeof apiCall !== 'function' && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      
      if (typeof apiCall !== 'function') {
        throw new Error('Sistema de API no inicializado correctamente');
      }
      
      console.log('✅ apiCall disponible después de', retries, 'reintentos');
    }
    
    showLoading('📚 Cargando tu historial de contenido...');
    
    // Obtener datos de study_outputs directamente 
    const response = await apiCall('/api/study/outputs', {
      method: 'GET'
    });

    console.log('📊 Respuesta historial:', response?.status);

    if (!response) {
      throw new Error('Error de conexión al servidor. Por favor, verifica tu conexión a internet.');
    }
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      } else if (response.status === 404) {
        throw new Error('No se encontró la ruta del historial. Contacta al administrador.');
      } else if (response.status === 500) {
        throw new Error('Error interno del servidor. Intenta nuevamente más tarde.');
      } else {
        throw new Error(`Error obteniendo historial (${response.status}): ${response.statusText}`);
      }
    }

    const historialArray = await response.json().catch(() => []);
    console.log(`📚 Elementos de historial encontrados: ${historialArray.length}`, historialArray);

    if (historialArray.length === 0) {
      console.log('⚠️ No se encontró historial para este usuario');
      historialData = [];
      showEmptyState(true);
      return [];
    }

    // Asignar datos al historial
    historialData = historialArray;
    
    console.log(`🎯 Total items en historial: ${historialData.length}`, historialData);

    // Mostrar progreso de procesamiento
    if (historialData.length > 0) {
      showLoading('⚡ Procesando contenido...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mostrar advertencia si hubo errores en algunos PDFs
    if (errorCount > 0) {
      console.warn(`⚠️ No se pudo cargar el contenido de ${errorCount} PDFs`);
    }

    // Ordenar por fecha de creación (más reciente primero)
    historialData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filteredData = [...historialData];
    
    // Configurar datos en el sistema de búsqueda avanzada si está disponible
    if (advancedSearch) {
      advancedSearch.setData(historialData);
    }
    
    return historialData;

  } catch (error) {
    console.error('Error cargando historial:', error);
    throw error;
  }
}

// Actualizar estadísticas
function updateStats() {
  if (!historialData || !Array.isArray(historialData)) {
    return;
  }

  const dataLength = historialData.length;
  
  // Total items
  if (totalItems) {
    totalItems.textContent = dataLength;
  }

  if (dataLength === 0) {
    if (totalPdfs) totalPdfs.textContent = '0';
    if (favType) favType.textContent = '-';
    return;
  }

  // Calcular estadísticas en una sola pasada
  const uniquePdfs = new Set();
  const typeCounts = {};
  
  historialData.forEach(item => {
    // PDFs únicos
    if (item.pdf_id) {
      uniquePdfs.add(item.pdf_id);
    }
    
    // Conteo de tipos
    const type = getTypeDisplayName(item.type);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  // Total PDFs únicos
  if (totalPdfs) {
    totalPdfs.textContent = uniquePdfs.size;
  }

  // Tipo más usado
  const mostUsedType = Object.entries(typeCounts)
    .reduce((max, current) => current[1] > max[1] ? current : max, ['', 0]);

  if (favType) {
    favType.textContent = mostUsedType[0] || '-';
  }
}

// Renderizar contenido
function renderContent() {
  if (!contentGrid) {
    console.error('❌ Error: contentGrid no encontrado');
    return;
  }

  // Si no hay datos filtrados, mostrar estado vacío
  if (!filteredData || filteredData.length === 0) {
    contentGrid.innerHTML = '';
    contentGrid.classList.remove('loading');
    if (emptyState) {
      emptyState.style.display = 'flex';
    }
    return;
  }

  // Ocultar estado vacío si hay contenido
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // Remover clase de carga y preparar para mostrar contenido
  contentGrid.classList.remove('loading');
  
  // Usar renderizado optimizado según el tamaño de la lista
  if (filteredData.length > 20) {
    renderContentBatched();
  } else {
    renderContentDirect();
  }
  
  // Aplicar transición suave después de un breve delay
  setTimeout(() => {
    contentGrid.style.opacity = '1';
  }, 50);
}

// Renderizado directo para listas pequeñas
function renderContentDirect() {
  // Limpiar contenido anterior
  contentGrid.innerHTML = '';
  
  const fragment = document.createDocumentFragment();
  let renderedCount = 0;
  
  filteredData.forEach(item => {
    try {
      if (!item || !item.id) {
        console.warn('Item inválido en filteredData:', item);
        return;
      }
      
      const card = createHistorialCard(item);
      if (card) {
        fragment.appendChild(card);
        renderedCount++;
      }
    } catch (error) {
      console.error('Error al renderizar item:', error, item);
    }
  });
  
  contentGrid.appendChild(fragment);
  console.log(`✅ Renderizado directo completado: ${renderedCount} de ${filteredData.length} elementos`);
  
  // Si no se pudo renderizar ningún elemento, mostrar estado de error
  if (renderedCount === 0 && filteredData.length > 0) {
    console.warn('No se pudo renderizar ningún elemento a pesar de tener datos');
    contentGrid.innerHTML = `
      <div class="error-state">
        <p>No se pudieron mostrar los elementos. Intenta refrescar la página.</p>
        <button onclick="window.refreshHistorial()" class="btn-primary">
          <i class="fas fa-sync-alt"></i> Reintentar
        </button>
      </div>
    `;
  }
}

// Renderizado por lotes para listas grandes
function renderContentBatched() {
  // Limpiar contenido anterior
  contentGrid.innerHTML = '';
  
  const batchSize = 10;
  let currentIndex = 0;
  let renderedCount = 0;
  
  function renderBatch() {
    const fragment = document.createDocumentFragment();
    const endIndex = Math.min(currentIndex + batchSize, filteredData.length);
    
    for (let i = currentIndex; i < endIndex; i++) {
      try {
        const item = filteredData[i];
        if (!item || !item.id) {
          console.warn('Item inválido en filteredData:', item);
          continue;
        }
        
        const card = createHistorialCard(item);
        if (card) {
          fragment.appendChild(card);
          renderedCount++;
        }
      } catch (error) {
        console.error('Error al renderizar item:', error, filteredData[i]);
      }
    }
    
    contentGrid.appendChild(fragment);
    currentIndex = endIndex;
    
    if (currentIndex < filteredData.length) {
      requestAnimationFrame(renderBatch);
    } else {
      console.log(`✅ Renderizado por lotes completado: ${renderedCount} de ${filteredData.length} elementos`);
      
      // Si no se pudo renderizar ningún elemento, mostrar estado de error
      if (renderedCount === 0 && filteredData.length > 0) {
        console.warn('No se pudo renderizar ningún elemento a pesar de tener datos');
        contentGrid.innerHTML = `
          <div class="error-state">
            <p>No se pudieron mostrar los elementos. Intenta refrescar la página.</p>
            <button onclick="window.refreshHistorial()" class="btn-primary">
              <i class="fas fa-sync-alt"></i> Reintentar
            </button>
          </div>
        `;
      }
    }
  }
  
  renderBatch();
}

// Crear tarjeta de historial
function createHistorialCard(item) {
  if (!item || !item.id) {
    console.error('Error: Item inválido para crear tarjeta', item);
    return document.createElement('div'); // Retornar div vacío para evitar errores
  }

  const card = document.createElement('div');
  card.className = 'historial-card';
  card.dataset.outputId = item.id;

  // Obtener datos con valores por defecto para evitar errores
  const typeIcon = getTypeIcon(item.type || 'unknown');
  const typeName = getTypeDisplayName(item.type || 'unknown');
  const typeClass = `type-${item.type || 'unknown'}`;
  
  // Formatear fecha usando utilidad optimizada
  const dateStr = utils.formatDate(item.created_at);

  // Título seguro
  const safeTitle = item.pdf_title || item.pdf_file_name || 'Documento sin título';

  // Generar vista previa inteligente del contenido
  const contentPreview = generateContentPreview(item.content || item.contenido_generado, item.type);

  // Determinar estado del elemento
  const statusClass = item.status === 'processing' ? 'processing' : 
                     item.status === 'error' ? 'error' : 'completed';
  
  // Determinar longitud del contenido para indicador
  const contentLength = JSON.stringify(item.content || item.contenido_generado || {}).length;
  const lengthClass = contentLength < 500 ? 'short' : contentLength < 2000 ? 'medium' : 'long';
  const lengthText = contentLength < 500 ? 'Corto' : contentLength < 2000 ? 'Medio' : 'Largo';
  
  card.innerHTML = `
    <div class="status-indicator ${statusClass}"></div>
    <div class="content-length-indicator ${lengthClass}">${lengthText}</div>
    <div class="card-header ${typeClass}">
      <div class="card-type">
        <span class="type-icon">${typeIcon}</span>
        <span class="type-name">${typeName}</span>
      </div>
      <div class="card-actions">
        <button class="action-btn preview-btn" title="Vista previa completa" data-id="${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-content">
      <h4 class="card-title">${safeTitle}</h4>
      <div class="content-preview-section">
        <div class="content-preview ${contentPreview.isLong ? 'expandable' : ''}" data-full-content='${JSON.stringify(item.content || item.contenido_generado || {}).replace(/'/g, '&apos;')}'>
          ${contentPreview.preview}
          ${contentPreview.isLong ? '<button class="expand-btn" title="Ver más"><i class="fas fa-chevron-down"></i></button>' : ''}
        </div>
        ${contentPreview.stats ? `<div class="content-stats"><i class="fas fa-info-circle"></i> ${contentPreview.stats}</div>` : ''}
      </div>
      <div class="card-meta">
        <span class="creation-date">
          <i class="fas fa-calendar-alt"></i>
          ${dateStr}
        </span>
        <span class="content-source" title="Generado desde PDF">
          <i class="fas fa-file-pdf"></i>
          PDF
        </span>
      </div>
      <div class="card-delete-actions">
        <button class="action-btn delete-btn" title="Eliminar este contenido" data-id="${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          <span>Eliminar contenido</span>
        </button>
        <button class="action-btn delete-pdf-btn" title="Eliminar PDF completo y todo su contenido" data-pdf-id="${item.pdf_id}" data-pdf-title="${safeTitle}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9,3V4H4V6H5V19A2,2 0 0,0 7,21H17A2,2 0 0,0 19,19V6H20V4H15V3H9M7,6H17V19H7V6M9,8V17H11V8H9M13,8V17H15V8H13Z"/>
          </svg>
          <span>Eliminar PDF completo</span>
        </button>
      </div>
    </div>
  `;

  // Event listeners para los botones
  const previewBtn = card.querySelector('.preview-btn');
  const deleteBtn = card.querySelector('.delete-btn');
  const expandBtn = card.querySelector('.expand-btn');

  // Añadir tooltips informativos
  if (previewBtn) {
    previewBtn.setAttribute('data-tooltip', 'Vista previa del contenido');
    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Añadir estado de carga
      previewBtn.classList.add('loading');
      setTimeout(() => {
        showEnhancedPreview(item);
        previewBtn.classList.remove('loading');
      }, 300);
    });
  }

  if (deleteBtn) {
    deleteBtn.setAttribute('data-tooltip', 'Eliminar elemento');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Añadir estado de carga
      deleteBtn.classList.add('loading');
      setTimeout(() => {
        confirmDeleteItem(item.id);
        deleteBtn.classList.remove('loading');
      }, 200);
    });
  }

  // Event listener para el botón de borrar PDF completo
  const deletePdfBtn = card.querySelector('.delete-pdf-btn');
  if (deletePdfBtn) {
    deletePdfBtn.setAttribute('data-tooltip', 'Eliminar PDF completo');
    deletePdfBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Añadir estado de carga
      deletePdfBtn.classList.add('loading');
      const pdfId = deletePdfBtn.dataset.pdfId;
      const pdfTitle = deletePdfBtn.dataset.pdfTitle;
      setTimeout(() => {
        confirmDeletePdf(pdfId, pdfTitle);
        deletePdfBtn.classList.remove('loading');
      }, 200);
    });
  }

  // Funcionalidad de expansión de contenido
  if (expandBtn) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const previewElement = card.querySelector('.content-preview');
      const isExpanded = previewElement.classList.contains('expanded');
      
      if (isExpanded) {
        // Contraer
        previewElement.classList.remove('expanded');
        previewElement.innerHTML = contentPreview.preview + '<button class="expand-btn" title="Ver más"><i class="fas fa-chevron-down"></i></button>';
        // Re-agregar event listener
        const newExpandBtn = previewElement.querySelector('.expand-btn');
        if (newExpandBtn) {
          newExpandBtn.addEventListener('click', arguments.callee);
        }
      } else {
        // Expandir - mostrar contenido completo
        previewElement.classList.add('expanded');
        try {
          const fullContentStr = previewElement.dataset.fullContent;
          const fullContent = fullContentStr ? JSON.parse(fullContentStr) : {};
          let expandedContent = '';
          
          switch (item.type) {
            case 'resumen':
              expandedContent = fullContent.resumen || fullContent.summary || 'Contenido de resumen no disponible';
              break;
            case 'flashcards':
              const flashcards = fullContent.flashcards || fullContent.tarjetas || [];
              expandedContent = `<div class="mini-flashcards">${flashcards.slice(0, 3).map(card => 
                `<div class="mini-flashcard"><strong>P:</strong> ${card.pregunta || card.front || 'Pregunta'}</div>`
              ).join('')}${flashcards.length > 3 ? `<div class="more-indicator">+${flashcards.length - 3} tarjetas más...</div>` : ''}</div>`;
              break;
            case 'multiple_choice':
            case 'verdadero_falso':
              const preguntas = fullContent.preguntas || fullContent.questions || [];
              expandedContent = `<div class="mini-questions">${preguntas.slice(0, 2).map(q => 
                `<div class="mini-question"><strong>P:</strong> ${q.pregunta || q.question || 'Pregunta'}</div>`
              ).join('')}${preguntas.length > 2 ? `<div class="more-indicator">+${preguntas.length - 2} preguntas más...</div>` : ''}</div>`;
              break;
            default:
              expandedContent = typeof fullContent === 'string' ? fullContent : 'Contenido estructurado disponible';
          }
          
          previewElement.innerHTML = expandedContent + '<button class="expand-btn contracted" title="Ver menos"><i class="fas fa-chevron-up"></i></button>';
          // Re-agregar event listener
          const newExpandBtn = previewElement.querySelector('.expand-btn');
          if (newExpandBtn) {
            newExpandBtn.addEventListener('click', arguments.callee);
          }
        } catch (error) {
          console.error('Error al expandir contenido:', error);
          previewElement.innerHTML = 'Error al expandir contenido <button class="expand-btn contracted" title="Ver menos"><i class="fas fa-chevron-up"></i></button>';
          const newExpandBtn = previewElement.querySelector('.expand-btn');
          if (newExpandBtn) {
            newExpandBtn.addEventListener('click', arguments.callee);
          }
        }
      }
    });
  }

  // Click en la tarjeta para abrir completo
  card.addEventListener('click', () => {
    openContent(item);
  });

  return card;
}

// Generar vista previa inteligente del contenido
function generateContentPreview(content, type) {
  if (!content) {
    return {
      preview: '<span class="no-content-preview">📭 Sin contenido disponible</span>',
      isLong: false,
      stats: null
    };
  }

  try {
    let parsedContent;
    let previewText = '';
    let stats = '';
    
    // Intentar parsear el contenido JSON
    try {
      parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      // Si no es JSON válido, usar como texto plano
      parsedContent = content;
    }

    switch (type) {
      case 'resumen':
        const resumen = parsedContent.resumen || parsedContent.summary || parsedContent;
        if (typeof resumen === 'string') {
          previewText = resumen;
          stats = `${Math.ceil(resumen.length / 5)} palabras aprox.`;
        } else {
          previewText = 'Resumen estructurado disponible';
        }
        break;
        
      case 'flashcards':
        const flashcards = parsedContent.flashcards || parsedContent.tarjetas || [];
        if (flashcards.length > 0) {
          const firstCard = flashcards[0];
          previewText = `<strong>Ejemplo:</strong> ${firstCard.pregunta || firstCard.front || 'Tarjeta de estudio'}`;
          stats = `${flashcards.length} tarjetas`;
        } else {
          previewText = 'Conjunto de tarjetas de estudio';
        }
        break;
        
      case 'multiple_choice':
      case 'verdadero_falso':
        const preguntas = parsedContent.preguntas || parsedContent.questions || [];
        if (preguntas.length > 0) {
          const firstQuestion = preguntas[0];
          previewText = `<strong>Ejemplo:</strong> ${firstQuestion.pregunta || firstQuestion.question || 'Pregunta de evaluación'}`;
          stats = `${preguntas.length} preguntas`;
        } else {
          previewText = 'Conjunto de preguntas de evaluación';
        }
        break;
        
      case 'mapa_mental':
        previewText = 'Mapa mental interactivo generado';
        stats = 'Visualización conceptual';
        break;
        
      case 'chat-qa':
        previewText = 'Sesión de preguntas y respuestas interactiva';
        stats = 'Chat educativo';
        break;
        
      default:
        // Para contenido desconocido, intentar extraer texto
        const textContent = typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent);
        previewText = textContent;
        break;
    }

    // Truncar texto si es muy largo
    const maxLength = 120;
    const isLong = previewText.length > maxLength;
    
    if (isLong) {
      // Truncar en una palabra completa
      const truncated = previewText.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      previewText = truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
    }

    return {
      preview: previewText,
      isLong: isLong,
      stats: stats
    };
    
  } catch (error) {
    console.error('Error generando vista previa:', error);
    return {
      preview: '<span class="error-preview">⚠️ Error al procesar contenido</span>',
      isLong: false,
      stats: null
    };
  }
}

// Obtener icono para tipo de contenido
function getTypeIcon(type) {
  const icons = {
    'resumen': '📄',
    'multiple_choice': '❓',
    'verdadero_falso': '✅',
    'mapa_mental': '🧠',
    'chat-qa': '💬',
    'problema': '🧮',
    'recomendacion_texto': '📚',
    'recomendacion_video': '🎥'
  };

  return icons[type] || '📝';
}

// Obtener nombre legible para tipo de contenido
function getTypeDisplayName(type) {
  const names = {
    'resumen': 'Resumen',
    'multiple_choice': 'Multiple Choice',
    'verdadero_falso': 'Verdadero/Falso',
    'mapa_mental': 'Mapa Mental',
    'chat-qa': 'Preguntas y Respuestas',
    'problema': 'Problemas',
    'recomendacion_texto': 'Recomendaciones Texto',
    'recomendacion_video': 'Recomendaciones Video'
  };

  return names[type] || type;
}

// Filtrar contenido
function filterContent(filter) {
  if (!historialData || !Array.isArray(historialData)) {
    console.error('Error: historialData no es un array válido', historialData);
    return;
  }
  
  currentFilter = filter;
  console.log(`🔍 Aplicando filtro: ${filter}`);

  if (filter === 'all') {
    filteredData = [...historialData];
  } else {
    // Mapear filtros del UI a tipos de la BD
    const filterMap = {
      'resumen': 'resumen',
      'multiple_choice': 'multiple_choice',
      'verdadero_falso': 'verdadero_falso',
      'mapa_mental': 'mapa_mental',
      'problema': 'problema',
      'recomendacion_texto': 'recomendacion_texto',
      'recomendacion_video': 'recomendacion_video',
      'chat-qa': 'chat-qa'
    };

    const dbType = filterMap[filter] || filter;
    
    filteredData = historialData.filter(item => item.type === dbType);
  }

  console.log(`✅ Filtrado completado: ${filteredData.length} elementos`);
  setActiveFilter(filter);
  renderContent();
}

// Establecer filtro activo
function setActiveFilter(filter) {
  const currentFilterButtons = document.querySelectorAll('.filter-btn');
  currentFilterButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
}

// Mostrar vista previa
async function showPreview(item) {
  if (!previewModal) {
    console.error('Error: previewModal no está definido');
    return;
  }

  try {
    showLoading();
    
    // Configurar modal con información básica mientras se carga
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('previewContent');
    
    if (previewTitle) {
      previewTitle.textContent = `${getTypeDisplayName(item.type)} - ${item.pdf_title || 'Cargando...'}`;
    }
    
    if (previewContent) {
      previewContent.innerHTML = '<div class="loading-spinner">Cargando contenido...</div>';
    }
    
    // Mostrar modal inmediatamente para mejor experiencia de usuario
    previewModal.style.display = 'flex';
    
    // Almacenar item actual para abrir completo
    previewModal.dataset.currentItem = JSON.stringify(item);

    // Obtener el contenido completo del item
    const response = await apiCall(`/api/ai/content/${item.id}`, {
      method: 'GET'
    });

    if (!response) {
      throw new Error('Error de conexión al servidor');
    }
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('El contenido no fue encontrado');
      } else {
        throw new Error(`Error obteniendo contenido (${response.status})`);
      }
    }

    const data = await response.json().catch(() => ({}));
    const content = data.output?.content;
    
    if (!content) {
      throw new Error('El contenido está vacío o tiene un formato inválido');
    }

    // Configurar modal con el contenido completo
    if (previewTitle) {
      previewTitle.textContent = `${getTypeDisplayName(item.type)} - ${item.pdf_title}`;
    }

    if (previewContent) {
      previewContent.innerHTML = renderPreviewContent(content, item.type);
    }

    previewModal.style.display = 'flex';

  } catch (error) {
    console.error('Error mostrando vista previa:', error);
    
    // Mostrar error en el modal en lugar de alerta
    const previewContent = document.getElementById('previewContent');
    if (previewContent) {
      previewContent.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${error.message || 'No se pudo cargar la vista previa'}</p>
        </div>
      `;
    } else {
      alert('Error al cargar la vista previa');
    }
  } finally {
    hideLoading();
  }
}

// Renderizar contenido de vista previa
function renderPreviewContent(content, type) {
  switch (type) {
    case 'resumen':
      return `
        <div class="preview-resumen">
          <div class="preview-header">
            <h4>📄 Resumen del Documento</h4>
          </div>
          <div class="resumen-section">
            <h5 class="section-title">📋 Resumen General</h5>
            <div class="preview-content">${content.resumen_general || 'No disponible'}</div>
          </div>
          ${(content.conceptos_clave && content.conceptos_clave.length > 0) ? `
            <div class="resumen-section">
              <h5 class="section-title">🔑 Conceptos Clave</h5>
              <ul class="preview-list conceptos">
                ${content.conceptos_clave.map(concepto => `<li><span class="bullet">•</span>${concepto}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          ${(content.aplicaciones_practicas && content.aplicaciones_practicas.length > 0) ? `
            <div class="resumen-section">
              <h5 class="section-title">⚡ Aplicaciones Prácticas</h5>
              <ul class="preview-list aplicaciones">
                ${content.aplicaciones_practicas.map(app => `<li><span class="bullet">•</span>${app}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;

    case 'multiple_choice':
      const preguntasMultiple = content.preguntas || [];
      return `
        <div class="preview-multiple-choice">
          <div class="preview-header">
            <h4>📝 Preguntas de Opción Múltiple</h4>
            <span class="question-count">${preguntasMultiple.length} preguntas</span>
          </div>
          <div class="preview-questions">
            ${preguntasMultiple.slice(0, 3).map((pregunta, index) => `
              <div class="pregunta-preview">
                <div class="question-number">Pregunta ${index + 1}</div>
                <h5 class="question-text">${pregunta.enunciado}</h5>
                <ul class="options-list">
                  ${(pregunta.opciones || []).map((opcion, i) => `
                    <li class="option ${i === pregunta.respuesta ? 'correcta' : ''}">
                      <span class="option-letter">${String.fromCharCode(65 + i)}</span>
                      <span class="option-text">${opcion}</span>
                      ${i === pregunta.respuesta ? '<span class="correct-indicator">✓</span>' : ''}
                    </li>
                  `).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
          ${preguntasMultiple.length > 3 ? `<div class="more-content">📋 <em>Ver ${preguntasMultiple.length - 3} preguntas adicionales en vista completa</em></div>` : ''}
        </div>
      `;

    case 'verdadero_falso':
      const preguntasVF = content.preguntas || [];
      return `
        <div class="preview-verdadero-falso">
          <div class="preview-header">
            <h4>✅ Preguntas Verdadero/Falso</h4>
            <span class="question-count">${preguntasVF.length} preguntas</span>
          </div>
          <div class="vf-questions">
            ${preguntasVF.slice(0, 5).map((pregunta, index) => `
              <div class="pregunta-vf-preview">
                <div class="question-number">Pregunta ${index + 1}</div>
                <p class="vf-statement">${pregunta.enunciado}</p>
                <div class="vf-answer ${pregunta.respuesta}">
                  <span class="answer-indicator">${pregunta.respuesta === 'verdadero' ? '✓' : '✗'}</span>
                  <span class="answer-text">${pregunta.respuesta?.toUpperCase()}</span>
                </div>
              </div>
            `).join('')}
          </div>
          ${preguntasVF.length > 5 ? `<div class="more-content">📝 <em>Ver ${preguntasVF.length - 5} preguntas adicionales en vista completa</em></div>` : ''}
        </div>
      `;

    case 'mapa_mental':
      return `
        <div class="preview-mapa-mental">
          <div class="preview-header">
            <h4>🧠 ${content.titulo || 'Mapa Mental'}</h4>
          </div>
          <div class="mapa-preview-container">
            <div class="markmap-preview-wrapper">
              <pre class="markmap-preview">${content.markmap || 'No disponible'}</pre>
              <div class="preview-overlay">
                <div class="preview-action">
                  <span class="action-icon">🔍</span>
                  <span>Haz clic en "Abrir Completo" para ver el mapa interactivo</span>
                </div>
              </div>
            </div>
          </div>
          ${content.notas && content.notas.length > 0 ? `
            <div class="resumen-section">
              <h5 class="section-title">📝 Notas Adicionales</h5>
              <ul class="preview-list notas">
                ${content.notas.map(nota => `<li><span class="bullet">•</span>${nota}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `;

    case 'chat-qa':
      const preguntasChat = content.preguntas || content.conversacion || [];
      return `
        <div class="preview-chat-qa">
          <div class="preview-header">
            <h4>💬 Preguntas y Respuestas</h4>
            <span class="question-count">${preguntasChat.length} intercambios</span>
          </div>
          <div class="chat-preview">
            ${preguntasChat.slice(0, 3).map((item, index) => `
              <div class="qa-preview">
                <div class="question">
                  <div class="q-indicator">P${index + 1}</div>
                  <div class="q-text">${item.pregunta || item.question || 'Pregunta no disponible'}</div>
                </div>
                <div class="answer">
                  <div class="a-indicator">R</div>
                  <div class="a-text">${(item.respuesta || item.answer || 'Respuesta no disponible').substring(0, 200)}${(item.respuesta || item.answer || '').length > 200 ? '...' : ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
          ${preguntasChat.length > 3 ? `<div class="more-content">💭 <em>Ver ${preguntasChat.length - 3} intercambios adicionales en vista completa</em></div>` : ''}
        </div>
       `;

    case 'flashcards':
      const flashcards = content.flashcards || content.tarjetas || [];
      return `
        <div class="preview-flashcards">
          <div class="preview-header">
            <h4>🎴 Flashcards</h4>
            <span class="question-count">${flashcards.length} tarjetas</span>
          </div>
          <div class="flashcards-preview">
            ${flashcards.slice(0, 3).map((card, index) => `
              <div class="flashcard-preview">
                <div class="card-number">Tarjeta ${index + 1}</div>
                <div class="card-front">
                  <div class="card-label">Pregunta:</div>
                  <div class="card-content">${card.pregunta || card.front || 'No disponible'}</div>
                </div>
                <div class="card-back">
                  <div class="card-label">Respuesta:</div>
                  <div class="card-content">${card.respuesta || card.back || 'No disponible'}</div>
                </div>
              </div>
            `).join('')}
          </div>
          ${flashcards.length > 3 ? `<div class="more-content">🎴 <em>Ver ${flashcards.length - 3} tarjetas adicionales en vista completa</em></div>` : ''}
        </div>
      `;

    default:
      return `
        <div class="preview-default">
          <div class="preview-header">
            <h4>📄 Contenido Original</h4>
          </div>
          <div class="json-preview-wrapper">
            <pre class="json-preview">${JSON.stringify(content, null, 2)}</pre>
          </div>
        </div>
      `;
  }
}

// Abrir contenido completo
async function openContent(item) {
  console.log('Abriendo contenido:', item);
  
  // Determinar qué página abrir según el tipo
  const pageMap = {
    'resumen': 'resumen.html',
    'multiple_choice': 'multiple-choice.html',
    'verdadero_falso': 'verdadero-falso.html',
    'mapa_mental': 'mapa-mental.html',
    'chat-qa': 'chat-qa.html',
    'flashcards': 'flashcards.html'
  };

  const page = pageMap[item.type];

  if (page) {
    // Mostrar indicador de carga
    showLoading('🔄 Obteniendo contenido completo...');
    
    try {
      // Obtener el contenido completo de la base de datos
      const response = await apiCall(`/api/ai/content/${item.id}`, {
        method: 'GET'
      });

      if (!response || !response.ok) {
        throw new Error(`Error obteniendo contenido: ${response?.status || 'Sin respuesta'}`);
      }

      const data = await response.json();
      const fullContent = data.output?.content;
      
      if (!fullContent) {
        throw new Error('El contenido está vacío o tiene un formato inválido');
      }
      
      // Limpiar recursos antes de navegar
      cleanupHistorial();
      
      // Guardar datos completos para la siguiente página
      const contentData = {
        outputId: item.id,
        pdfId: item.pdf_id,
        pdfTitle: item.pdf_title,
        type: item.type,
        content: fullContent, // Usar el contenido completo de la API
        createdAt: item.created_at,
        pages: item.pages || [],
        originalContent: fullContent
      };
      
      sessionStorage.setItem('currentContent', JSON.stringify(contentData));
      
      // Verificar que los datos se guardaron correctamente
      const savedData = sessionStorage.getItem('currentContent');
      if (!savedData) {
        throw new Error('No se pudieron guardar los datos del contenido');
      }
      
      console.log('Datos completos guardados para navegación:', contentData);
      
      // Navegar a la página específica
      window.location.href = `/${page}`;
      
    } catch (error) {
      console.error('Error obteniendo contenido completo:', error);
      hideLoading();
      showNotification('error', `Error al cargar el contenido: ${error.message}`, '❌');
      
      // Como fallback, mostrar vista previa mejorada
      showEnhancedPreview(item);
    }
  } else {
    console.log('No hay página específica para el tipo:', item.type);
    // Si no hay página específica, mostrar vista previa mejorada
    showEnhancedPreview(item);
  }
}

// Vista previa mejorada para contenidos sin página específica
function showEnhancedPreview(item) {
  console.log('Mostrando vista previa mejorada para:', item);
  
  // Crear modal de vista completa
  const fullViewModal = document.createElement('div');
  fullViewModal.className = 'full-view-modal';
  fullViewModal.innerHTML = `
    <div class="full-view-content">
      <div class="full-view-header">
        <h2>${getTypeIcon(item.type)} ${getTypeDisplayName(item.type)}</h2>
        <div class="full-view-meta">
          <span class="pdf-title">📄 ${item.pdf_title}</span>
          <span class="creation-date">📅 ${new Date(item.created_at).toLocaleDateString('es-ES')}</span>
        </div>
        <button class="close-full-view" onclick="closeFullView()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="full-view-body">
        ${renderFullContent(item.content, item.type)}
      </div>
    </div>
  `;
  
  document.body.appendChild(fullViewModal);
  
  // Función global para cerrar
  window.closeFullView = function() {
    if (fullViewModal && fullViewModal.parentNode) {
      fullViewModal.parentNode.removeChild(fullViewModal);
    }
    delete window.closeFullView;
  };
  
  // Cerrar con ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      window.closeFullView();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

// Renderizar contenido completo
function renderFullContent(content, type) {
  if (!content) {
    return '<div class="no-content">📭 No hay contenido disponible</div>';
  }
  
  try {
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
    
    switch (type) {
      case 'flashcards':
        const flashcards = parsedContent.flashcards || parsedContent.tarjetas || [];
        return `
          <div class="full-flashcards">
            <div class="flashcards-grid">
              ${flashcards.map((card, index) => `
                <div class="flashcard-full">
                  <div class="flashcard-number">Tarjeta ${index + 1}</div>
                  <div class="flashcard-sides">
                    <div class="flashcard-side front">
                      <div class="side-label">Pregunta</div>
                      <div class="side-content">${card.pregunta || card.front || 'No disponible'}</div>
                    </div>
                    <div class="flashcard-side back">
                      <div class="side-label">Respuesta</div>
                      <div class="side-content">${card.respuesta || card.back || 'No disponible'}</div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
      case 'resumen':
        const resumen = parsedContent.resumen || parsedContent.summary || parsedContent;
        return `
          <div class="full-resumen">
            <div class="resumen-content">
              ${typeof resumen === 'string' ? `<p>${resumen}</p>` : `<pre>${JSON.stringify(resumen, null, 2)}</pre>`}
            </div>
          </div>
        `;
        
      case 'multiple_choice':
      case 'verdadero_falso':
        const preguntas = parsedContent.preguntas || parsedContent.questions || [];
        return `
          <div class="full-preguntas">
            <div class="preguntas-list">
              ${preguntas.map((pregunta, index) => `
                <div class="pregunta-full">
                  <div class="pregunta-number">Pregunta ${index + 1}</div>
                  <div class="pregunta-text">${pregunta.pregunta || pregunta.question || 'No disponible'}</div>
                  ${pregunta.opciones ? `
                    <div class="opciones-list">
                      ${pregunta.opciones.map((opcion, i) => `
                        <div class="opcion ${pregunta.respuesta_correcta === String.fromCharCode(97 + i) ? 'correcta' : ''}">
                          <span class="opcion-letra">${String.fromCharCode(97 + i)})</span>
                          <span class="opcion-texto">${opcion}</span>
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  ${pregunta.respuesta_correcta ? `
                    <div class="respuesta-correcta">
                      <strong>Respuesta correcta:</strong> ${pregunta.respuesta_correcta}
                    </div>
                  ` : ''}
                  ${pregunta.explicacion ? `
                    <div class="explicacion">
                      <strong>Explicación:</strong> ${pregunta.explicacion}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
        
      default:
        return `
          <div class="full-content-json">
            <pre class="json-display">${JSON.stringify(parsedContent, null, 2)}</pre>
          </div>
        `;
    }
  } catch (error) {
    console.error('Error renderizando contenido completo:', error);
    return `
      <div class="content-error">
        <p>❌ Error al mostrar el contenido</p>
        <details>
          <summary>Contenido original</summary>
          <pre>${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</pre>
        </details>
      </div>
    `;
  }
}

// Abrir contenido completo desde modal
function openFullContent() {
  if (!previewModal || !previewModal.dataset.currentItem) return;

  try {
    const item = JSON.parse(previewModal.dataset.currentItem);
    hidePreviewModal();
    openContent(item);
  } catch (error) {
    console.error('Error abriendo contenido completo:', error);
  }
}

// Confirmar eliminación de item
function confirmDeleteItem(outputId) {
  // Crear modal de confirmación
  const confirmDialog = document.createElement('div');
  confirmDialog.className = 'confirm-dialog';
  confirmDialog.innerHTML = `
    <div class="confirm-dialog-content">
      <h3>Confirmar eliminación</h3>
      <p>¿Estás seguro de que deseas eliminar este contenido?</p>
      <div class="confirm-dialog-actions">
        <button class="btn-secondary cancel-btn">Cancelar</button>
        <button class="btn-danger confirm-btn">Eliminar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(confirmDialog);
  
  // Añadir event listeners
  const cancelBtn = confirmDialog.querySelector('.cancel-btn');
  const confirmBtn = confirmDialog.querySelector('.confirm-btn');
  
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(confirmDialog);
  });
  
  confirmBtn.addEventListener('click', () => {
    document.body.removeChild(confirmDialog);
    deleteItem(outputId);
  });
  
  // Cerrar al hacer clic fuera del diálogo
  confirmDialog.addEventListener('click', (e) => {
    if (e.target === confirmDialog) {
      document.body.removeChild(confirmDialog);
    }
  });
}

// Eliminar item
async function deleteItem(outputId) {
  try {
    showLoading('🗑️ Eliminando contenido...');

    // Validar que el outputId existe
    if (!outputId) {
      throw new Error('ID de contenido no válido');
    }

    console.log('Eliminando contenido con ID:', outputId);

    const response = await apiCall(`/api/ai/content/${outputId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response || !response.ok) {
      const errorData = await response.text();
      console.error('Error del servidor:', errorData);
      throw new Error(`Error del servidor: ${response.status}`);
    }

    console.log('Contenido eliminado exitosamente del servidor');

    // Actualizar datos locales
    const originalLength = historialData.length;
    historialData = historialData.filter(item => item.id !== outputId);
    
    if (historialData.length === originalLength) {
      console.warn('El item no se encontró en los datos locales');
    }

    // Actualizar filtros y estadísticas
    filterContent(currentFilter);
    updateStats();
    renderContent();

    console.log('Datos locales actualizados correctamente');

    // Mostrar notificación de éxito
    showNotification('success', 'Contenido eliminado correctamente', '✅');

  } catch (error) {
    console.error('Error eliminando contenido:', error);
    
    // Mostrar notificación de error específica
    let errorMessage = 'Error al eliminar el contenido';
    if (error.message.includes('404')) {
      errorMessage = 'El contenido ya no existe';
    } else if (error.message.includes('403')) {
      errorMessage = 'No tienes permisos para eliminar este contenido';
    } else if (error.message.includes('500')) {
      errorMessage = 'Error interno del servidor';
    }
    
    showNotification('error', errorMessage, '❌');
  } finally {
    hideLoading();
  }
}

// Función auxiliar para mostrar notificaciones usando el sistema existente
function showNotification(type, message, icon) {
  // Usar el sistema de notificaciones existente del proyecto
  if (window.app && window.app.uiModule) {
    window.app.uiModule.showNotification(message, type);
    return;
  }
  
  // Fallback: usar el sistema de notificaciones de home.js si está disponible
  if (typeof window.showNotification === 'function') {
    window.showNotification(message, type);
    return;
  }
  
  // Fallback final: crear notificación simple
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 16px;
    margin-bottom: 10px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
    cursor: pointer;
    z-index: 10000;
    max-width: 300px;
  `;

  notification.innerHTML = `
    <span>${message}</span>
    <button style="
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">&times;</button>
  `;

  document.body.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 10);

  // Click para cerrar
  notification.addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  });

  // Auto-remove después de 5 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

// Mostrar modal de confirmación
function showConfirmModal() {
  if (confirmModal) {
    confirmModal.style.display = 'flex';
  }
}

// Ocultar modal de confirmación
function hideConfirmModal() {
  if (confirmModal) {
    confirmModal.style.display = 'none';
  }
}

// Ocultar modal de vista previa
function hidePreviewModal() {
  if (previewModal) {
    previewModal.style.display = 'none';
    previewModal.dataset.currentItem = '';
  }
}

// Confirmar limpieza de historial
async function confirmClearHistory() {
  try {
    showLoading();
    hideConfirmModal();

    // Eliminar todos los contenidos uno por uno
    const deletePromises = historialData.map(item => 
      apiCall(`/api/ai/content/${item.id}`, { method: 'DELETE' })
    );

    await Promise.all(deletePromises);

    // Limpiar datos locales
    historialData = [];
    filteredData = [];
    updateStats();
    renderContent();

    alert('Historial limpiado correctamente');

  } catch (error) {
    console.error('Error limpiando historial:', error);
    alert('Error al limpiar el historial');
  } finally {
    hideLoading();
  }
}

// Mostrar loading usando módulo UI global
function showLoading(message = 'Cargando historial...') {
  // Usar módulo UI global si está disponible
  if (window.app && window.app.uiModule) {
    window.app.uiModule.showLoading(message);
  }
  
  // Mostrar indicador de carga mejorado en el área de contenidos
  if (contentGrid) {
    contentGrid.classList.add('loading');
    contentGrid.innerHTML = `
      <div class="historial-loading">
        <div class="historial-loading-content">
          <div class="loading-spinner-modern">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
          <div class="historial-loading-text">
            <h3 class="loading-title">${message}</h3>
            <p class="loading-subtitle">Por favor espera mientras procesamos tu información</p>
            <div class="loading-progress">
              <div class="progress-bar"></div>
            </div>
            <div class="historial-loading-dots">
              <div class="historial-loading-dot"></div>
              <div class="historial-loading-dot"></div>
              <div class="historial-loading-dot"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  // Ocultar estado vacío mientras carga
  if (emptyState) {
    emptyState.style.display = 'none';
  }
}

// Ocultar loading usando módulo UI global
function hideLoading() {
  // Ocultar módulo UI global si está disponible
  if (window.app && window.app.uiModule) {
    window.app.uiModule.hideLoading();
  }
  
  // Remover animación del área de contenidos
  if (contentGrid) {
    contentGrid.classList.remove('loading');
    // El contenido se mostrará cuando se llame a renderContent()
  }
}

// Mostrar error
function showError(message) {
  console.error('Error en historial:', message);
  if (contentGrid) {
    contentGrid.innerHTML = `
      <div class="error-state">
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="window.refreshHistorial()" class="btn-primary">
          <i class="fas fa-sync-alt"></i> Reintentar
        </button>
      </div>
    `;
    
    // Ocultar estadísticas si hay error
    const statsContainer = document.querySelector('.stats-container');
    if (statsContainer) {
      statsContainer.style.display = 'none';
    }
    
    // Mostrar mensaje en la consola para depuración
    console.error('Error mostrado al usuario:', message);
  }
}

// Sistema de búsqueda y filtrado avanzado
class AdvancedSearchSystem {
    constructor() {
        this.searchInput = null;
        this.sortSelect = null;
        this.dateFromInput = null;
        this.dateToInput = null;
        this.searchTimeout = null;
        this.currentFilters = {
            search: '',
            type: 'all',
            dateFrom: null,
            dateTo: null,
            sortBy: 'date-desc'
        };
        this.originalData = [];
        this.filteredData = [];
    }

    init() {
        this.createSearchInterface();
        this.bindEvents();
    }

    createSearchInterface() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Crear contenedor de búsqueda avanzada
        const searchContainer = document.createElement('div');
        searchContainer.className = 'advanced-search-container';
        searchContainer.innerHTML = `
            <div class="search-row">
                <div class="search-input-container">
                    <input type="text" id="search-input" placeholder="Buscar en el historial..." class="search-input">
                    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>
                <button class="advanced-filters-toggle" id="filters-toggle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
                    </svg>
                    Filtros
                </button>
            </div>
            <div class="advanced-filters" id="advanced-filters" style="display: none;">
                <div class="filters-row">
                    <div class="filter-group">
                        <label for="sort-select">Ordenar por:</label>
                        <select id="sort-select" class="filter-select">
                            <option value="date-desc">Más reciente</option>
                            <option value="date-asc">Más antiguo</option>
                            <option value="title-asc">Título A-Z</option>
                            <option value="title-desc">Título Z-A</option>
                            <option value="type">Tipo de contenido</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="date-from">Desde:</label>
                        <input type="date" id="date-from" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label for="date-to">Hasta:</label>
                        <input type="date" id="date-to" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <button class="clear-filters-btn" id="clear-filters">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Limpiar
                        </button>
                    </div>
                </div>
            </div>
        `;

        headerActions.insertBefore(searchContainer, headerActions.firstChild);
        this.bindSearchElements();
    }

    bindSearchElements() {
        this.searchInput = document.getElementById('search-input');
        this.sortSelect = document.getElementById('sort-select');
        this.dateFromInput = document.getElementById('date-from');
        this.dateToInput = document.getElementById('date-to');
        this.filtersToggle = document.getElementById('filters-toggle');
        this.advancedFilters = document.getElementById('advanced-filters');
        this.clearFiltersBtn = document.getElementById('clear-filters');
    }

    bindEvents() {
        if (!this.searchInput) return;

        // Búsqueda en tiempo real
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
            }, 300);
        });

        // Toggle filtros avanzados
        this.filtersToggle?.addEventListener('click', () => {
            const isVisible = this.advancedFilters.style.display !== 'none';
            this.advancedFilters.style.display = isVisible ? 'none' : 'block';
            this.filtersToggle.classList.toggle('active', !isVisible);
        });

        // Ordenamiento
        this.sortSelect?.addEventListener('change', (e) => {
            this.currentFilters.sortBy = e.target.value;
            this.applyFilters();
        });

        // Filtros de fecha
        this.dateFromInput?.addEventListener('change', (e) => {
            this.currentFilters.dateFrom = e.target.value ? new Date(e.target.value) : null;
            this.applyFilters();
        });

        this.dateToInput?.addEventListener('change', (e) => {
            this.currentFilters.dateTo = e.target.value ? new Date(e.target.value) : null;
            this.applyFilters();
        });

        // Limpiar filtros
        this.clearFiltersBtn?.addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Mejorar filtros existentes
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.dataset.type || 'all';
                this.currentFilters.type = type;
                this.applyFilters();
            });
        });
    }

    setData(data) {
        this.originalData = [...data];
        this.filteredData = [...data];
    }

    applyFilters() {
        let filtered = [...this.originalData];

        // Filtro de búsqueda por texto
        if (this.currentFilters.search) {
            filtered = filtered.filter(item => {
                const searchText = this.currentFilters.search;
                return (
                    item.title?.toLowerCase().includes(searchText) ||
                    item.content?.toLowerCase().includes(searchText) ||
                    item.type?.toLowerCase().includes(searchText) ||
                    item.source?.toLowerCase().includes(searchText)
                );
            });
        }

        // Filtro por tipo
        if (this.currentFilters.type && this.currentFilters.type !== 'all') {
            filtered = filtered.filter(item => item.type === this.currentFilters.type);
        }

        // Filtro por fecha
        if (this.currentFilters.dateFrom) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.created_at);
                return itemDate >= this.currentFilters.dateFrom;
            });
        }

        if (this.currentFilters.dateTo) {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.created_at);
                const toDate = new Date(this.currentFilters.dateTo);
                toDate.setHours(23, 59, 59, 999); // Incluir todo el día
                return itemDate <= toDate;
            });
        }

        // Aplicar ordenamiento
        filtered = this.sortData(filtered, this.currentFilters.sortBy);

        this.filteredData = filtered;
        this.renderFilteredResults();
        this.updateResultsCount();
    }

    sortData(data, sortBy) {
        const sorted = [...data];
        
        switch (sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            case 'date-asc':
                return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            case 'title-asc':
                return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            case 'title-desc':
                return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
            case 'type':
                return sorted.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
            default:
                return sorted;
        }
    }

    renderFilteredResults() {
        const contentGrid = document.querySelector('.content-grid');
        if (!contentGrid) return;

        if (this.filteredData.length === 0) {
            this.showNoResults();
            return;
        }

        // Usar el sistema de renderizado existente pero con datos filtrados
        if (window.renderContentDirect) {
            window.renderContentDirect(this.filteredData);
        } else {
            // Fallback al renderizado básico
            contentGrid.innerHTML = '';
            this.filteredData.forEach(item => {
                const card = createHistorialCard(item);
                contentGrid.appendChild(card);
            });
        }
    }

    showNoResults() {
        const contentGrid = document.querySelector('.content-grid');
        if (!contentGrid) return;

        contentGrid.innerHTML = `
            <div class="no-results-state">
                <div class="no-results-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                        <line x1="11" y1="8" x2="11" y2="12"></line>
                        <line x1="11" y1="16" x2="11.01" y2="16"></line>
                    </svg>
                </div>
                <h3>No se encontraron resultados</h3>
                <p>Intenta ajustar los filtros de búsqueda o usar términos diferentes.</p>
                <button class="clear-search-btn" onclick="advancedSearch.clearAllFilters()">
                    Limpiar búsqueda
                </button>
            </div>
        `;
    }

    updateResultsCount() {
        const totalCount = this.originalData.length;
        const filteredCount = this.filteredData.length;
        
        // Actualizar contador en la interfaz
        let resultsCounter = document.querySelector('.results-counter');
        if (!resultsCounter) {
            resultsCounter = document.createElement('div');
            resultsCounter.className = 'results-counter';
            const searchContainer = document.querySelector('.advanced-search-container');
            if (searchContainer) {
                searchContainer.appendChild(resultsCounter);
            }
        }

        if (filteredCount !== totalCount) {
            resultsCounter.innerHTML = `
                <span class="results-text">
                    Mostrando ${filteredCount} de ${totalCount} elementos
                </span>
            `;
            resultsCounter.style.display = 'block';
        } else {
            resultsCounter.style.display = 'none';
        }
    }

    clearAllFilters() {
        // Resetear filtros
        this.currentFilters = {
            search: '',
            type: 'all',
            dateFrom: null,
            dateTo: null,
            sortBy: 'date-desc'
        };

        // Limpiar inputs
        if (this.searchInput) this.searchInput.value = '';
        if (this.sortSelect) this.sortSelect.value = 'date-desc';
        if (this.dateFromInput) this.dateFromInput.value = '';
        if (this.dateToInput) this.dateToInput.value = '';

        // Resetear botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.filter-btn[data-type="all"]')?.classList.add('active');

        // Aplicar filtros (mostrar todo)
        this.applyFilters();
    }

    // Método para búsqueda por voz (funcionalidad futura)
    initVoiceSearch() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'es-ES';
            
            // Agregar botón de voz al input de búsqueda
            const voiceBtn = document.createElement('button');
            voiceBtn.className = 'voice-search-btn';
            voiceBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            `;
            
            const searchContainer = document.querySelector('.search-input-container');
            if (searchContainer) {
                searchContainer.appendChild(voiceBtn);
                
                voiceBtn.addEventListener('click', () => {
                    recognition.start();
                    voiceBtn.classList.add('listening');
                });
                
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    if (this.searchInput) {
                        this.searchInput.value = transcript;
                        this.currentFilters.search = transcript.toLowerCase();
                        this.applyFilters();
                    }
                };
                
                recognition.onend = () => {
                    voiceBtn.classList.remove('listening');
                };
            }
        }
    }
}

// Instancia global del sistema de búsqueda
let advancedSearch;

// Funciones de optimización de performance
function createProgressIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'progress-indicator';
  indicator.innerHTML = `
    <div class="progress-bar-container">
      <div class="progress-bar"></div>
      <span class="progress-text">Cargando contenido...</span>
    </div>
  `;
  return indicator;
}

function updateProgress(indicator, current, total) {
  const progressBar = indicator.querySelector('.progress-bar');
  const progressText = indicator.querySelector('.progress-text');
  
  if (progressBar && progressText) {
    const percentage = Math.round((current / total) * 100);
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Cargando ${current} de ${total} elementos...`;
  }
}

// Renderizado virtualizado para listas muy grandes
function renderContentVirtualized() {
  console.log('🚀 Iniciando renderizado virtualizado para lista grande');
  
  const itemHeight = 200; // Altura estimada de cada tarjeta
  const containerHeight = contentGrid.clientHeight || 600;
  const visibleItems = Math.ceil(containerHeight / itemHeight) + 2; // Buffer de 2 items
  
  let scrollTop = 0;
  let startIndex = 0;
  let endIndex = Math.min(visibleItems, filteredData.length);
  
  // Crear contenedor virtual
  const virtualContainer = document.createElement('div');
  virtualContainer.className = 'virtual-container';
  virtualContainer.style.height = `${filteredData.length * itemHeight}px`;
  virtualContainer.style.position = 'relative';
  
  const visibleContainer = document.createElement('div');
  visibleContainer.className = 'visible-container';
  visibleContainer.style.position = 'absolute';
  visibleContainer.style.top = '0';
  visibleContainer.style.width = '100%';
  
  virtualContainer.appendChild(visibleContainer);
  contentGrid.innerHTML = '';
  contentGrid.appendChild(virtualContainer);
  
  function renderVisibleItems() {
    const fragment = document.createDocumentFragment();
    
    for (let i = startIndex; i < endIndex; i++) {
      if (filteredData[i]) {
        const card = createHistorialCard(filteredData[i], i);
        if (card) {
          card.style.position = 'absolute';
          card.style.top = `${i * itemHeight}px`;
          card.style.width = '100%';
          fragment.appendChild(card);
        }
      }
    }
    
    visibleContainer.innerHTML = '';
    visibleContainer.appendChild(fragment);
  }
  
  function handleScroll() {
    scrollTop = contentGrid.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    const newEndIndex = Math.min(newStartIndex + visibleItems, filteredData.length);
    
    if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
      startIndex = newStartIndex;
      endIndex = newEndIndex;
      renderVisibleItems();
    }
  }
  
  // Throttle scroll events
  let scrollTimeout;
  contentGrid.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(handleScroll, 16); // ~60fps
  });
  
  // Renderizado inicial
  renderVisibleItems();
  
  console.log(`✅ Renderizado virtualizado completado: mostrando ${endIndex - startIndex} de ${filteredData.length} elementos`);
}

// Animaciones de entrada para las tarjetas
function animateCardsEntrance() {
  const cards = contentGrid.querySelectorAll('.historial-card');
  
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50); // Delay progresivo
  });
}

// Optimización de memoria - limpiar referencias
function cleanupMemory() {
  // Limpiar event listeners antiguos
  const oldCards = document.querySelectorAll('.historial-card');
  oldCards.forEach(card => {
    const clonedCard = card.cloneNode(true);
    card.parentNode?.replaceChild(clonedCard, card);
  });
  
  // Forzar garbage collection si está disponible
  if (window.gc) {
    window.gc();
  }
}

// Debounce mejorado para búsquedas
function createDebouncedSearch(callback, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback.apply(this, args), delay);
  };
}

// Cache inteligente para contenido
const contentCache = new Map();
const CACHE_SIZE_LIMIT = 100;

function getCachedContent(id) {
  return contentCache.get(id);
}

function setCachedContent(id, content) {
  if (contentCache.size >= CACHE_SIZE_LIMIT) {
    // Eliminar el elemento más antiguo
    const firstKey = contentCache.keys().next().value;
    contentCache.delete(firstKey);
  }
  contentCache.set(id, content);
}

// Función para confirmar eliminación de PDF completo
function confirmDeletePdf(pdfId, pdfTitle) {
  if (!pdfId) {
    console.error('ID de PDF no válido');
    return;
  }

  // Crear diálogo de confirmación personalizado
  const confirmDialog = document.createElement('div');
  confirmDialog.className = 'modal-overlay confirm-dialog';
  confirmDialog.innerHTML = `
    <div class="modal-content confirm-content">
      <div class="confirm-header">
        <h3>⚠️ Confirmar Eliminación de PDF</h3>
      </div>
      <div class="confirm-body">
        <p><strong>¿Estás seguro de que deseas eliminar el PDF completo?</strong></p>
        <p class="pdf-title">"${pdfTitle}"</p>
        <div class="warning-box">
          <div class="warning-icon">🚨</div>
          <div class="warning-text">
            <p><strong>Esta acción eliminará:</strong></p>
            <ul>
              <li>El archivo PDF original</li>
              <li>Todos los resúmenes generados</li>
              <li>Todas las preguntas y respuestas</li>
              <li>Todos los mapas mentales</li>
              <li>Todas las flashcards</li>
              <li>Todo el contenido IA relacionado</li>
            </ul>
          </div>
        </div>
        <p class="warning-final"><strong>Esta acción no se puede deshacer.</strong></p>
      </div>
      <div class="confirm-actions">
        <button class="btn-secondary cancel-btn">Cancelar</button>
        <button class="btn-danger confirm-btn">Sí, Eliminar Todo</button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmDialog);

  // Event listeners para los botones
  const cancelBtn = confirmDialog.querySelector('.cancel-btn');
  const confirmBtn = confirmDialog.querySelector('.confirm-btn');

  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(confirmDialog);
  });

  confirmBtn.addEventListener('click', () => {
    document.body.removeChild(confirmDialog);
    deletePdf(pdfId, pdfTitle);
  });
  
  // Cerrar al hacer clic fuera del diálogo
  confirmDialog.addEventListener('click', (e) => {
    if (e.target === confirmDialog) {
      document.body.removeChild(confirmDialog);
    }
  });
}

// Función para eliminar PDF completo
async function deletePdf(pdfId, pdfTitle) {
  try {
    showLoading('🗑️ Eliminando PDF y todo su contenido...');

    // Validar que el pdfId existe
    if (!pdfId) {
      throw new Error('ID de PDF no válido');
    }

    console.log('Eliminando PDF completo con ID:', pdfId);

    const response = await apiCall(`/api/pdfs/${pdfId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response || !response.ok) {
      const errorData = await response.text();
      console.error('Error del servidor:', errorData);
      throw new Error(`Error del servidor: ${response.status}`);
    }

    console.log('PDF eliminado exitosamente del servidor');

    // Actualizar datos locales - eliminar todos los elementos relacionados con este PDF
    const originalLength = historialData.length;
    historialData = historialData.filter(item => item.pdf_id != pdfId);
    
    const deletedCount = originalLength - historialData.length;
    
    if (deletedCount === 0) {
      console.warn('No se encontraron elementos del PDF en los datos locales');
    } else {
      console.log(`Se eliminaron ${deletedCount} elementos del PDF`);
    }

    // Actualizar filtros y estadísticas
    filterContent(currentFilter);
    updateStats();
    
    hideLoading();
    showSuccess(`✅ PDF "${pdfTitle}" y todo su contenido (${deletedCount} elementos) eliminados correctamente`);

    // Si no quedan elementos, mostrar estado vacío
    if (historialData.length === 0) {
      showEmptyState();
    }

  } catch (error) {
    console.error('❌ Error eliminando PDF:', error);
    hideLoading();
    showError(`Error al eliminar el PDF: ${error.message}`);
  }
}

// Historial JavaScript cargado y optimizado