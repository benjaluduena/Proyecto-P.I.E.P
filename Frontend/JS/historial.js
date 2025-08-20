// Historial de contenido IA - JavaScript

let historialData = [];
let filteredData = [];
let currentFilter = 'all';

// Variables para elementos DOM (se obtendrán dinámicamente)
let contentGrid, emptyState, historialLoadingOverlay, filterButtons, confirmModal, previewModal;
let totalItems, totalPdfs, favType;

// Función para obtener elementos DOM
function getHistorialElements() {
  contentGrid = document.getElementById('contentGrid');
  emptyState = document.getElementById('emptyState');
  historialLoadingOverlay = document.getElementById('loadingOverlay');
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
    loadingOverlay: !!historialLoadingOverlay,
    filterButtons: filterButtons.length,
    totalItems: !!totalItems
  });
}

// Función de inicialización global
window.initializeHistorial = async function() {
  console.log('🚀 Inicializando historial...');
  await initializeHistorial();
  setupEventListeners();
};

// Función global para refrescar el historial cuando se genera nuevo contenido
window.refreshHistorial = async function() {
  console.log('🔄 Refrescando historial por nuevo contenido...');
  
  // Solo refrescar si estamos en la página del historial o si los elementos existen
  const historialElements = document.getElementById('contentGrid');
  if (!historialElements) {
    console.log('📋 No estamos en la página del historial, guardando para después...');
    return;
  }
  
  if (typeof initializeHistorial === 'function') {
    // Obtener elementos DOM por si no están disponibles
    getHistorialElements();
    
    try {
      await loadHistorialData();
      updateStats();
      renderContent();
      console.log('✅ Historial refrescado exitosamente');
    } catch (error) {
      console.error('❌ Error refrescando historial:', error);
    }
  }
};

// Inicialización inmediata si el DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initializeHistorial);
} else {
  // Si el DOM ya está listo, ejecutar inmediatamente
  window.initializeHistorial();
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
    await loadHistorialData();
    updateStats();
    renderContent();
  } catch (error) {
    console.error('❌ Error inicializando historial:', error);
    showError('Error al cargar el historial');
  } finally {
    hideLoading();
  }
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

    if (!pdfResponse || !pdfResponse.ok) {
      console.error('❌ Error obteniendo PDFs:', pdfResponse?.status);
      throw new Error('No se pudieron obtener los PDFs');
    }

    const pdfData = await pdfResponse.json();
    const pdfs = pdfData.pdfs || [];
    console.log(`📚 PDFs encontrados: ${pdfs.length}`, pdfs);

    // Para cada PDF, obtener su contenido generado
    historialData = [];
    for (const pdf of pdfs) {
      try {
        console.log(`🔍 Obteniendo contenido para PDF ${pdf.id}...`);
        
        const contentResponse = await apiCall(`/api/ai/pdf/${pdf.id}`, {
          method: 'GET'
        });

        console.log(`📊 Respuesta contenido PDF ${pdf.id}:`, contentResponse?.status);

        if (contentResponse && contentResponse.ok) {
          const contentData = await contentResponse.json();
          const outputs = contentData.outputs || [];
          
          console.log(`✅ Outputs encontrados para PDF ${pdf.id}: ${outputs.length}`, outputs);

          // Agregar cada output al historial con información del PDF
          outputs.forEach(output => {
            historialData.push({
              ...output,
              pdf_title: pdf.title,
              pdf_id: pdf.id,
              pdf_file_name: pdf.file_name
            });
          });
        } else {
          console.log(`⚠️ Sin contenido para PDF ${pdf.id}`);
        }
      } catch (error) {
        console.error(`❌ Error obteniendo contenido para PDF ${pdf.id}:`, error);
      }
    }

    console.log(`🎯 Total items en historial: ${historialData.length}`, historialData);

    // Ordenar por fecha de creación (más reciente primero)
    historialData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    filteredData = [...historialData];

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
  if (!contentGrid) return;

  if (filteredData.length === 0) {
    contentGrid.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'flex';
    }
    return;
  }

  contentGrid.style.display = 'grid';
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  contentGrid.innerHTML = '';

  filteredData.forEach(item => {
    const card = createHistorialCard(item);
    contentGrid.appendChild(card);
  });
}

// Crear tarjeta de historial
function createHistorialCard(item) {
  const card = document.createElement('div');
  card.className = 'historial-card';
  card.dataset.outputId = item.id;

  const typeIcon = getTypeIcon(item.type);
  const typeName = getTypeDisplayName(item.type);
  const date = new Date(item.created_at).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  card.innerHTML = `
    <div class="card-header">
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
      <h4 class="card-title">${item.pdf_title || item.pdf_file_name}</h4>
      <p class="card-description">Contenido generado de tipo ${typeName}</p>
      <div class="card-meta">
        <span class="creation-date">${date}</span>
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
      deleteItem(item.id);
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
  currentFilter = filter;

  if (filter === 'all') {
    filteredData = [...historialData];
  } else {
    // Mapear filtros del UI a tipos de la BD
    const filterMap = {
      'resumen': 'resumen',
      'multiple_choice': 'multiple_choice',
      'verdadero_falso': 'verdadero_falso',
      'mapa_mental': 'flashcards', // Los mapas mentales se guardan como flashcards con metadata
      'chat-qa': 'chat-qa'
    };

    const dbType = filterMap[filter] || filter;
    
    if (filter === 'mapa_mental') {
      // Filtro especial para mapas mentales
      filteredData = historialData.filter(item => 
        item.type === 'flashcards' && 
        item.content && 
        item.content.__type === 'mapa_mental'
      );
    } else {
      filteredData = historialData.filter(item => item.type === dbType);
    }
  }

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
  if (!previewModal) return;

  try {
    showLoading();

    // Obtener el contenido completo del item
    const response = await apiCall(`/api/ai/content/${item.id}`, {
      method: 'GET'
    });

    if (!response || !response.ok) {
      throw new Error('No se pudo obtener el contenido');
    }

    const data = await response.json();
    const content = data.output.content;

    // Configurar modal
    const previewTitle = document.getElementById('previewTitle');
    const previewContent = document.getElementById('previewContent');

    if (previewTitle) {
      previewTitle.textContent = `${getTypeDisplayName(item.type)} - ${item.pdf_title}`;
    }

    if (previewContent) {
      previewContent.innerHTML = renderPreviewContent(content, item.type);
    }

    // Almacenar item actual para abrir completo
    previewModal.dataset.currentItem = JSON.stringify(item);

    previewModal.style.display = 'flex';

  } catch (error) {
    console.error('Error mostrando vista previa:', error);
    alert('Error al cargar la vista previa');
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
          <p>${content.resumen_general || 'No disponible'}</p>
          <h4>Conceptos Clave</h4>
          <ul>
            ${(content.conceptos_clave || []).map(concepto => `<li>${concepto}</li>`).join('')}
          </ul>
          <h4>Aplicaciones Prácticas</h4>
          <ul>
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
          ${preguntas.length > 3 ? `<p><em>... y ${preguntas.length - 3} preguntas más</em></p>` : ''}
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
          ${preguntasVF.length > 5 ? `<p><em>... y ${preguntasVF.length - 5} preguntas más</em></p>` : ''}
        </div>
      `;

    case 'flashcards':
      if (content.__type === 'mapa_mental') {
        return `
          <div class="preview-mapa-mental">
            <h4>${content.titulo || 'Mapa Mental'}</h4>
            <pre class="markmap-preview">${content.markmap || 'No disponible'}</pre>
            ${content.notas && content.notas.length > 0 ? `
              <h5>Notas:</h5>
              <ul>
                ${content.notas.map(nota => `<li>${nota}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `;
      }
      return '<p>Contenido de flashcards no disponible en vista previa</p>';

    default:
      return `<pre>${JSON.stringify(content, null, 2)}</pre>`;
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

// Eliminar item
async function deleteItem(outputId) {
  if (!confirm('¿Estás seguro de que deseas eliminar este contenido?')) {
    return;
  }

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

    alert('Contenido eliminado correctamente');

  } catch (error) {
    console.error('Error eliminando contenido:', error);
    alert('Error al eliminar el contenido');
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

// Mostrar loading
function showLoading() {
  if (historialLoadingOverlay) {
    historialLoadingOverlay.style.display = 'flex';
  }
}

// Ocultar loading
function hideLoading() {
  if (historialLoadingOverlay) {
    historialLoadingOverlay.style.display = 'none';
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
        <button onclick="initializeHistorial()" class="btn-primary">Reintentar</button>
      </div>
    `;
  }
}

console.log('Historial JavaScript cargado');