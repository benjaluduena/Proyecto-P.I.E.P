const uploadBox = document.querySelector('.upload-box');
const uploadText = document.querySelector('.upload-text');
const fileInput = document.querySelector('.file-input');
const loadingOverlay = document.getElementById("loadingOverlay")
const cardActionBtns = document.querySelectorAll('.card-action-btn');
const cards = document.querySelectorAll('.card');
const uploadedFilesContainer = document.getElementById('uploadedFilesContainer');

cards.forEach(card => card.classList.add('disabled'));

// Arrastrar encima
uploadBox.addEventListener('dragover', e => {
  e.preventDefault();
  uploadBox.classList.add('hover');
});

// Salir del área
uploadBox.addEventListener('dragleave', e => {
  e.preventDefault();
  uploadBox.classList.remove('hover');
});

// Soltar archivo
uploadBox.addEventListener('drop', e => {
  e.preventDefault();
  uploadBox.classList.remove('hover');

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

  fileInput.files = files;
  mostrarArchivos(files);
});



// Manejar selección de archivo
fileInput.addEventListener('change', () => {
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
    uploadText.textContent = "Ningún archivo válido";
    cards.forEach(card => card.classList.add('disabled'));
  }
});

// Resetear input de archivo

function resetFileInput() {
  fileInput.value = '';
  uploadedFilesContainer.innerHTML = '';
  uploadText.textContent = "Ningún archivo seleccionado";
  cards.forEach(card => card.classList.add('disabled'));
}


// Mostrar archivos
function mostrarArchivos(files) {
  uploadedFilesContainer.innerHTML = '';
  uploadText.textContent = `${files.length} archivo(s) cargado(s)`;
  cards.forEach(card => card.classList.remove('disabled'));

  [...files].forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
      <span title="${file.name}">${file.name} <small>(${file.type || 'desconocido'})</small></span>
      <button class="remove-btn" data-index="${index}">❌</button>
    `;
    uploadedFilesContainer.appendChild(fileDiv);
  });

  // Manejar eliminar archivo (esto borra todo porque input.files es readonly)
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fileInput.value = '';
      uploadedFilesContainer.innerHTML = '';
      uploadText.textContent = "Ningún archivo seleccionado";
      cards.forEach(card => card.classList.add('disabled'));
    });
  });
}


// Manejar clics en botones de acción de tarjetas

cardActionBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    // Solo continuar si hay archivo cargado
    if (fileInput.files.length === 0) {
      showInfoMessage("Primero debes subir un archivo PDF.");
      return;
    }

    loadingOverlay.classList.add("show");

    const card = btn.closest(".card");
    const type = card?.dataset.type;

    try {
      if (type === "resumen") {
        // Subir PDF y generar resumen
        const formData = new FormData();
        formData.append('pdf', fileInput.files[0]);
        
        const response = await apiCall('/api/pdfs/upload', {
          method: 'POST',
          body: formData,
          headers: {
            // Remover Content-Type para FormData
            'Authorization': getAuthHeaders().Authorization
          }
        });

        if (!response || !response.ok) {
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        // Generar resumen con IA
        const summaryResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'resumen' })
        });

        if (!summaryResponse || !summaryResponse.ok) {
          throw new Error('Error al generar el resumen');
        }

        const { output } = await summaryResponse.json();

        // Redirigir a la página de resumen con los datos
        const params = new URLSearchParams({
          pdfId: pdfId,
          outputId: output.id,
          fileName: fileInput.files[0].name
        });
        
        window.location.href = `/Frontend/resumen.html?${params.toString()}`;
        return;
      }

      if (type === "verdadero-falso") {
        // Subir PDF y generar preguntas de verdadero/falso
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
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        // Generar verdadero/falso con IA
        const vfResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'verdadero_falso' })
        });

        if (!vfResponse || !vfResponse.ok) {
          throw new Error('Error al generar las preguntas de Verdadero/Falso');
        }

        const { output } = await vfResponse.json();

        // Redirigir a la vista de verdadero/falso
        const params = new URLSearchParams({
          pdfId: String(pdfId),
          outputId: String(output.id),
          fileName: fileInput.files[0].name
        });
        window.location.href = `/verdadero-falso.html?${params.toString()}`;
        return;
      }

      if (type === "multiple-choice") {
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
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        const mcResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'multiple_choice' })
        });

        if (!mcResponse || !mcResponse.ok) {
          throw new Error('Error al generar el examen Multiple Choice');
        }

        const { output } = await mcResponse.json();

        const params = new URLSearchParams({
          pdfId: String(pdfId),
          outputId: String(output.id),
          fileName: fileInput.files[0].name
        });
        window.location.href = `/multiple-choice.html?${params.toString()}`;
        return;
      }

      if (type === "mapa-mental") {
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
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        let mapResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'mapa_mental' })
        });
        // Manejar caso 400 por contenido existente
        if (mapResponse && mapResponse.status === 400) {
          try {
            const data = await mapResponse.json();
            if (data && data.outputId) {
              const params = new URLSearchParams({
                pdfId: String(pdfId),
                outputId: String(data.outputId),
                fileName: fileInput.files[0].name
              });
              window.location.href = `/Frontend/mapa-mental.html?${params.toString()}`;
              return;
            }
          } catch (_) {
            // Ignorar parse error y continuar como error genérico
          }
        }

        if (!mapResponse || !mapResponse.ok) {
          throw new Error('Error al generar el mapa mental');
        }

        const { output } = await mapResponse.json();

        const params = new URLSearchParams({
          pdfId: String(pdfId),
          outputId: String(output.id),
          fileName: fileInput.files[0].name
        });
        window.location.href = `/Frontend/mapa-mental.html?${params.toString()}`;
        return;
      }

      // Para otros tipos de contenido (mantener lógica existente)
      setTimeout(() => {
        loadingOverlay.classList.remove("show");
        if (type) {
          showSuccessMessage(type);
        } else {
          showInfoMessage("¡Proceso completado!");
        }
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      loadingOverlay.classList.remove("show");
      showNotification(`Error: ${error.message}`, "error");
    }
  });
});


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
