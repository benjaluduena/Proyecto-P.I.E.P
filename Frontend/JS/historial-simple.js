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
  
  if (filter === 'all') {
    filteredData = [...historialData];
  } else {
    filteredData = historialData.filter(item => item.type === filter);
  }
  
  console.log(`Filtro "${filter}" aplicado. Items: ${filteredData.length}`);
  
  // Re-renderizar contenido
  renderHistorialData(filteredData);
  updateStats();
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
        max-height: 200px;
        overflow: hidden;
        position: relative;
      }
      .card-content.expanded {
        max-height: none;
      }
      .card-content.has-overflow::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: linear-gradient(transparent, white);
      }
      .card-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid #f0f0f0;
      }
      .btn-expand, .btn-collapse {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.2s ease;
      }
      .btn-expand:hover, .btn-collapse:hover {
        background: #0056b3;
      }
      .btn-collapse {
        background: #6c757d;
      }
      .btn-collapse:hover {
        background: #545b62;
      }
      .preview-content {
        font-size: 0.9rem;
        color: #6c757d;
        line-height: 1.4;
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
        <div class="card-date">
          ${new Date(item.created_at).toLocaleDateString()}
        </div>
      </div>
      <div class="card-pdf-info">
        📄 ${item.pdf_title || item.pdf_name}
      </div>
      <div class="card-content" id="content-${item.id}">
        ${formatContentPreview(item.content, item.type)}
      </div>
      <div class="card-actions">
        <button onclick="toggleContent('${item.id}')" class="btn-expand" id="btn-${item.id}">
          Ver completo
        </button>
      </div>
    </div>
  `).join('');
  
  contentGrid.innerHTML = html;
  
  // Marcar contenidos que tienen overflow
  setTimeout(() => {
    data.forEach(item => {
      const contentEl = document.getElementById(`content-${item.id}`);
      if (contentEl && contentEl.scrollHeight > 200) {
        contentEl.classList.add('has-overflow');
      }
    });
  }, 100);
}

function formatContentPreview(content, type) {
  // Generar vista previa para cada tipo
  switch(type) {
    case 'resumen':
      return `<div class="preview-content">${content.resumen_general?.substring(0, 200) || 'Sin contenido'}...</div>`;
    case 'multiple_choice':
      const totalPreguntas = content.preguntas?.length || 0;
      return `<div class="preview-content">📝 ${totalPreguntas} preguntas de opción múltiple</div>`;
    case 'verdadero_falso':
      const totalVF = content.preguntas?.length || 0;
      return `<div class="preview-content">✅ ${totalVF} preguntas de verdadero/falso</div>`;
    case 'mapa_mental':
      return `<div class="preview-content">🧠 Mapa mental: ${content.nodo_central || 'Sin título'}</div>`;
    case 'flashcards':
      const totalCards = content.cards?.length || 0;
      return `<div class="preview-content">🗂️ ${totalCards} flashcards</div>`;
    case 'chat-qa':
      return `<div class="preview-content">💬 Sistema de preguntas y respuestas interactivo</div>`;
    default:
      return `<div class="preview-content">Contenido disponible</div>`;
  }
}

function toggleContent(itemId) {
  const contentEl = document.getElementById(`content-${itemId}`);
  const btnEl = document.getElementById(`btn-${itemId}`);
  
  if (!contentEl || !btnEl) return;
  
  const isExpanded = contentEl.classList.contains('expanded');
  
  if (isExpanded) {
    // Colapsar - mostrar preview
    const item = historialData.find(i => i.id == itemId);
    if (item) {
      contentEl.innerHTML = formatContentPreview(item.content, item.type);
      contentEl.classList.remove('expanded');
      btnEl.textContent = 'Ver completo';
      btnEl.className = 'btn-expand';
    }
  } else {
    // Expandir - mostrar contenido completo
    const item = historialData.find(i => i.id == itemId);
    if (item) {
      contentEl.innerHTML = formatContentByType(item.content, item.type);
      contentEl.classList.add('expanded');
      btnEl.textContent = 'Ver menos';
      btnEl.className = 'btn-collapse';
    }
  }
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

console.log('📜 Historial simplificado con filtros cargado');