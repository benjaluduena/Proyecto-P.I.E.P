// Historial simplificado con filtros y vista compacta

// Variables globales para el historial simplificado
let historialData = [];
let filteredData = [];
let currentFilter = 'all';

window.initializeHistorial = async function() {
  console.log('🚀 Inicializando historial simplificado...');
  
  try {
    // Resetear variables globales para nueva inicialización
    historialData = [];
    filteredData = [];
    currentFilter = 'all';
    
    // Obtener elementos DOM
    const contentGrid = document.getElementById('contentGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (!contentGrid) {
      console.error('❌ No se encontró contentGrid');
      return;
    }
    
    console.log('✅ Elementos encontrados:', {
      contentGrid: !!contentGrid,
      emptyState: !!emptyState
    });
    
    // Verificar si apiCall está disponible
    if (typeof apiCall !== 'function') {
      console.error('❌ apiCall no está disponible');
      
      // Mostrar datos estáticos de prueba
      showTestData();
      return;
    }
    
    console.log('✅ apiCall disponible');
    
    // Mostrar loading
    contentGrid.innerHTML = '<div style="text-align: center; padding: 2rem;">🔄 Cargando historial...</div>';
    
    // Llamar a la API
    const response = await apiCall('/api/study/outputs');
    console.log('📡 Respuesta API:', response.status);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 Datos recibidos:', data.length, 'items');
    
    // Guardar datos globalmente
    historialData = data;
    filteredData = [...data];
    
    // Configurar filtros
    setupFilters();
    
    // Configurar búsqueda
    setupSearch();
    
    // Configurar exportación de favoritos
    setupExportTools();
    
    // Mostrar los datos
    if (data.length === 0) {
      showEmptyState();
    } else {
      renderHistorialData(filteredData);
      updateStats();
    }
    
    console.log('✅ Historial inicializado correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    document.getElementById('contentGrid').innerHTML = `
      <div style="text-align: center; padding: 2rem; color: red;">
        ❌ Error al cargar el historial: ${error.message}
      </div>
    `;
  }
};

function showTestData() {
  const contentGrid = document.getElementById('contentGrid');
  contentGrid.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h3>🧪 Datos de Prueba</h3>
      <p>apiCall no está disponible, mostrando datos estáticos</p>
      <div style="border: 1px solid #ddd; padding: 1rem; margin: 1rem; border-radius: 8px;">
        <h4>Resumen de Prueba</h4>
        <p>Este es un elemento de prueba del historial</p>
      </div>
    </div>
  `;
}

function showEmptyState() {
  const contentGrid = document.getElementById('contentGrid');
  const emptyState = document.getElementById('emptyState');
  
  contentGrid.innerHTML = '';
  if (emptyState) {
    emptyState.style.display = 'flex';
  }
}

function setupFilters() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  
  filterButtons.forEach(button => {
    // Remover event listeners existentes clonando el botón
    const newButton = button.cloneNode(true);
    if (button.parentNode) {
      button.parentNode.replaceChild(newButton, button);
    }
    
    // Agregar nuevo event listener
    newButton.addEventListener('click', () => {
      // Remover active de todos los botones
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      
      // Agregar active al botón clickeado
      newButton.classList.add('active');
      
      // Obtener el filtro del atributo data-filter
      const filter = newButton.getAttribute('data-filter') || 'all';
      console.log('Filtro seleccionado:', filter);
      
      // Aplicar filtro
      applyFilter(filter);
    });
  });
  
  // Activar el filtro "Todos" por defecto
  const allButton = document.querySelector('.filter-btn[data-filter="all"]');
  if (allButton) {
    allButton.classList.add('active');
  }
}

function applyFilter(filter) {
  currentFilter = filter;
  applyFiltersAndSearch();
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  
  if (!searchInput) {
    console.warn('⚠️ Campo de búsqueda no encontrado');
    return;
  }
  
  // Configurar eventos de búsqueda
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    
    if (searchTerm.length > 0) {
      clearSearch.style.display = 'block';
    } else {
      clearSearch.style.display = 'none';
    }
    
    applyFiltersAndSearch();
  });
  
  // Configurar botón de limpiar búsqueda
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      clearSearch.style.display = 'none';
      applyFiltersAndSearch();
      searchInput.focus();
    });
  }
  
  console.log('✅ Búsqueda configurada');
}

function applyFiltersAndSearch() {
  let data = [...historialData];
  
  // Aplicar filtro por tipo o favoritos
  if (currentFilter === 'favorites') {
    const favorites = getFavorites();
    data = data.filter(item => favorites.includes(item.id.toString()));
  } else if (currentFilter !== 'all') {
    data = data.filter(item => item.type === currentFilter);
  }
  
  // Aplicar búsqueda por texto
  const searchInput = document.getElementById('searchInput');
  if (searchInput && searchInput.value.trim().length > 0) {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    data = data.filter(item => {
      // Buscar en título del PDF
      const pdfTitle = (item.pdf_title || item.pdf_name || '').toLowerCase();
      if (pdfTitle.includes(searchTerm)) return true;
      
      // Buscar en tipo de contenido
      const typeName = getTypeName(item.type).toLowerCase();
      if (typeName.includes(searchTerm)) return true;
      
      // Buscar en contenido específico según el tipo
      return searchInContent(item.content, item.type, searchTerm);
    });
  }
  
  filteredData = data;
  
  console.log(`Filtros aplicados - Tipo: "${currentFilter}", Resultados: ${filteredData.length}`);
  
  // Re-renderizar contenido
  renderHistorialData(filteredData);
  updateStats();
}

function searchInContent(content, type, searchTerm) {
  if (!content) return false;
  
  try {
    switch(type) {
      case 'resumen':
        return (content.resumen_general || '').toLowerCase().includes(searchTerm) ||
               (content.conceptos_clave || []).some(concepto => 
                 concepto.toLowerCase().includes(searchTerm)) ||
               (content.aplicaciones_practicas || []).some(app => 
                 app.toLowerCase().includes(searchTerm)) ||
               (content.conclusiones || '').toLowerCase().includes(searchTerm);
      
      case 'multiple_choice':
      case 'verdadero_falso':
        return (content.preguntas || []).some(pregunta => 
          (pregunta.enunciado || '').toLowerCase().includes(searchTerm) ||
          (pregunta.explicacion || '').toLowerCase().includes(searchTerm) ||
          (pregunta.opciones || []).some(opcion => 
            opcion.toLowerCase().includes(searchTerm)));
      
      case 'mapa_mental':
        return (content.nodo_central || '').toLowerCase().includes(searchTerm) ||
               (content.ramas || []).some(rama => 
                 (rama.titulo || '').toLowerCase().includes(searchTerm) ||
                 (rama.items || []).some(item => 
                   item.toLowerCase().includes(searchTerm)));
      
      case 'flashcards':
        return (content.cards || []).some(card => 
          (card.pregunta || card.frente || '').toLowerCase().includes(searchTerm) ||
          (card.respuesta || card.reverso || '').toLowerCase().includes(searchTerm));
      
      default:
        const contentStr = JSON.stringify(content).toLowerCase();
        return contentStr.includes(searchTerm);
    }
  } catch (error) {
    console.warn('Error al buscar en contenido:', error);
    return false;
  }
}

function updateStats() {
  // Actualizar estadísticas
  const totalItems = document.getElementById('totalItems');
  const totalPdfs = document.getElementById('totalPdfs');
  
  if (totalItems) {
    totalItems.textContent = filteredData.length;
  }
  
  if (totalPdfs) {
    // Contar PDFs únicos
    const uniquePdfs = [...new Set(filteredData.map(item => item.pdf_id))];
    totalPdfs.textContent = uniquePdfs.length;
  }
  
  console.log('📊 Estadísticas actualizadas:', {
    totalItems: filteredData.length,
    uniquePdfs: [...new Set(filteredData.map(item => item.pdf_id))].length
  });
  
  // Actualizar visibilidad de herramientas
  updateExportToolsVisibility();
}

function renderHistorialData(data) {
  const contentGrid = document.getElementById('contentGrid');
  const emptyState = document.getElementById('emptyState');
  
  if (emptyState) {
    emptyState.style.display = 'none';
  }
  
  // Agregar estilos CSS si no existen
  if (!document.getElementById('historial-simple-styles')) {
    const styles = document.createElement('style');
    styles.id = 'historial-simple-styles';
    styles.innerHTML = `
      .historial-card {
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 12px;
        margin-bottom: 1rem;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .historial-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #f0f0f0;
      }
      .card-type {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
      }
      .card-date {
        color: #7f8c8d;
        font-size: 0.9rem;
      }
      .card-pdf-info {
        color: #6c757d;
        font-size: 0.95rem;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 6px;
      }
      .card-content {
        position: relative;
      }
      .card-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f0f0f0;
        flex-wrap: wrap;
      }
      .btn-action {
        border: none;
        padding: 0.4rem 0.8rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;
      }
      .btn-interactive {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .btn-interactive:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        transform: translateY(-1px);
      }
      .btn-study {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
      }
      .btn-study:hover {
        background: linear-gradient(135deg, #0f7b6c 0%, #2dd4bf 100%);
        transform: translateY(-1px);
      }
      .btn-chat {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .btn-chat:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        transform: translateY(-1px);
      }
      .btn-export {
        background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        color: #8b4513;
        border: 1px solid #ddd;
      }
      .btn-export:hover {
        background: linear-gradient(135deg, #ffd89b 0%, #f093fb 100%);
        transform: translateY(-1px);
      }
      .btn-practice {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        color: white;
      }
      .btn-practice:hover {
        background: linear-gradient(135deg, #e91e63 0%, #ffc107 100%);
        transform: translateY(-1px);
      }
      .btn-question {
        background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
        color: #4a5568;
        border: 1px solid #ddd;
      }
      .btn-question:hover {
        background: linear-gradient(135deg, #c084fc 0%, #fde68a 100%);
        transform: translateY(-1px);
      }
      .search-container {
        margin-bottom: 1rem;
      }
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        max-width: 400px;
        margin: 0 auto;
      }
      .search-input {
        width: 100%;
        padding: 0.75rem 1rem 0.75rem 3rem;
        border: 2px solid #e1e5e9;
        border-radius: 25px;
        font-size: 0.95rem;
        background: white;
        transition: all 0.3s ease;
        outline: none;
      }
      .search-input:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
      }
      .search-icon {
        position: absolute;
        left: 1rem;
        color: #6c757d;
        z-index: 2;
      }
      .clear-search {
        position: absolute;
        right: 0.75rem;
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        transition: background 0.2s ease;
      }
      .clear-search:hover {
        background: #f8f9fa;
      }
      .card-header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .card-header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-favorite {
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .btn-favorite:hover {
        background: #f8f9fa;
        color: #dc3545;
      }
      .btn-favorite.active {
        color: #dc3545;
        background: #fff5f5;
      }
      .btn-favorite.active:hover {
        background: #fee;
      }
      .btn-delete {
        background: none;
        border: none;
        color: #6c757d;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 50%;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .btn-delete:hover {
        background: #fff5f5;
        color: #dc3545;
      }
      .header-tools {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .btn-tool {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      .btn-tool:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
        transform: translateY(-1px);
      }
      .btn-tool.btn-danger {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
      }
      .btn-tool.btn-danger:hover {
        background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(styles);
  }

  if (data.length === 0) {
    contentGrid.innerHTML = `
      <div style="text-align: center; padding: 3rem;">
        <h3>🔍 No se encontraron resultados</h3>
        <p>No hay contenido que coincida con el filtro seleccionado.</p>
      </div>
    `;
    return;
  }

  const html = data.map(item => `
    <div class="historial-card" data-id="${item.id}">
      <div class="card-header">
        <div class="card-type">
          ${getTypeIcon(item.type)}
          <span>${getTypeName(item.type)}</span>
        </div>
        <div class="card-header-right">
          <div class="card-header-actions">
            <button onclick="toggleFavorite('${item.id}')" class="btn-favorite ${isFavorite(item.id) ? 'active' : ''}" title="Marcar como favorito">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </button>
            <button onclick="deleteItem('${item.id}')" class="btn-delete" title="Eliminar elemento">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
          <div class="card-date">
            ${new Date(item.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div class="card-pdf-info">
        📄 ${item.pdf_title || item.pdf_name}
      </div>
      <div class="card-content" id="content-${item.id}">
        ${formatContentByType(item.content, item.type)}
      </div>
      <div class="card-actions">
        ${generateActionButtons(item)}
      </div>
    </div>
  `).join('');
  
  contentGrid.innerHTML = html;
}



function getTypeName(type) {
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

function getTypeIcon(type) {
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

// Generar botones de acción específicos por tipo de contenido
function generateActionButtons(item) {
  const actionsConfig = {
    'mapa_mental': [
      { text: 'Ver Interactivo', action: 'openInteractive', icon: '🧠', class: 'btn-interactive' },
      { text: 'Exportar PNG', action: 'exportImage', icon: '📸', class: 'btn-export' }
    ],
    'flashcards': [
      { text: 'Estudiar', action: 'openStudy', icon: '📚', class: 'btn-study' },
      { text: 'Exportar', action: 'exportCards', icon: '📄', class: 'btn-export' }
    ],
    'chat-qa': [
      { text: 'Continuar Chat', action: 'openChat', icon: '💬', class: 'btn-chat' },
      { text: 'Nueva Pregunta', action: 'newQuestion', icon: '❓', class: 'btn-question' }
    ],
    'resumen': [
      { text: 'Generar PDF', action: 'exportPDF', icon: '📑', class: 'btn-export' }
    ],
    'multiple_choice': [
      { text: 'Practicar', action: 'startQuiz', icon: '🎯', class: 'btn-practice' },
      { text: 'Exportar', action: 'exportQuiz', icon: '📄', class: 'btn-export' }
    ],
    'verdadero_falso': [
      { text: 'Practicar', action: 'startQuiz', icon: '✅', class: 'btn-practice' },
      { text: 'Exportar', action: 'exportQuiz', icon: '📄', class: 'btn-export' }
    ]
  };

  const actions = actionsConfig[item.type] || [];
  
  return actions.map(action => `
    <button onclick="handleContentAction('${action.action}', '${item.id}')" 
            class="btn-action ${action.class}" 
            title="${action.text}">
      ${action.icon} ${action.text}
    </button>
  `).join('');
}

function formatContentByType(content, type) {
  if (!content) return '<p>Sin contenido</p>';
  
  switch(type) {
    case 'resumen':
      return formatResumen(content);
    case 'multiple_choice':
      return formatMultipleChoice(content);
    case 'verdadero_falso':
      return formatVerdaderoFalso(content);
    case 'mapa_mental':
      return formatMapaMental(content);
    case 'flashcards':
      return formatFlashcards(content);
    case 'chat-qa':
      return formatChatQA(content);
    default:
      return `<pre>${JSON.stringify(content, null, 2)}</pre>`;
  }
}

function formatResumen(content) {
  return `
    <div class="resumen-content">
      <h4>📋 Resumen General</h4>
      <p>${content.resumen_general || 'No disponible'}</p>
      
      ${content.conceptos_clave ? `
        <h4>🔑 Conceptos Clave</h4>
        <ul>
          ${content.conceptos_clave.map(concepto => `<li>${concepto}</li>`).join('')}
        </ul>
      ` : ''}
      
      ${content.aplicaciones_practicas ? `
        <h4>🛠️ Aplicaciones Prácticas</h4>
        <ul>
          ${content.aplicaciones_practicas.map(app => `<li>${app}</li>`).join('')}
        </ul>
      ` : ''}
      
      ${content.conclusiones ? `
        <h4>💡 Conclusiones</h4>
        <p>${content.conclusiones}</p>
      ` : ''}
    </div>
  `;
}

function formatMultipleChoice(content) {
  if (!content.preguntas) return '<p>Sin preguntas</p>';
  
  return `
    <div class="multiple-choice-content">
      <h4>🎯 Preguntas de Opción Múltiple</h4>
      ${content.preguntas.map((pregunta, index) => `
        <div class="pregunta-item" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          <h5>Pregunta ${index + 1}</h5>
          <p><strong>${pregunta.enunciado}</strong></p>
          <ol type="a" style="margin: 0.5rem 0;">
            ${pregunta.opciones.map((opcion, opIndex) => `
              <li style="color: ${opIndex === pregunta.respuesta ? '#28a745' : '#6c757d'}; font-weight: ${opIndex === pregunta.respuesta ? 'bold' : 'normal'};">
                ${opcion} ${opIndex === pregunta.respuesta ? '✅' : ''}
              </li>
            `).join('')}
          </ol>
          <div style="margin-top: 0.5rem; font-size: 0.9em; color: #6c757d;">
            <strong>Explicación:</strong> ${pregunta.explicacion}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatVerdaderoFalso(content) {
  if (!content.preguntas) return '<p>Sin preguntas</p>';
  
  return `
    <div class="verdadero-falso-content">
      <h4>✅ Preguntas Verdadero o Falso</h4>
      ${content.preguntas.map((pregunta, index) => `
        <div class="pregunta-item" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
          <h5>Pregunta ${index + 1}</h5>
          <p><strong>${pregunta.enunciado}</strong></p>
          <p style="margin: 0.5rem 0;">
            <span style="color: ${pregunta.respuesta === 'verdadero' ? '#28a745' : '#dc3545'}; font-weight: bold;">
              ${pregunta.respuesta === 'verdadero' ? '✅ VERDADERO' : '❌ FALSO'}
            </span>
          </p>
          <div style="margin-top: 0.5rem; font-size: 0.9em; color: #6c757d;">
            <strong>Explicación:</strong> ${pregunta.explicacion}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function formatMapaMental(content) {
  return `
    <div class="mapa-mental-content">
      <h4>🧠 Mapa Mental</h4>
      <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
        ${content.nodo_central ? `
          <div style="text-align: center; margin-bottom: 1rem;">
            <strong style="background: #007bff; color: white; padding: 0.5rem 1rem; border-radius: 20px;">
              ${content.nodo_central}
            </strong>
          </div>
        ` : ''}
        
        ${content.ramas ? content.ramas.map(rama => `
          <div style="margin: 1rem 0; border-left: 3px solid #007bff; padding-left: 1rem;">
            <strong>${rama.titulo}</strong>
            ${rama.items ? `
              <ul style="margin-top: 0.5rem;">
                ${rama.items.map(item => `<li>${item}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('') : ''}
      </div>
    </div>
  `;
}

function formatFlashcards(content) {
  if (!content.cards) return '<p>Sin flashcards</p>';
  
  return `
    <div class="flashcards-content">
      <h4>🗂️ Flashcards</h4>
      <div style="display: grid; gap: 1rem;">
        ${content.cards.map((card, index) => `
          <div class="flashcard" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
            <div style="background: #007bff; color: white; padding: 0.5rem 1rem;">
              <strong>Card ${index + 1}</strong>
            </div>
            <div style="padding: 1rem;">
              <div style="margin-bottom: 1rem;">
                <strong>Pregunta:</strong><br>
                ${card.pregunta || card.frente}
              </div>
              <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px;">
                <strong>Respuesta:</strong><br>
                ${card.respuesta || card.reverso}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function formatChatQA(content) {
  return `
    <div class="chat-qa-content">
      <h4>💬 Sistema de Preguntas y Respuestas</h4>
      <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; text-align: center;">
        <div style="color: #6c757d; margin-bottom: 1rem;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="margin-bottom: 0.5rem;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <h5 style="color: #495057; margin-bottom: 1rem;">Sistema Interactivo Activo</h5>
        <p style="color: #6c757d; margin-bottom: 1.5rem;">
          Este es un sistema de chat inteligente que permite hacer preguntas específicas sobre el contenido del PDF y recibir respuestas contextualizadas.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <div style="background: white; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #dee2e6;">
            <strong>📖 Análisis de contenido</strong>
          </div>
          <div style="background: white; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #dee2e6;">
            <strong>❓ Respuestas instantáneas</strong>
          </div>
          <div style="background: white; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #dee2e6;">
            <strong>🎯 Contexto específico</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Función principal para manejar todas las acciones de contenido
function handleContentAction(action, itemId) {
  const item = historialData.find(i => i.id == itemId);
  if (!item) {
    console.error('Item no encontrado:', itemId);
    return;
  }

  console.log(`🎬 Ejecutando acción: ${action} para item:`, item.type);

  switch(action) {
    case 'openInteractive':
      openInteractiveMapaMental(item);
      break;
    case 'exportImage':
      exportMapaMentalAsImage(item);
      break;
    case 'openStudy':
      openFlashcardsStudy(item);
      break;
    case 'exportCards':
      exportFlashcards(item);
      break;
    case 'openChat':
      openChatQA(item);
      break;
    case 'newQuestion':
      startNewQuestion(item);
      break;
    case 'exportPDF':
      exportResumenAsPDF(item);
      break;
    case 'startQuiz':
      startQuizPractice(item);
      break;
    case 'exportQuiz':
      exportQuizContent(item);
      break;
    default:
      console.warn('Acción no reconocida:', action);
  }
}

// Función para abrir mapa mental interactivo
function openInteractiveMapaMental(item) {
  try {
    // Guardar datos del mapa mental en sessionStorage para que lo use la página de mapa mental
    const mapData = {
      id: item.id,
      content: item.content,
      pdf_title: item.pdf_title || item.pdf_name,
      created_at: item.created_at
    };
    
    sessionStorage.setItem('currentMapaMental', JSON.stringify(mapData));
    
    // Abrir página de mapa mental
    window.open('/mapa-mental.html', '_blank');
    
    console.log('✅ Abriendo mapa mental interactivo');
  } catch (error) {
    console.error('❌ Error al abrir mapa mental:', error);
    alert('Error al abrir el mapa mental interactivo');
  }
}

// Función para exportar mapa mental como imagen
function exportMapaMentalAsImage(item) {
  // Por ahora, mostrar mensaje informativo
  alert('🖼️ Funcionalidad de exportar imagen en desarrollo. Usa "Ver Interactivo" para ver el mapa completo.');
}

// Función para abrir flashcards en modo estudio
function openFlashcardsStudy(item) {
  try {
    // Guardar datos de flashcards en sessionStorage
    const flashcardsData = {
      id: item.id,
      content: item.content,
      pdf_title: item.pdf_title || item.pdf_name,
      created_at: item.created_at
    };
    
    sessionStorage.setItem('currentFlashcards', JSON.stringify(flashcardsData));
    
    // Abrir página de flashcards
    window.open('/flashcards.html', '_blank');
    
    console.log('✅ Abriendo flashcards en modo estudio');
  } catch (error) {
    console.error('❌ Error al abrir flashcards:', error);
    alert('Error al abrir las flashcards en modo estudio');
  }
}

// Función para exportar flashcards
function exportFlashcards(item) {
  try {
    const cards = item.content.cards || [];
    let exportText = `FLASHCARDS - ${item.pdf_title || 'Sin título'}\n`;
    exportText += `Generado: ${new Date(item.created_at).toLocaleDateString()}\n`;
    exportText += `Total de tarjetas: ${cards.length}\n\n`;
    
    cards.forEach((card, index) => {
      exportText += `--- TARJETA ${index + 1} ---\n`;
      exportText += `PREGUNTA: ${card.pregunta || card.frente}\n`;
      exportText += `RESPUESTA: ${card.respuesta || card.reverso}\n\n`;
    });
    
    downloadAsTextFile(exportText, `flashcards-${item.id}.txt`);
    console.log('✅ Flashcards exportadas');
  } catch (error) {
    console.error('❌ Error al exportar flashcards:', error);
    alert('Error al exportar las flashcards');
  }
}

// Función para abrir chat Q&A
function openChatQA(item) {
  alert('💬 Funcionalidad de chat Q&A en desarrollo. Pronto podrás continuar conversaciones desde el historial.');
}

// Función para nueva pregunta en chat
function startNewQuestion(item) {
  alert('❓ Funcionalidad de nueva pregunta en desarrollo.');
}

// Función para exportar resumen como PDF
function exportResumenAsPDF(item) {
  try {
    const content = item.content;
    let pdfText = `RESUMEN - ${item.pdf_title || 'Sin título'}\n`;
    pdfText += `Generado: ${new Date(item.created_at).toLocaleDateString()}\n\n`;
    
    if (content.resumen_general) {
      pdfText += `RESUMEN GENERAL:\n${content.resumen_general}\n\n`;
    }
    
    if (content.conceptos_clave) {
      pdfText += `CONCEPTOS CLAVE:\n`;
      content.conceptos_clave.forEach(concepto => {
        pdfText += `• ${concepto}\n`;
      });
      pdfText += '\n';
    }
    
    if (content.aplicaciones_practicas) {
      pdfText += `APLICACIONES PRÁCTICAS:\n`;
      content.aplicaciones_practicas.forEach(app => {
        pdfText += `• ${app}\n`;
      });
      pdfText += '\n';
    }
    
    if (content.conclusiones) {
      pdfText += `CONCLUSIONES:\n${content.conclusiones}\n`;
    }
    
    downloadAsTextFile(pdfText, `resumen-${item.id}.txt`);
    console.log('✅ Resumen exportado');
  } catch (error) {
    console.error('❌ Error al exportar resumen:', error);
    alert('Error al exportar el resumen');
  }
}


// Función para iniciar práctica de quiz
function startQuizPractice(item) {
  alert('🎯 Funcionalidad de práctica de quiz en desarrollo. Puedes revisar las preguntas en el contenido mostrado.');
}

// Función para exportar quiz
function exportQuizContent(item) {
  try {
    const preguntas = item.content.preguntas || [];
    let exportText = `QUIZ - ${item.pdf_title || 'Sin título'}\n`;
    exportText += `Tipo: ${getTypeName(item.type)}\n`;
    exportText += `Generado: ${new Date(item.created_at).toLocaleDateString()}\n`;
    exportText += `Total de preguntas: ${preguntas.length}\n\n`;
    
    preguntas.forEach((pregunta, index) => {
      exportText += `--- PREGUNTA ${index + 1} ---\n`;
      exportText += `${pregunta.enunciado}\n`;
      
      if (item.type === 'multiple_choice') {
        pregunta.opciones.forEach((opcion, opIndex) => {
          const isCorrect = opIndex === pregunta.respuesta;
          exportText += `${String.fromCharCode(97 + opIndex)}) ${opcion} ${isCorrect ? '✓' : ''}\n`;
        });
      } else if (item.type === 'verdadero_falso') {
        exportText += `Respuesta: ${pregunta.respuesta}\n`;
      }
      
      exportText += `Explicación: ${pregunta.explicacion}\n\n`;
    });
    
    downloadAsTextFile(exportText, `quiz-${item.id}.txt`);
    console.log('✅ Quiz exportado');
  } catch (error) {
    console.error('❌ Error al exportar quiz:', error);
    alert('Error al exportar el quiz');
  }
}

// Función auxiliar para descargar archivos de texto
function downloadAsTextFile(content, filename) {
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

// Función para mostrar mensajes toast
function showToast(message) {
  // Crear elemento toast si no existe
  let toast = document.getElementById('historial-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'historial-toast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: system-ui;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.transform = 'translateX(0)';
  
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
  }, 3000);
}

// Funciones para manejar favoritos
function getFavorites() {
  try {
    const favorites = localStorage.getItem('historial-favorites');
    return favorites ? JSON.parse(favorites) : [];
  } catch (error) {
    console.warn('Error al obtener favoritos:', error);
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    localStorage.setItem('historial-favorites', JSON.stringify(favorites));
  } catch (error) {
    console.warn('Error al guardar favoritos:', error);
  }
}

function isFavorite(itemId) {
  const favorites = getFavorites();
  return favorites.includes(itemId.toString());
}

function toggleFavorite(itemId) {
  const favorites = getFavorites();
  const itemIdStr = itemId.toString();
  
  if (favorites.includes(itemIdStr)) {
    // Remover de favoritos
    const index = favorites.indexOf(itemIdStr);
    favorites.splice(index, 1);
    showToast('💔 Removido de favoritos');
  } else {
    // Agregar a favoritos
    favorites.push(itemIdStr);
    showToast('❤️ Agregado a favoritos');
  }
  
  saveFavorites(favorites);
  
  // Actualizar el botón en la interfaz
  const btnFavorite = document.querySelector(`[onclick="toggleFavorite('${itemId}')"]`);
  if (btnFavorite) {
    if (favorites.includes(itemIdStr)) {
      btnFavorite.classList.add('active');
    } else {
      btnFavorite.classList.remove('active');
    }
  }
  
  console.log(`${favorites.includes(itemIdStr) ? '❤️' : '💔'} Favorito actualizado:`, itemId);
  
  // Actualizar visibilidad del botón de exportar favoritos
  updateExportToolsVisibility();
}

function setupExportTools() {
  const exportBtn = document.getElementById('exportFavorites');
  const deleteAllBtn = document.getElementById('deleteAll');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', exportFavorites);
  }
  
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', deleteAllItems);
  }
  
  updateExportToolsVisibility();
}

function updateExportToolsVisibility() {
  const exportBtn = document.getElementById('exportFavorites');
  const deleteAllBtn = document.getElementById('deleteAll');
  const favorites = getFavorites();
  
  // Mostrar botón de exportar favoritos solo si hay favoritos
  if (exportBtn) {
    exportBtn.style.display = favorites.length > 0 ? 'flex' : 'none';
  }
  
  // Mostrar botón de eliminar todos solo si hay elementos en el historial
  if (deleteAllBtn) {
    deleteAllBtn.style.display = historialData.length > 0 ? 'flex' : 'none';
  }
}

function exportFavorites() {
  const favorites = getFavorites();
  const favoriteItems = historialData.filter(item => 
    favorites.includes(item.id.toString())
  );
  
  if (favoriteItems.length === 0) {
    alert('📝 No tienes favoritos para exportar');
    return;
  }
  
  let exportText = `FAVORITOS - StudyAI\n`;
  exportText += `Exportado: ${new Date().toLocaleString()}\n`;
  exportText += `Total de favoritos: ${favoriteItems.length}\n\n`;
  exportText += `${'='.repeat(50)}\n\n`;
  
  favoriteItems.forEach((item, index) => {
    exportText += `${index + 1}. ${getTypeName(item.type).toUpperCase()}\n`;
    exportText += `PDF: ${item.pdf_title || item.pdf_name}\n`;
    exportText += `Fecha: ${new Date(item.created_at).toLocaleDateString()}\n`;
    exportText += `${'-'.repeat(30)}\n`;
    
    if (item.content) {
      switch(item.type) {
        case 'resumen':
          if (item.content.resumen_general) {
            exportText += `RESUMEN: ${item.content.resumen_general}\n`;
          }
          break;
        case 'multiple_choice':
        case 'verdadero_falso':
          exportText += `PREGUNTAS: ${item.content.preguntas?.length || 0}\n`;
          break;
        case 'flashcards':
          exportText += `TARJETAS: ${item.content.cards?.length || 0}\n`;
          break;
        case 'mapa_mental':
          exportText += `TEMA CENTRAL: ${item.content.nodo_central || 'N/A'}\n`;
          break;
        default:
          exportText += `CONTENIDO DISPONIBLE\n`;
      }
    }
    
    exportText += `\n${'='.repeat(50)}\n\n`;
  });
  
  const filename = `favoritos-studyai-${new Date().toISOString().split('T')[0]}.txt`;
  downloadAsTextFile(exportText, filename);
  
  showToast(`📄 ${favoriteItems.length} favoritos exportados`);
  console.log('✅ Favoritos exportados:', favoriteItems.length);
}

// Función para eliminar elemento del historial
function deleteItem(itemId) {
  const item = historialData.find(i => i.id == itemId);
  if (!item) {
    console.error('Item no encontrado:', itemId);
    return;
  }

  // Mostrar modal de confirmación
  const confirmDelete = confirm(
    `¿Estás seguro de que deseas eliminar este ${getTypeName(item.type).toLowerCase()}?\n\n` +
    `PDF: ${item.pdf_title || item.pdf_name}\n` +
    `Fecha: ${new Date(item.created_at).toLocaleDateString()}\n\n` +
    `Esta acción no se puede deshacer.`
  );

  if (confirmDelete) {
    performDelete(itemId);
  }
}

// Función para realizar la eliminación
async function performDelete(itemId) {
  try {
    showToast('🗑️ Eliminando elemento...');
    
    // Verificar si apiCall está disponible
    if (typeof apiCall !== 'function') {
      console.warn('⚠️ apiCall no disponible, eliminando solo de la vista local');
      removeFromLocalView(itemId);
      return;
    }

    // Realizar llamada a la API para eliminar
    const response = await apiCall(`/api/study/outputs/${itemId}`, {
      method: 'DELETE'
    });

    if (response && response.ok) {
      console.log('✅ Elemento eliminado del servidor');
      removeFromLocalView(itemId);
      showToast('✅ Elemento eliminado correctamente');
    } else {
      throw new Error(`Error del servidor: ${response?.status || 'Sin respuesta'}`);
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar:', error);
    
    // Preguntar si quiere eliminar solo de la vista local
    const forceDelete = confirm(
      'No se pudo eliminar del servidor.\n¿Deseas eliminarlo solo de esta vista?'
    );
    
    if (forceDelete) {
      removeFromLocalView(itemId);
      showToast('⚠️ Eliminado solo de la vista local');
    } else {
      showToast('❌ Error al eliminar elemento');
    }
  }
}

// Función para remover de la vista local
function removeFromLocalView(itemId) {
  // Remover del array de datos
  historialData = historialData.filter(item => item.id != itemId);
  
  // Remover de favoritos si está
  const favorites = getFavorites();
  const updatedFavorites = favorites.filter(favId => favId !== itemId.toString());
  saveFavorites(updatedFavorites);
  
  // Aplicar filtros y re-renderizar
  applyFiltersAndSearch();
  
  // Actualizar visibilidad de herramientas
  updateExportToolsVisibility();
  
  console.log('🗑️ Elemento removido de la vista local:', itemId);
}

// Función para eliminar todos los elementos del historial
function deleteAllItems() {
  if (historialData.length === 0) {
    showToast('📝 No hay elementos para eliminar');
    return;
  }

  // Mostrar modal de confirmación con detalles
  const confirmDeleteAll = confirm(
    `⚠️ CONFIRMACIÓN DE ELIMINACIÓN MASIVA\n\n` +
    `Estás a punto de eliminar TODOS los elementos del historial:\n\n` +
    `• Total de elementos: ${historialData.length}\n` +
    `• Favoritos guardados: ${getFavorites().length}\n` +
    `• Tipos de contenido: ${[...new Set(historialData.map(item => getTypeName(item.type)))].join(', ')}\n\n` +
    `⚠️ Esta acción NO SE PUEDE DESHACER ⚠️\n\n` +
    `¿Estás completamente seguro de que deseas continuar?`
  );

  if (confirmDeleteAll) {
    // Confirmación adicional para seguridad
    const finalConfirm = confirm(
      `🚨 ÚLTIMA CONFIRMACIÓN 🚨\n\n` +
      `Se eliminarán ${historialData.length} elementos permanentemente.\n\n` +
      `¿Confirmas la eliminación total del historial?`
    );
    
    if (finalConfirm) {
      performDeleteAll();
    }
  }
}

// Función para realizar la eliminación masiva
async function performDeleteAll() {
  try {
    showToast('🗑️ Eliminando todos los elementos...');
    
    const totalItems = historialData.length;
    let deletedFromServer = 0;
    let errors = 0;

    // Verificar si apiCall está disponible
    if (typeof apiCall !== 'function') {
      console.warn('⚠️ apiCall no disponible, eliminando solo de la vista local');
      removeAllFromLocalView();
      return;
    }

    // Eliminar uno por uno del servidor
    for (const item of historialData) {
      try {
        const response = await apiCall(`/api/study/outputs/${item.id}`, {
          method: 'DELETE'
        });

        if (response && response.ok) {
          deletedFromServer++;
        } else {
          errors++;
          console.warn(`Error al eliminar item ${item.id}:`, response?.status);
        }
      } catch (error) {
        errors++;
        console.error(`Error al eliminar item ${item.id}:`, error);
      }
    }

    // Mostrar resultados
    if (deletedFromServer === totalItems) {
      console.log('✅ Todos los elementos eliminados del servidor');
      removeAllFromLocalView();
      showToast(`✅ ${totalItems} elementos eliminados correctamente`);
    } else if (deletedFromServer > 0) {
      console.log(`⚠️ ${deletedFromServer}/${totalItems} elementos eliminados del servidor`);
      removeAllFromLocalView();
      showToast(`⚠️ ${deletedFromServer}/${totalItems} elementos eliminados. ${errors} errores.`);
    } else {
      // Si ninguno se pudo eliminar del servidor, preguntar si eliminar localmente
      const forceDeleteAll = confirm(
        `No se pudieron eliminar elementos del servidor.\n` +
        `Errores: ${errors}/${totalItems}\n\n` +
        `¿Deseas eliminarlos solo de esta vista?`
      );
      
      if (forceDeleteAll) {
        removeAllFromLocalView();
        showToast('⚠️ Todos los elementos eliminados solo de la vista local');
      } else {
        showToast('❌ Eliminación cancelada');
      }
    }
    
  } catch (error) {
    console.error('❌ Error general en eliminación masiva:', error);
    showToast('❌ Error en la eliminación masiva');
  }
}

// Función para remover todos los elementos de la vista local
function removeAllFromLocalView() {
  // Limpiar todos los datos
  historialData = [];
  filteredData = [];
  
  // Limpiar favoritos
  saveFavorites([]);
  
  // Limpiar filtros y búsqueda
  currentFilter = 'all';
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Resetear filtros activos
  const allButton = document.querySelector('.filter-btn[data-filter="all"]');
  if (allButton) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    allButton.classList.add('active');
  }
  
  // Mostrar estado vacío
  showEmptyState();
  
  // Actualizar estadísticas
  updateStats();
  
  // Actualizar visibilidad de herramientas
  updateExportToolsVisibility();
  
  console.log('🗑️ Todos los elementos removidos de la vista local');
}

console.log('📜 Historial simplificado con filtros cargado');