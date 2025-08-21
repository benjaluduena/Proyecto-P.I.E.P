// Variables globales - se reasignarán cuando se recargue la página
let uploadBox, uploadText, fileInput, loadingOverlay, cardActionBtns, cards, uploadedFilesContainer;

// Función para obtener referencias a los elementos DOM
function getHomeElements() {
  uploadBox = document.querySelector('.upload-box');
  uploadText = document.querySelector('.upload-text');
  fileInput = document.querySelector('.file-input');
  loadingOverlay = document.getElementById("loadingOverlay");
  cardActionBtns = document.querySelectorAll('.card-action-btn');
  cards = document.querySelectorAll('.card');
  uploadedFilesContainer = document.getElementById('uploadedFilesContainer');
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
  if (!uploadBox || !fileInput || !cardActionBtns) return;

  // Event listeners para drag & drop
  uploadBox.addEventListener('dragover', handleDragOver);
  uploadBox.addEventListener('dragleave', handleDragLeave);
  uploadBox.addEventListener('drop', handleDrop);

  // Event listener para selección de archivo
  fileInput.addEventListener('change', handleFileChange);

  // Event listeners para botones de acción
  cardActionBtns.forEach(btn => {
    // Remover event listeners previos para evitar duplicados
    btn.removeEventListener('click', handleCardAction);
    btn.addEventListener('click', handleCardAction);
  });
}

// Función de inicialización de la página home
function initializeHome() {
  console.log('Inicializando página home...');
  
  // Obtener referencias a elementos DOM
  getHomeElements();
  
  // Asegurar que el overlay esté oculto
  hideLoadingOverlay();
  
  // Deshabilitar tarjetas hasta que se cargue un archivo
  if (cards) {
    cards.forEach(card => card.classList.add('disabled'));
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
  
  // Configurar event listeners
  setupEventListeners();
  
  console.log('Home inicializado correctamente');
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
    if (uploadText) uploadText.textContent = "Ningún archivo válido";
    if (cards) cards.forEach(card => card.classList.add('disabled'));
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
  }
}

// Hacer la función de inicialización disponible globalmente para cuando se carguen las páginas dinámicamente
window.initializeHomeIfNeeded = function() {
  console.log('initializeHomeIfNeeded llamado');
  homeInitialized = false; // Permitir re-inicialización
  runInitialization();
};

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
  if (uploadedFilesContainer) uploadedFilesContainer.innerHTML = '';
  if (uploadText) uploadText.textContent = "Ningún archivo seleccionado";
  if (cards) cards.forEach(card => card.classList.add('disabled'));
}


// Mostrar archivos
function mostrarArchivos(files) {
  if (uploadedFilesContainer) uploadedFilesContainer.innerHTML = '';
  if (uploadText) uploadText.textContent = `${files.length} archivo(s) cargado(s)`;
  if (cards) cards.forEach(card => card.classList.remove('disabled'));

  [...files].forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
      <span title="${file.name}">${file.name} <small>(${file.type || 'desconocido'})</small></span>
      <button class="remove-btn" data-index="${index}">❌</button>
    `;
    if (uploadedFilesContainer) uploadedFilesContainer.appendChild(fileDiv);
  });

  // Manejar eliminar archivo (esto borra todo porque input.files es readonly)
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      if (uploadedFilesContainer) uploadedFilesContainer.innerHTML = '';
      if (uploadText) uploadText.textContent = "Ningún archivo seleccionado";
      if (cards) cards.forEach(card => card.classList.add('disabled'));
    });
  });
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
  return output;
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
      
      // Notificar al historial que se generó nuevo contenido
      if (window.refreshHistorial) {
        window.refreshHistorial();
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
      
      // Notificar al historial que se generó nuevo contenido
      if (window.refreshHistorial) {
        window.refreshHistorial();
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
      
      // Notificar al historial que se generó nuevo contenido
      if (window.refreshHistorial) {
        window.refreshHistorial();
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
      
      // Notificar al historial que se generó nuevo contenido
      if (window.refreshHistorial) {
        window.refreshHistorial();
      }
      
      const params = new URLSearchParams({
        pdfId: String(pdfId),
        outputId: String(output.id),
        fileName: fileName
      });
      window.location.href = `/mapa-mental.html?${params.toString()}`;
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
    this.currentSlide = 0;
    this.track = document.getElementById('carouselTrack');
    this.slides = document.querySelectorAll('.carousel-slide');
    this.totalSlides = this.slides.length;
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.indicators = document.querySelectorAll('.indicator');
    
    // Configuración responsiva
    this.slidesPerView = this.getSlidesPerView();
    this.maxSlides = Math.max(0, this.totalSlides - this.slidesPerView);
    
    this.init();
    this.handleResize();
  }
  
  getSlidesPerView() {
    return window.innerWidth > 768 ? 2 : 1;
  }
  
  init() {
    if (!this.track || this.totalSlides === 0) return;
    
    // Event listeners para botones
    this.prevBtn?.addEventListener('click', () => this.prevSlide());
    this.nextBtn?.addEventListener('click', () => this.nextSlide());
    
    // Event listeners para indicadores
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.goToSlide(index));
    });
    
    // Soporte para touch/swipe mejorado
    this.addTouchSupport();
    
    // Event listener para resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Autoplay opcional (comentado por defecto)
    // this.startAutoplay();
    
    // Actualizar estado inicial
    this.updateCarousel();
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
    if (this.currentSlide > 0) {
      this.currentSlide--;
    } else {
      // Navegación infinita - ir al final
      this.currentSlide = this.maxSlides;
    }
    this.updateCarousel();
  }
  
  nextSlide() {
    if (this.currentSlide < this.maxSlides) {
      this.currentSlide++;
    } else {
      // Navegación infinita - volver al inicio
      this.currentSlide = 0;
    }
    this.updateCarousel();
  }
  
  goToSlide(slideIndex) {
    // Para desktop con 2 tarjetas, cada indicador representa 2 slides
    const targetSlide = slideIndex * this.slidesPerView;
    this.currentSlide = Math.min(targetSlide, this.maxSlides);
    this.updateCarousel();
  }
  
  updateCarousel() {
    // Calcular el desplazamiento basado en slides por vista
    const slideWidth = 100 / this.slidesPerView;
    const translateX = -this.currentSlide * slideWidth;
    this.track.style.transform = `translateX(${translateX}%)`;
    
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
    
    // Eventos táctiles
    this.track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isDragging = true;
      
      // Pausar transición durante el drag
      this.track.style.transition = 'none';
    }, { passive: true });
    
    this.track.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      
      moveX = e.touches[0].clientX - startX;
      moveY = e.touches[0].clientY - startY;
      
      // Solo hacer drag horizontal si el movimiento es más horizontal que vertical
      if (Math.abs(moveX) > Math.abs(moveY) && Math.abs(moveX) > 10) {
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
      const velocity = distance / timeDiff;
      
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
}

// Inicializar el carrusel cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new Carousel();
});

// También inicializar si el script se carga después del DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Carousel();
  });
} else {
  new Carousel();
}
