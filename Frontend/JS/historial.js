// Historial de contenido IA - JavaScript

let historialData = [];
let filteredData = [];
let currentFilter = 'all';

// Variables para elementos DOM (se obtendrán dinámicamente)
let contentGrid, emptyState, filterButtons, confirmModal, previewModal;
let totalItems, totalPdfs, favType;

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
  // Evitar inicialización múltiple
  if (historialInitialized) {
    console.log('📋 El historial ya está inicializado, refrescando...');
    await window.refreshHistorial();
    return;
  }
  
  // Limpiar cualquier inicialización previa
  cleanupHistorial();
  
  try {
    // Obtener elementos DOM
    getHistorialElements();
    showLoading();
    
    // Cargar datos y actualizar la interfaz
    await loadHistorialData();
    updateStats();
    renderContent();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Marcar como inicializado
    historialInitialized = true;
    
    console.log('✅ Historial inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar el historial:', error);
    showError('No se pudo cargar el historial. Por favor, intenta de nuevo.');
  } finally {
    hideLoading();
  }
};

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
      window.initializeHistorial();
      historialInitialized = true;
    }
  });
} else {
  // Si el DOM ya está listo, ejecutar inmediatamente
  if (!historialInitialized) {
    window.initializeHistorial();
    historialInitialized = true;
  }
}

// Configurar event listeners
function setupEventListeners() {
  console.log('⚙️ Configurando event listeners del historial...');
  
  // Obtener elementos DOM actualizados
  const currentFilterButtons = document.querySelectorAll('.filter-btn');
  console.log(`🔘 Filter buttons encontrados: ${currentFilterButtons.length}`);
  
  // Filtros
  currentFilterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      setActiveFilter(filter);
      filterContent(filter);
    });
  });

  // Botón limpiar historial
  const btnLimpiarHistorial = document.getElementById('btnLimpiarHistorial');
  if (btnLimpiarHistorial) {
    btnLimpiarHistorial.addEventListener('click', showConfirmModal);
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

// Inicializar historial
async function initializeHistorial() {
  console.log('🔧 Inicializando historial interno...');
  
  // Obtener elementos DOM
  getHistorialElements();
  
  showLoading();
  try {
    const data = await loadHistorialData();
    
    if (Array.isArray(data) && data.length === 0) {
      // No hay datos pero no es un error
      updateStats();
      renderContent(); // Esto mostrará el estado vacío
    } else {
      // Hay datos, actualizar UI
      updateStats();
      renderContent();
    }
  } catch (error) {
    console.error('❌ Error inicializando historial:', error);
    showError(error.message || 'Error al cargar el historial');
  } finally {
    hideLoading();
  }
  
  // Marcar como inicializado
  historialInitialized = true;
}

// Cargar datos del historial
async function loadHistorialData() {
  try {
    console.log('🔄 Cargando datos del historial...');
    
    // Obtener todos los PDFs del usuario
    const pdfResponse = await apiCall('/api/pdfs/my-pdfs', {
      method: 'GET'
    });

    console.log('📄 Respuesta PDFs:', pdfResponse?.status);

    if (!pdfResponse) {
      throw new Error('Error de conexión al servidor. Por favor, verifica tu conexión a internet.');
    }
    
    if (!pdfResponse.ok) {
      if (pdfResponse.status === 404) {
        throw new Error('No se encontró la ruta para obtener PDFs. Contacta al administrador.');
      } else if (pdfResponse.status === 500) {
        throw new Error('Error interno del servidor. Intenta nuevamente más tarde.');
      } else {
        throw new Error(`Error obteniendo PDFs (${pdfResponse.status}): ${pdfResponse.statusText}`);
      }
    }

    const pdfData = await pdfResponse.json().catch(() => ({ pdfs: [] }));
    const pdfs = pdfData.pdfs || [];
    console.log(`📚 PDFs encontrados: ${pdfs.length}`, pdfs);

    if (pdfs.length === 0) {
      console.log('⚠️ No se encontraron PDFs para este usuario');
      return []; // Retornar array vacío en lugar de lanzar error
    }

    // Para cada PDF, obtener su contenido generado
    historialData = [];
    let errorCount = 0;
    
    for (const pdf of pdfs) {
      try {
        console.log(`🔍 Obteniendo contenido para PDF ${pdf.id}...`);
        
        const contentResponse = await apiCall(`/api/ai/pdf/${pdf.id}`, {
          method: 'GET'
        });

        console.log(`📊 Respuesta contenido PDF ${pdf.id}:`, contentResponse?.status);

        if (contentResponse && contentResponse.ok) {
          const contentData = await contentResponse.json().catch(() => ({ outputs: [] }));
          const outputs = contentData.outputs || [];
          
          console.log(`✅ Outputs encontrados para PDF ${pdf.id}: ${outputs.length}`, outputs);

          // Agregar cada output al historial con información del PDF
          outputs.forEach(output => {
            historialData.push({
              ...output,
              pdf_title: pdf.title || 'Documento sin título',
              pdf_id: pdf.id,
              pdf_file_name: pdf.file_name || 'archivo.pdf'
            });
          });
        } else {
          console.log(`⚠️ Sin contenido para PDF ${pdf.id}`);
        }
      } catch (error) {
        console.error(`❌ Error obteniendo contenido para PDF ${pdf.id}:`, error);
        errorCount++;
      }
    }

    console.log(`🎯 Total items en historial: ${historialData.length}`, historialData);

    // Mostrar advertencia si hubo errores en algunos PDFs
    if (errorCount > 0) {
      console.warn(`⚠️ No se pudo cargar el contenido de ${errorCount} PDFs`);
    }

    // Ordenar por fecha de creación (más reciente primero)
    historialData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filteredData = [...historialData];
    
    return historialData;

  } catch (error) {
    console.error('Error cargando historial:', error);
    throw error;
  }
}

// Actualizar estadísticas
function updateStats() {
  // Total items
  if (totalItems) {
    totalItems.textContent = historialData.length;
  }

  // Total PDFs únicos
  const uniquePdfs = new Set(historialData.map(item => item.pdf_id));
  if (totalPdfs) {
    totalPdfs.textContent = uniquePdfs.size;
  }

  // Tipo más usado
  const typeCounts = {};
  historialData.forEach(item => {
    const type = getTypeDisplayName(item.type);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const mostUsedType = Object.entries(typeCounts)
    .sort(([,a], [,b]) => b - a)[0];

  if (favType) {
    favType.textContent = mostUsedType ? mostUsedType[0] : '-';
  }
}

// Renderizar contenido
function renderContent() {
  if (!contentGrid) {
    console.error('Error: contentGrid no está definido');
    return;
  }

  // Verificar si hay datos filtrados
  if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
    console.log('No hay elementos para mostrar en el historial');
    contentGrid.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'flex';
    }
    return;
  }

  // Mostrar grid y ocultar estado vacío
  contentGrid.style.display = 'grid';
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  // Limpiar contenido anterior
  contentGrid.innerHTML = '';

  // Renderizar cada elemento
  let renderedCount = 0;
  filteredData.forEach(item => {
    try {
      if (!item || !item.id) {
        console.warn('Item inválido en filteredData:', item);
        return;
      }
      
      const card = createHistorialCard(item);
      contentGrid.appendChild(card);
      renderedCount++;
    } catch (error) {
      console.error('Error al renderizar item:', error, item);
    }
  });
  
  console.log(`✅ Renderizados ${renderedCount} de ${filteredData.length} elementos`);
  
  // Si no se pudo renderizar ningún elemento, mostrar estado vacío
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
  } else if (renderedCount > 0) {
    // Agregar el botón de limpiar historial después del último elemento
    const clearHistoryContainer = document.createElement('div');
    clearHistoryContainer.className = 'clear-history-container';
    clearHistoryContainer.innerHTML = `
      <button class="btn-action btn-danger" id="btnLimpiarHistorialBottom">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Limpiar Todo
      </button>
    `;
    contentGrid.parentNode.appendChild(clearHistoryContainer);
    
    // Agregar event listener al nuevo botón
    const btnLimpiarHistorialBottom = document.getElementById('btnLimpiarHistorialBottom');
    if (btnLimpiarHistorialBottom) {
      btnLimpiarHistorialBottom.addEventListener('click', showConfirmModal);
    }
  }
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
  
  // Manejar fechas inválidas
  let dateStr = 'Fecha desconocida';
  try {
    if (item.created_at) {
      const date = new Date(item.created_at);
      if (!isNaN(date.getTime())) { // Verificar si la fecha es válida
        dateStr = date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  } catch (e) {
    console.warn('Error al formatear fecha:', e);
  }

  // Título seguro
  const safeTitle = item.pdf_title || item.pdf_file_name || 'Documento sin título';

  card.innerHTML = `
    <div class="card-header ${typeClass}">
      <div class="card-type">
        <span class="type-icon">${typeIcon}</span>
        <span class="type-name">${typeName}</span>
      </div>
      <div class="card-actions">
        <button class="action-btn preview-btn" title="Vista previa" data-id="${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
        </button>
        <button class="action-btn delete-btn" title="Eliminar" data-id="${item.id}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-content">
      <h4 class="card-title">${safeTitle}</h4>
      <p class="card-description">Contenido generado de tipo ${typeName}</p>
      <div class="card-meta">
        <span class="creation-date">${dateStr}</span>
      </div>
    </div>
  `;

  // Event listeners para los botones
  const previewBtn = card.querySelector('.preview-btn');
  const deleteBtn = card.querySelector('.delete-btn');

  if (previewBtn) {
    previewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showPreview(item);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteItem(item.id);
    });
  }

  // Click en la tarjeta para abrir completo
  card.addEventListener('click', () => {
    openContent(item);
  });

  return card;
}

// Obtener icono para tipo de contenido
function getTypeIcon(type) {
  const icons = {
    'resumen': '📄',
    'multiple_choice': '❓',
    'verdadero_falso': '✅',
    'flashcards': '🗃️',
    'problema': '🧮',
    'recomendacion_texto': '📚',
    'recomendacion_video': '🎥',
    'mapa_mental': '🧠'
  };

  return icons[type] || '📝';
}

// Obtener nombre legible para tipo de contenido
function getTypeDisplayName(type) {
  const names = {
    'resumen': 'Resumen',
    'multiple_choice': 'Multiple Choice',
    'verdadero_falso': 'Verdadero/Falso',
    'flashcards': 'Flashcards',
    'problema': 'Problemas',
    'recomendacion_texto': 'Recomendaciones Texto',
    'recomendacion_video': 'Recomendaciones Video',
    'mapa_mental': 'Mapa Mental'
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
      'mapa_mental': 'flashcards', // Los mapas mentales se guardan como flashcards con metadata
      'flashcards': 'flashcards',
      'problema': 'problema',
      'recomendacion_texto': 'recomendacion_texto',
      'recomendacion_video': 'recomendacion_video',
      'chat-qa': 'chat-qa'
    };

    const dbType = filterMap[filter] || filter;
    
    if (filter === 'mapa_mental') {
      // Filtro especial para mapas mentales
      filteredData = historialData.filter(item => {
        try {
          // Verificar si es un flashcard de tipo mapa mental
          return item.type === 'flashcards' && 
                 item.content && 
                 (item.content.__type === 'mapa_mental' || 
                  (typeof item.content === 'string' && 
                   JSON.parse(item.content).__type === 'mapa_mental'));
        } catch (e) {
          console.warn('Error al procesar item para filtro mapa_mental:', e);
          return false;
        }
      });
    } else {
      filteredData = historialData.filter(item => item.type === dbType);
    }
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
          <h4>Resumen General</h4>
          <div class="preview-content">${content.resumen_general || 'No disponible'}</div>
          <h4>Conceptos Clave</h4>
          <ul class="preview-list">
            ${(content.conceptos_clave || []).map(concepto => `<li>${concepto}</li>`).join('')}
          </ul>
          <h4>Aplicaciones Prácticas</h4>
          <ul class="preview-list">
            ${(content.aplicaciones_practicas || []).map(app => `<li>${app}</li>`).join('')}
          </ul>
        </div>
      `;

    case 'multiple_choice':
      const preguntas = content.preguntas || [];
      return `
        <div class="preview-multiple-choice">
          <h4>Preguntas (${preguntas.length} total)</h4>
          ${preguntas.slice(0, 3).map((pregunta, index) => `
            <div class="pregunta-preview">
              <h5>${index + 1}. ${pregunta.enunciado}</h5>
              <ul>
                ${(pregunta.opciones || []).map((opcion, i) => `
                  <li class="${i === pregunta.respuesta ? 'correcta' : ''}">${String.fromCharCode(65 + i)}. ${opcion}</li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
          ${preguntas.length > 3 ? `<p class="more-content"><em>... y ${preguntas.length - 3} preguntas más</em></p>` : ''}
        </div>
      `;

    case 'verdadero_falso':
      const preguntasVF = content.preguntas || [];
      return `
        <div class="preview-verdadero-falso">
          <h4>Preguntas V/F (${preguntasVF.length} total)</h4>
          ${preguntasVF.slice(0, 5).map((pregunta, index) => `
            <div class="pregunta-vf-preview">
              <p><strong>${index + 1}.</strong> ${pregunta.enunciado}</p>
              <p class="respuesta-${pregunta.respuesta}">${pregunta.respuesta?.toUpperCase()}</p>
            </div>
          `).join('')}
          ${preguntasVF.length > 5 ? `<p class="more-content"><em>... y ${preguntasVF.length - 5} preguntas más</em></p>` : ''}
        </div>
      `;

    case 'flashcards':
      // Verificar si es realmente un resumen (que se guardó incorrectamente como flashcard)
      if (content.resumen_general || content.conceptos_clave || content.aplicaciones_practicas) {
        return `
          <div class="preview-resumen">
            <h4>Resumen General</h4>
            <div class="preview-content">${content.resumen_general || 'No disponible'}</div>
            ${content.conceptos_clave ? `
              <h4>Conceptos Clave</h4>
              <ul class="preview-list">
                ${(content.conceptos_clave || []).map(concepto => `<li>${concepto}</li>`).join('')}
              </ul>
            ` : ''}
            ${content.aplicaciones_practicas ? `
              <h4>Aplicaciones Prácticas</h4>
              <ul class="preview-list">
                ${(content.aplicaciones_practicas || []).map(app => `<li>${app}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      } else if (content.__type === 'mapa_mental') {
        return `
          <div class="preview-mapa-mental">
            <h4>${content.titulo || 'Mapa Mental'}</h4>
            <div class="mapa-preview-container">
              <pre class="markmap-preview">${content.markmap || 'No disponible'}</pre>
              <p class="preview-action">Haz clic para ver el mapa completo</p>
            </div>
            ${content.notas && content.notas.length > 0 ? `
              <h5>Notas:</h5>
              <ul class="preview-list">
                ${content.notas.map(nota => `<li>${nota}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
      return '<p>Contenido de flashcards no disponible en vista previa</p>';

    default:
      return `<pre class="json-preview">${JSON.stringify(content, null, 2)}</pre>`;
  }
}

// Abrir contenido completo
function openContent(item) {
  // Determinar qué página abrir según el tipo
  const pageMap = {
    'resumen': 'resumen.html',
    'multiple_choice': 'multiple-choice.html',
    'verdadero_falso': 'verdadero-falso.html',
    'flashcards': content => {
      if (content.__type === 'mapa_mental') {
        return 'mapa-mental.html';
      }
      return null; // No hay página específica para flashcards normales
    }
  };

  let page = pageMap[item.type];
  if (typeof page === 'function') {
    // Para casos especiales como mapas mentales
    page = page(item.content);
  }

  if (page) {
    // Limpiar recursos antes de navegar
    cleanupHistorial();
    
    // Guardar datos para la siguiente página
    sessionStorage.setItem('currentContent', JSON.stringify({
      outputId: item.id,
      pdfId: item.pdf_id,
      pdfTitle: item.pdf_title,
      type: item.type
    }));

    window.location.href = `/${page}`;
  } else {
    showPreview(item);
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
    showLoading();

    const response = await apiCall(`/api/ai/content/${outputId}`, {
      method: 'DELETE'
    });

    if (!response || !response.ok) {
      throw new Error('No se pudo eliminar el contenido');
    }

    // Actualizar datos locales
    historialData = historialData.filter(item => item.id !== outputId);
    filterContent(currentFilter);
    updateStats();
    renderContent(); // Volver a renderizar el contenido

    // Mostrar notificación de éxito
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.innerHTML = `
      <div class="notification-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
        <span>Contenido eliminado correctamente</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Eliminar la notificación después de 3 segundos
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);

  } catch (error) {
    console.error('Error eliminando contenido:', error);
    
    // Mostrar notificación de error
    const notification = document.createElement('div');
    notification.className = 'notification error';
    notification.innerHTML = `
      <div class="notification-content">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
        <span>Error al eliminar el contenido</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    // Eliminar la notificación después de 3 segundos
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  } finally {
    hideLoading();
  }
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
function showLoading() {
  if (window.app && window.app.uiModule) {
    window.app.uiModule.showLoading('Cargando historial...');
  }
}

// Ocultar loading usando módulo UI global
function hideLoading() {
  if (window.app && window.app.uiModule) {
    window.app.uiModule.hideLoading();
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
        <button onclick="refreshHistorial()" class="btn-primary">
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

console.log('Historial JavaScript cargado');