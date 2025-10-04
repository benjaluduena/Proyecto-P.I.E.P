// Variables globales - se reasignarán cuando se recargue la página
let uploadBox, uploadText, fileInput, loadingOverlay, cardActionBtns, cards, uploadedFilesContainer;
let carouselInstance = null; // Variable para almacenar la instancia del carousel

// Función para obtener referencias a los elementos DOM
function getHomeElements() {
  console.log('Obteniendo referencias DOM...');
  uploadBox = document.querySelector('.upload-box');
  uploadText = document.getElementById('uploadText');
  fileInput = document.getElementById('fileInput');
  loadingOverlay = document.getElementById("loadingOverlay");
  cardActionBtns = document.querySelectorAll('.card-action-btn');
  cards = document.querySelectorAll('.card');
  uploadedFilesContainer = document.getElementById('uploadedFilesContainer');
  
  console.log('Referencias DOM obtenidas:', {
    uploadBox: !!uploadBox,
    uploadText: !!uploadText,
    fileInput: !!fileInput,
    loadingOverlay: !!loadingOverlay,
    cardActionBtns: cardActionBtns.length,
    cards: cards.length,
    uploadedFilesContainer: !!uploadedFilesContainer
  });
}

// Función helper para ocultar el overlay de carga
function hideLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.classList.remove("show");
    loadingOverlay.style.display = "none";
  }
}

// Función helper para mostrar el overlay de carga
function showLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
    loadingOverlay.classList.add("show");
  }
}

// Función para configurar todos los event listeners
function setupEventListeners() {
  console.log('Configurando event listeners...');
  
  // Obtener referencias frescas antes de configurar listeners
  getHomeElements();
  
  if (!uploadBox || !fileInput) {
    console.error('Error: Elementos críticos no encontrados para event listeners');
    return;
  }

  console.log('Configurando drag & drop...');
  // Event listeners para drag & drop
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);

  console.log('Configurando file input...');
  // Event listener para selección de archivo
  fileInput.addEventListener('change', handleFileChange);

  console.log('Configurando cards y botones de acción...');
  // Event listeners para cards completas y botones de acción
  if (cards && cards.length > 0) {
    cards.forEach(card => {
      // Remover event listeners previos para evitar duplicados
      card.removeEventListener('click', handleCardClick);
      card.addEventListener('click', handleCardClick);
    });
  }
  
  if (cardActionBtns && cardActionBtns.length > 0) {
    cardActionBtns.forEach(btn => {
      // Remover event listeners previos para evitar duplicados
      btn.removeEventListener('click', handleCardAction);
      btn.addEventListener('click', handleCardAction);
    });
  }
  
  console.log('Event listeners configurados correctamente');
}

// Función para limpiar event listeners existentes
function cleanupEventListeners() {
  if (uploadBox) {
    // Clonar elemento para remover todos los event listeners
    const newUploadBox = uploadBox.cloneNode(true);
    uploadBox.parentNode.replaceChild(newUploadBox, uploadBox);
    uploadBox = newUploadBox;
    
    // Actualizar la referencia al uploadText después del clonado
    uploadText = document.getElementById('uploadText');
  }
  
  if (fileInput) {
    // Para file input, simplemente remover el event listener específico
    fileInput.removeEventListener('change', handleFileChange);
  }
}

// Función simplificada para configurar event listeners (usar cuando ya tienes referencias)
function setupEventListenersSimple() {
  console.log('Configurando event listeners simples...');
  
  if (!uploadBox || !fileInput) {
    console.error('Error: Elementos críticos no encontrados para event listeners');
    return;
  }

  // Limpiar listeners existentes primero
  cleanupEventListeners();
  
  // Volver a obtener referencias después de la limpieza
  uploadBox = document.querySelector('.upload-box');
  fileInput = document.getElementById('fileInput');
  uploadText = document.getElementById('uploadText');

  // Event listeners para drag & drop
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);

  // Event listener para selección de archivo
  fileInput.addEventListener('change', handleFileChange);

  // Event listeners para cards y botones de acción
  if (cards && cards.length > 0) {
    cards.forEach(card => {
      // Remover event listeners previos para evitar duplicados
      card.removeEventListener('click', handleCardClick);
      card.addEventListener('click', handleCardClick);
    });
  }
  
  if (cardActionBtns && cardActionBtns.length > 0) {
    cardActionBtns.forEach(btn => {
      // Remover event listeners previos para evitar duplicados
      btn.removeEventListener('click', handleCardAction);
      btn.addEventListener('click', handleCardAction);
    });
  }
  
  console.log('Event listeners simples configurados correctamente');
}

// Función de inicialización de la página home
function initializeHome() {
  console.log('Inicializando página home...');
  
  // Obtener referencias a elementos DOM (solo una vez aquí)
  getHomeElements();
  
  // Verificar que los elementos críticos existen
  if (!uploadBox || !fileInput) {
    console.error('Error: Elementos críticos del home no encontrados');
    return;
  }
  
  // Asegurar que el overlay esté oculto
  hideLoadingOverlay();
  
  // Deshabilitar tarjetas hasta que se cargue un archivo
  if (cards && cards.length > 0) {
    cards.forEach(card => card.classList.add('disabled'));
    console.log(`Deshabilitadas ${cards.length} cards`);
  }
  
  // Limpiar estado de archivo
  if (fileInput) {
    fileInput.value = '';
  }
  if (uploadedFilesContainer) {
    uploadedFilesContainer.innerHTML = '';
  }
  if (uploadText) {
    uploadText.textContent = "Ningún archivo seleccionado";
  }
  
  // Configurar event listeners (sin volver a obtener referencias)
  setupEventListenersSimple();
  
  // Inicializar carousel solo si no existe una instancia activa
  initializeCarousel();
  
  console.log('Home inicializado correctamente');
}

// Función para inicializar el carousel una sola vez
function initializeCarousel() {
  console.log('🎠 Inicializando carousel...');
  
  // Verificar elementos necesarios
  const track = document.getElementById('carouselTrack');
  const slides = document.querySelectorAll('.carousel-slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  console.log('Elementos del carousel:', {
    track: !!track,
    slides: slides.length,
    prevBtn: !!prevBtn,
    nextBtn: !!nextBtn
  });
  
  if (!track || slides.length === 0) {
    console.error('❌ Elementos del carousel no encontrados');
    return;
  }
  
  // Limpiar instancia anterior si existe
  if (carouselInstance) {
    console.log('🧹 Limpiando instancia anterior del carousel...');
    try {
      carouselInstance.destroy();
    } catch (error) {
      console.warn('Error al destruir carousel anterior:', error);
    }
    carouselInstance = null;
    window.carouselInstance = null;
  }
  
  // Crear nueva instancia
  try {
    console.log('✨ Creando nueva instancia del carousel...');
    carouselInstance = new Carousel();
    window.carouselInstance = carouselInstance;
    console.log('✅ Carousel inicializado correctamente');
  } catch (error) {
    console.error('❌ Error al crear instancia del carousel:', error);
  }
}

// Funciones handler para eventos
function handleDragOver(e) {
  e.preventDefault();
  if (uploadBox) uploadBox.classList.add('hover');
}

function handleDragLeave(e) {
  e.preventDefault();
  if (uploadBox) uploadBox.classList.remove('hover');
}

function handleDrop(e) {
  e.preventDefault();
  if (uploadBox) uploadBox.classList.remove('hover');

  const files = e.dataTransfer.files;

  if (files.length > 1) {
    alert('Solo se permite subir un archivo PDF.');
    resetFileInput();
    return;
  }

  if (files[0].type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    resetFileInput();
    return;
  }

  if (fileInput) {
    fileInput.files = files;
    mostrarArchivos(files);
  }
}

function handleFileChange() {
  if (!fileInput) return;
  
  const files = fileInput.files;

  if (files.length > 1) {
    alert('Solo se permite subir un archivo PDF.');
    resetFileInput();
    return;
  }

  if (files.length && files[0].type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    resetFileInput();
    return;
  }

  if (files.length) {
    mostrarArchivos(files);
  } else {
    if (uploadText) {
      uploadText.textContent = "Ningún archivo válido";
      uploadText.classList.remove('file-loaded');
    }
    if (cards) cards.forEach(card => card.classList.add('disabled'));
    
    // Restaurar el icono original
    const fileIcon = document.querySelector('.file-icon');
    if (fileIcon) {
      fileIcon.innerHTML = `
        <svg width="30px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12.5858L16.2426 16.8284L14.8284 18.2426L13 16.415V22H11V16.413L9.17157 18.2426L7.75736 16.8284L12 12.5858ZM12 2C15.5934 2 18.5544 4.70761 18.9541 8.19395C21.2858 8.83154 23 10.9656 23 13.5C23 16.3688 20.8036 18.7246 18.0006 18.9776L18.0009 16.9644C19.6966 16.7214 21 15.2629 21 13.5C21 11.567 19.433 10 17.5 10C17.2912 10 17.0867 10.0183 16.8887 10.054C16.9616 9.7142 17 9.36158 17 9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9C7 9.36158 7.03838 9.7142 7.11205 10.0533C6.91331 10.0183 6.70879 10 6.5 10C4.567 10 3 11.567 3 13.5C3 15.2003 4.21241 16.6174 5.81986 16.934L6.00005 16.9646L6.00039 18.9776C3.19696 18.7252 1 16.3692 1 13.5C1 10.9656 2.71424 8.83154 5.04648 8.19411C5.44561 4.70761 8.40661 2 12 2Z">
        </path>
      </svg>
    `;
      fileIcon.classList.remove('file-loaded');
    }
  }
}

// Variable para controlar la inicialización
let homeInitialized = false;

// Función para ejecutar la inicialización una sola vez
function runInitialization() {
  if (!homeInitialized) {
    console.log('Ejecutando inicialización de home...');
    // Verificar que los elementos DOM existan antes de inicializar
    if (document.querySelector('.upload-box')) {
      initializeHome();
      homeInitialized = true;
      console.log('Home inicializado con éxito');
    } else {
      console.error('Error: Elementos DOM de home no encontrados');
      // Intentar nuevamente después de un breve retraso
      setTimeout(runInitialization, 200);
    }
  } else {
    console.log('Home ya está inicializado, omitiendo inicialización');
  }
}

// Función robusta de re-inicialización
function forceReinitializeHome() {
  console.log('🔄 Forzando re-inicialización del home...');
  
  // Resetear estado
  homeInitialized = false;
  
  // Limpiar instancia del carousel si existe
  if (carouselInstance) {
    try {
      carouselInstance.destroy();
      carouselInstance = null;
      window.carouselInstance = null;
    } catch (error) {
      console.warn('Error al destruir carousel:', error);
    }
  }
  
  // Esperar un poco para que el DOM se estabilice
  setTimeout(() => {
    console.log('🔍 Verificando elementos DOM...');
    const uploadBox = document.querySelector('.upload-box');
    const cards = document.querySelectorAll('.card');
    
    if (uploadBox && cards.length > 0) {
      console.log(`✅ DOM listo - uploadBox: ${!!uploadBox}, cards: ${cards.length}`);
      runInitialization();
    } else {
      console.warn('⚠️ DOM no listo, reintentando...');
      setTimeout(() => {
        runInitialization();
      }, 300);
    }
  }, 150);
}

// Hacer la función de inicialización disponible globalmente para cuando se carguen las páginas dinámicamente
window.initializeHomeIfNeeded = forceReinitializeHome;

// Ejecutar inicialización
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInitialization);
} else {
  // Si el DOM ya está listo, ejecutar inmediatamente
  runInitialization();
}

// Resetear input de archivo

function resetFileInput() {
  if (fileInput) fileInput.value = '';
  if (uploadText) {
    uploadText.textContent = "Ningún archivo seleccionado";
    uploadText.classList.remove('file-loaded');
  }
  if (cards) cards.forEach(card => card.classList.add('disabled'));
  
  // Restaurar el icono original
  const fileIcon = document.querySelector('.file-icon');
  if (fileIcon) {
    fileIcon.innerHTML = `
      <svg width="30px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12.5858L16.2426 16.8284L14.8284 18.2426L13 16.415V22H11V16.413L9.17157 18.2426L7.75736 16.8284L12 12.5858ZM12 2C15.5934 2 18.5544 4.70761 18.9541 8.19395C21.2858 8.83154 23 10.9656 23 13.5C23 16.3688 20.8036 18.7246 18.0006 18.9776L18.0009 16.9644C19.6966 16.7214 21 15.2629 21 13.5C21 11.567 19.433 10 17.5 10C17.2912 10 17.0867 10.0183 16.8887 10.054C16.9616 9.7142 17 9.36158 17 9C17 6.23858 14.7614 4 12 4C9.23858 4 7 6.23858 7 9C7 9.36158 7.03838 9.7142 7.11205 10.0533C6.91331 10.0183 6.70879 10 6.5 10C4.567 10 3 11.567 3 13.5C3 15.2003 4.21241 16.6174 5.81986 16.934L6.00005 16.9646L6.00039 18.9776C3.19696 18.7252 1 16.3692 1 13.5C1 10.9656 2.71424 8.83154 5.04648 8.19411C5.44561 4.70761 8.40661 2 12 2Z">
      </path>
    </svg>
  `;
    fileIcon.classList.remove('file-loaded');
  }
}


// Mostrar archivos
function mostrarArchivos(files) {
  if (uploadedFilesContainer) uploadedFilesContainer.innerHTML = '';
  
  // Mostrar el nombre del archivo en el texto principal
  // Volver a obtener la referencia para asegurarnos de que existe
  const uploadTextElement = document.getElementById('uploadText');
  
  if (uploadTextElement && files.length > 0) {
    const fileName = files[0].name;
    // Truncar el nombre si es muy largo
    const displayName = fileName.length > 30 ? fileName.substring(0, 30) + '...' : fileName;
    uploadTextElement.textContent = displayName;
    uploadTextElement.classList.add('file-loaded');
    
    // Actualizar también la variable global
    uploadText = uploadTextElement;
  }
  
  if (cards) cards.forEach(card => card.classList.remove('disabled'));

  // Cambiar el icono cuando se carga un archivo
  const fileIcon = document.querySelector('.file-icon');
  if (fileIcon && files.length > 0) {
    fileIcon.innerHTML = `
    <svg width="30px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15 4H5V20H19V8H15V4ZM3 2.9918C3 2.44405 3.44749 2 3.9985 2H16L20.9997 7L21 20.9925C21 21.5489 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5447 3 21.0082V2.9918ZM13 12V16H11V12H8L12 8L16 12H13Z"></path>
    </svg>
    `;
    fileIcon.classList.add('file-loaded');
  }

}


// Función helper para subir PDF
async function uploadPdf() {
  const formData = new FormData();
  formData.append('pdf', fileInput.files[0]);
  
  const response = await apiCall('/api/pdfs/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': getAuthHeaders().Authorization
    }
  });

  if (!response || !response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al subir el PDF');
  }

  const { pdf } = await response.json();
  return pdf;
}

// Función helper para generar contenido IA
async function generateAIContent(pdfId, contentType) {
  console.log(`Generando contenido: PDF ID ${pdfId}, Tipo: ${contentType}`);
  
  const response = await apiCall(`/api/ai/generate/${pdfId}`, {
    method: 'POST',
    body: JSON.stringify({ type: contentType })
  });

  if (!response) {
    throw new Error(`Error al generar contenido de tipo ${contentType}`);
  }

  console.log(`Respuesta recibida: Status ${response.status}`);

  // Obtener el JSON una sola vez
  let responseData = {};
  try {
    responseData = await response.json();
    console.log('Datos de respuesta:', responseData);
  } catch (error) {
    console.error('Error parsing response:', error);
    throw new Error(`Error al procesar respuesta para ${contentType}`);
  }

  // Manejar caso especial de contenido ya existente (status 400)
  if (response.status === 400) {
    if (responseData && responseData.outputId) {
      console.log(`Contenido existente encontrado para ${contentType}, usando outputId: ${responseData.outputId}`);
      // Retornar el output existente
      return { id: responseData.outputId };
    } else {
      console.log('Error 400 sin outputId:', responseData);
      // Error 400 sin outputId - mostrar el error real
      throw new Error(responseData.error || `Ya existe contenido de tipo ${contentType}`);
    }
  }

  if (!response.ok) {
    console.error('Respuesta no exitosa:', response.status, responseData);
    throw new Error(responseData.error || `Error al generar contenido de tipo ${contentType}`);
  }

  // Respuesta exitosa
  console.log('Contenido generado exitosamente');
  const { output } = responseData;
  
  // Registrar progreso del usuario para que aparezca en el historial
  try {
    await apiCall('/api/study/progress', {
      method: 'POST',
      body: JSON.stringify({
        output_id: output.id,
        interaction_type: 'leido' // Registrar como "leído" cuando se genera
      })
    });
    console.log('Progreso registrado exitosamente');
  } catch (progressError) {
    console.warn('Error al registrar progreso:', progressError);
    // No fallar si no se puede registrar el progreso
  }
  
  return output;
}

// Función handler para los clics en las cards completas
function handleCardClick(e) {
  // Verificar si la card está deshabilitada
  const card = e.currentTarget;
  if (card.classList.contains('disabled')) {
    showInfoMessage("Primero debes subir un archivo PDF para usar esta función.");
    return;
  }
  
  // Si se hace clic en el botón de acción, no hacer nada (el botón maneja su propio clic)
  if (e.target.closest('.card-action-btn')) {
    return;
  }
  
  // Prevenir el clic si es en el overlay (para evitar doble activación)
  if (e.target.closest('.card-overlay')) {
    return;
  }
  
  // Activar el botón de acción de la card
  const actionBtn = card.querySelector('.card-action-btn');
  if (actionBtn) {
    actionBtn.click();
  }
}

// Función handler para los clics en botones de acción de tarjetas
async function handleCardAction(e) {
  // Solo continuar si hay archivo cargado
  if (!fileInput || fileInput.files.length === 0) {
    showInfoMessage("Primero debes subir un archivo PDF.");
    return;
  }

  showLoadingOverlay();

  const btn = e.target.closest('.card-action-btn');
  const card = btn.closest(".card");
  const type = card?.dataset.type;
  
  let pdfId, fileName;

  try {
    // Subir PDF una sola vez
    const pdf = await uploadPdf();
    pdfId = pdf.id;
    fileName = fileInput.files[0].name;

    if (type === "resumen") {
      // Generar resumen con IA
      const output = await generateAIContent(pdfId, 'resumen');
      
      // Notificar al historial que se generó nuevo contenido (con delay para asegurar que se procese)
      if (window.refreshHistorial) {
        try {
          await window.refreshHistorial();
          // Pequeño delay para asegurar que la actualización se complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn('Error al actualizar historial:', error);
        }
      } else {
        // Si la función no existe, marcar que hay contenido nuevo para cuando se cargue el historial
        sessionStorage.setItem('newContentGenerated', 'true');
      }
      
      // Redirigir a la página de resumen con los datos
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        outputId: String(output.id),
        fileName: fileName
      });
      
      window.location.href = `/resumen.html?${params.toString()}`;
      return;
    }

    if (type === "verdadero-falso") {
      // Generar verdadero/falso con IA
      const output = await generateAIContent(pdfId, 'verdadero_falso');
      
      // Notificar al historial que se generó nuevo contenido (con delay para asegurar que se procese)
      if (window.refreshHistorial) {
        try {
          await window.refreshHistorial();
          // Pequeño delay para asegurar que la actualización se complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn('Error al actualizar historial:', error);
        }
      } else {
        // Si la función no existe, marcar que hay contenido nuevo para cuando se cargue el historial
        sessionStorage.setItem('newContentGenerated', 'true');
      }
      
      // Redirigir a la vista de verdadero/falso
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        outputId: String(output.id),
        fileName: fileName
      });
      window.location.href = `/verdadero-falso.html?${params.toString()}`;
      return;
    }

    if (type === "multiple-choice") {
      // Generar multiple choice con IA
      const output = await generateAIContent(pdfId, 'multiple_choice');
      
      // Notificar al historial que se generó nuevo contenido (con delay para asegurar que se procese)
      if (window.refreshHistorial) {
        try {
          await window.refreshHistorial();
          // Pequeño delay para asegurar que la actualización se complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn('Error al actualizar historial:', error);
        }
      } else {
        // Si la función no existe, marcar que hay contenido nuevo para cuando se cargue el historial
        sessionStorage.setItem('newContentGenerated', 'true');
      }
      
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        outputId: String(output.id),
        fileName: fileName
      });
      window.location.href = `/multiple-choice.html?${params.toString()}`;
      return;
    }

    if (type === "mapa-mental") {
      // Generar mapa mental con IA
      const output = await generateAIContent(pdfId, 'mapa_mental');
      
      // Notificar al historial que se generó nuevo contenido (con delay para asegurar que se procese)
      if (window.refreshHistorial) {
        try {
          await window.refreshHistorial();
          // Pequeño delay para asegurar que la actualización se complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn('Error al actualizar historial:', error);
        }
      } else {
        // Si la función no existe, marcar que hay contenido nuevo para cuando se cargue el historial
        sessionStorage.setItem('newContentGenerated', 'true');
      }
      
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        outputId: String(output.id),
        fileName: fileName
      });
      window.location.href = `/mapa-mental.html?${params.toString()}`;
      return;
    }

    if (type === "flashcards") {
      // Generar flashcards con IA
      const output = await generateAIContent(pdfId, 'flashcards');
      
      // Notificar al historial que se generó nuevo contenido (con delay para asegurar que se procese)
      if (window.refreshHistorial) {
        try {
          await window.refreshHistorial();
          // Pequeño delay para asegurar que la actualización se complete
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.warn('Error al actualizar historial:', error);
        }
      } else {
        // Si la función no existe, marcar que hay contenido nuevo para cuando se cargue el historial
        sessionStorage.setItem('newContentGenerated', 'true');
      }
      
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        id: String(output.id),
        fileName: fileName
      });
      window.location.href = `/flashcards.html?${params.toString()}`;
      return;
    }

    if (type === "chat-qa") {
      // Redirigir directamente a la página de chat (no necesita generar contenido IA)
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        fileName: fileName
      });
      window.location.href = `/chat-qa.html?${params.toString()}`;
      return;
    }

    // Para tipos no reconocidos
    hideLoadingOverlay();
    showInfoMessage(`Tipo de contenido "${type}" no reconocido`);
    console.warn('Tipo de contenido no reconocido:', type);

  } catch (error) {
    console.error('Error en handleCardAction:', error);
    console.error('Tipo de contenido:', type);
    console.error('PDF ID:', pdfId || 'No definido');
    hideLoadingOverlay();
    
    // Mostrar mensaje de error más informativo
    const errorMessage = error.message || 'Error desconocido';
    showNotification(`Error al procesar ${type || 'contenido'}: ${errorMessage}`, "error");
  }
}

// Mostrar mensajes de éxito o información

function showSuccessMessage(type) {
  const messages = {
    "verdadero-falso": "¡Preguntas de Verdadero/Falso generadas exitosamente!",
    resumen: "¡Resumen creado exitosamente!",
    "multiple-choice": "¡Examen de opción múltiple generado exitosamente!",
    "flashcards": "¡Tarjetas de estudio generadas exitosamente!",
  };

  showNotification(messages[type] || "¡Proceso exitoso!", "success");
}

function showInfoMessage(message) {
  showNotification(message, "info");
}

function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  const bgColor =
    type === "success"
      ? "linear-gradient(135deg, #00b894, #00a085)"
      : type === "error"
      ? "linear-gradient(135deg, #e74c3c, #c0392b)"
      : "linear-gradient(135deg, #0984e3, #74b9ff)";

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icon}</div>
      <div class="notification-text">${message}</div>
    </div>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// ==================== CALENDARIO ELIMINADO ====================
// Calendario funcional movido a calendario.html y calendario.js

// Funcionalidad del Carrusel
class Carousel {
  constructor() {
    console.log('📱 Inicializando constructor del Carousel...');
    
    // Obtener referencias DOM
    this.currentSlide = 0;
    this.track = document.getElementById('carouselTrack');
    this.slides = document.querySelectorAll('.carousel-slide');
    this.totalSlides = this.slides.length;
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.indicators = document.querySelectorAll('.indicator');
    
    console.log('Referencias DOM obtenidas:', {
      track: !!this.track,
      slides: this.totalSlides,
      prevBtn: !!this.prevBtn,
      nextBtn: !!this.nextBtn,
      indicators: this.indicators.length
    });
    
    if (!this.track || this.totalSlides === 0) {
      console.error('❌ Error: Elementos críticos del carousel no encontrados');
      return;
    }
    
    // Configuración responsiva
    this.slidesPerView = this.getSlidesPerView();
    this.maxSlides = Math.max(0, this.totalSlides - this.slidesPerView);
    
    console.log('Configuración:', {
      slidesPerView: this.slidesPerView,
      maxSlides: this.maxSlides
    });
    
    // Inicializar
    this.init();
    this.handleResize();
    
    console.log('✅ Constructor del Carousel completado');
  }
  
  getSlidesPerView() {
    if (window.innerWidth >= 769) return 2;
    return 1;
  }
  
  init() {
    console.log('⚙️ Inicializando carousel...');
    
    if (!this.track || this.totalSlides === 0) {
      console.error('❌ No se puede inicializar: faltan elementos');
      return;
    }
    
    console.log('🔘 Configurando event listeners para botones...');
    // Event listeners para botones
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        console.log('⬅️ Prev button clicked');
        this.prevSlide();
      });
      console.log('✅ Prev button configurado');
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        console.log('➡️ Next button clicked');
        this.nextSlide();
      });
      console.log('✅ Next button configurado');
    }
    
    console.log('🔘 Configurando event listeners para indicadores...');
    // Event listeners para indicadores
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => {
        console.log(`🎯 Indicator ${index} clicked`);
        this.goToSlide(index);
      });
    });
    console.log(`✅ ${this.indicators.length} indicadores configurados`);
    
    // Soporte para touch/swipe mejorado
    console.log('👆 Agregando soporte touch...');
    this.addTouchSupport();
    
    // Event listener para resize
    console.log('📱 Configurando resize handler...');
    window.addEventListener('resize', () => this.handleResize());
    
    // Autoplay opcional (comentado por defecto)
    // this.startAutoplay();
    
    // Actualizar estado inicial
    console.log('🔄 Actualizando estado inicial...');
    this.updateCarousel();
    
    console.log('✅ Carousel init() completado');
  }
  
  handleResize() {
    const newSlidesPerView = this.getSlidesPerView();
    if (newSlidesPerView !== this.slidesPerView) {
      this.slidesPerView = newSlidesPerView;
      this.maxSlides = Math.max(0, this.totalSlides - this.slidesPerView);
      
      // Ajustar currentSlide si es necesario
      if (this.currentSlide > this.maxSlides) {
        this.currentSlide = this.maxSlides;
      }
      
      this.updateCarousel();
    }
  }
  
  prevSlide() {
    console.log(`⬅️ prevSlide() - currentSlide: ${this.currentSlide}, maxSlides: ${this.maxSlides}`);
    
    if (this.currentSlide > 0) {
      this.currentSlide--;
    } else {
      // Navegación infinita - ir al final
      this.currentSlide = this.maxSlides;
    }
    
    console.log(`⬅️ Nuevo currentSlide: ${this.currentSlide}`);
    this.updateCarousel();
  }
  
  nextSlide() {
    console.log(`➡️ nextSlide() - currentSlide: ${this.currentSlide}, maxSlides: ${this.maxSlides}`);
    
    if (this.currentSlide < this.maxSlides) {
      this.currentSlide++;
    } else {
      // Navegación infinita - volver al inicio
      this.currentSlide = 0;
    }
    
    console.log(`➡️ Nuevo currentSlide: ${this.currentSlide}`);
    this.updateCarousel();
  }
  
  goToSlide(slideIndex) {
    // Para desktop con 2 tarjetas, cada indicador representa 2 slides
    const targetSlide = slideIndex * this.slidesPerView;
    this.currentSlide = Math.min(targetSlide, this.maxSlides);
    this.updateCarousel();
  }
  
  updateCarousel() {
    console.log(`🔄 updateCarousel() - currentSlide: ${this.currentSlide}, slidesPerView: ${this.slidesPerView}`);
    
    // Calcular el desplazamiento basado en slides por vista
    const slideWidth = 100 / this.slidesPerView;
    const translateX = -this.currentSlide * slideWidth;
    
    console.log(`📏 slideWidth: ${slideWidth}%, translateX: ${translateX}%`);
    
    if (this.track) {
      this.track.style.transform = `translateX(${translateX}%)`;
      console.log(`✅ Transform aplicado: ${this.track.style.transform}`);
    } else {
      console.error('❌ No hay track para aplicar transform');
    }
    
    // Actualizar indicadores
    this.updateIndicators();
    
    // Actualizar botones
    this.updateButtons();
  }
  
  updateIndicators() {
    this.indicators.forEach((indicator, index) => {
      const indicatorSlide = index * this.slidesPerView;
      const isActive = indicatorSlide === this.currentSlide || 
                      (indicatorSlide < this.currentSlide && 
                       indicatorSlide + this.slidesPerView > this.currentSlide);
      indicator.classList.toggle('active', isActive);
    });
  }
  
  updateButtons() {
    // Opcional: deshabilitar botones en los extremos
    if (this.prevBtn) {
      this.prevBtn.style.opacity = this.currentSlide === 0 ? '0.5' : '1';
    }
    if (this.nextBtn) {
      this.nextBtn.style.opacity = this.currentSlide === this.maxSlides ? '0.5' : '1';
    }
  }
  
  addTouchSupport() {
    let startX = 0;
    let startY = 0;
    let moveX = 0;
    let moveY = 0;
    let isDragging = false;
    let startTime = 0;
    
    // Eventos táctiles mejorados
    this.track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isDragging = true;
      moveX = 0;
      moveY = 0;
      
      // Pausar transición durante el drag
      this.track.style.transition = 'none';
    }, { passive: true });
    
    this.track.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      moveX = e.touches[0].clientX - startX;
      moveY = e.touches[0].clientY - startY;
      
      // Solo hacer drag horizontal si el movimiento es más horizontal que vertical
      if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) > 15) {
        e.preventDefault();
        
        // Aplicar transformación en tiempo real durante el drag
        const slideWidth = 100 / this.slidesPerView;
        const currentTranslate = -this.currentSlide * slideWidth;
        const dragPercent = (moveX / this.track.clientWidth) * 100;
        const newTranslate = currentTranslate + dragPercent;
        
        this.track.style.transform = `translateX(${newTranslate}%)`;
      }
    }, { passive: false });
    
    this.track.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      
      // Restaurar transición
      this.track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      const endTime = Date.now();
      const timeDiff = endTime - startTime;
      const distance = Math.abs(moveX);
      const velocity = timeDiff > 0 ? distance / timeDiff : 0;
      
      // Determinar si cambiar de slide basado en distancia y velocidad
      const threshold = this.track.clientWidth * 0.25; // 25% del ancho
      const shouldChange = distance > threshold || (velocity > 0.5 && distance > 50);
      
      if (shouldChange) {
        if (moveX > 0) {
          this.prevSlide();
        } else {
          this.nextSlide();
        }
      } else {
        // Volver a la posición original
        this.updateCarousel();
      }
      
      // Reset variables
      moveX = 0;
      moveY = 0;
    }, { passive: true });
    
    // Soporte para mouse drag en desktop
    let isMouseDown = false;
    
    this.track.addEventListener('mousedown', (e) => {
      startX = e.clientX;
      startTime = Date.now();
      isMouseDown = true;
      this.track.style.transition = 'none';
      this.track.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    this.track.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      
      moveX = e.clientX - startX;
      
      const slideWidth = 100 / this.slidesPerView;
      const currentTranslate = -this.currentSlide * slideWidth;
      const dragPercent = (moveX / this.track.clientWidth) * 100;
      const newTranslate = currentTranslate + dragPercent;
      
      this.track.style.transform = `translateX(${newTranslate}%)`;
    });
    
    this.track.addEventListener('mouseup', () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      
      this.track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      this.track.style.cursor = 'grab';
      
      const threshold = this.track.clientWidth * 0.25;
      if (Math.abs(moveX) > threshold) {
        if (moveX > 0) {
          this.prevSlide();
        } else {
          this.nextSlide();
        }
      } else {
        this.updateCarousel();
      }
      
      moveX = 0;
    });
    
    this.track.addEventListener('mouseleave', () => {
      if (isMouseDown) {
        isMouseDown = false;
        this.track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.track.style.cursor = 'grab';
        this.updateCarousel();
        moveX = 0;
      }
    });
  }
  
  startAutoplay(interval = 5000) {
    this.autoplayInterval = setInterval(() => {
      this.nextSlide();
    }, interval);
  }
  
  stopAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
    }
  }
  
  // Método para destruir la instancia del carousel
  destroy() {
    try {
      // Remover event listeners de botones
      if (this.prevBtn) {
        const newPrevBtn = this.prevBtn.cloneNode(true);
        this.prevBtn.parentNode.replaceChild(newPrevBtn, this.prevBtn);
      }
      
      if (this.nextBtn) {
        const newNextBtn = this.nextBtn.cloneNode(true);
        this.nextBtn.parentNode.replaceChild(newNextBtn, this.nextBtn);
      }
      
      // Remover event listeners de indicadores
      this.indicators.forEach(indicator => {
        const newIndicator = indicator.cloneNode(true);
        indicator.parentNode.replaceChild(newIndicator, indicator);
      });
      
      // Remover event listeners del track
      if (this.track) {
        const newTrack = this.track.cloneNode(true);
        this.track.parentNode.replaceChild(newTrack, this.track);
      }
      
      // Limpiar autoplay si existe
      if (this.autoplayInterval) {
        clearInterval(this.autoplayInterval);
      }
      
      // Resetear propiedades
      this.currentSlide = 0;
      this.track = null;
      this.slides = null;
      this.prevBtn = null;
      this.nextBtn = null;
      this.indicators = null;
      
      console.log('Carousel destruido correctamente');
    } catch (error) {
      console.error('Error al destruir carousel:', error);
    }
  }
}

