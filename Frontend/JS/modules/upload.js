// Módulo de subida de archivos
export class UploadModule {
  constructor(apiModule, uiModule) {
    this.api = apiModule;
    this.ui = uiModule;
    this.uploadBox = null;
    this.fileInput = null;
    this.uploadText = null;
    this.uploadedFilesContainer = null;
    this.allowedTypes = ['.pdf'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  // Inicializar módulo de upload
  initialize() {
    this.setupElements();
    this.setupEventListeners();
    this.loadUploadedFiles();
  }

  // Configurar elementos del DOM
  setupElements() {
    this.uploadBox = document.getElementById('uploadBox');
    this.fileInput = document.getElementById('fileInput');
    this.uploadText = document.getElementById('uploadText');
    this.uploadedFilesContainer = document.getElementById('uploadedFilesContainer');

    if (!this.uploadBox || !this.fileInput) {
      console.warn('Elementos de upload no encontrados');
      return;
    }
  }

  // Configurar event listeners
  setupEventListeners() {
    if (!this.uploadBox || !this.fileInput) return;

    // Click en el área de upload
    this.uploadBox.addEventListener('click', () => {
      this.fileInput.click();
    });

    // Cambio en el input de archivo
    this.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    this.uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.uploadBox.classList.add('drag-over');
    });

    this.uploadBox.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.uploadBox.classList.remove('drag-over');
    });

    this.uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      this.uploadBox.classList.remove('drag-over');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFileSelect(files[0]);
      }
    });
  }

  // Manejar selección de archivo
  async handleFileSelect(file) {
    try {
      // Validar archivo
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        this.ui.showNotification(validation.message, 'error');
        return;
      }

      // Actualizar UI
      this.updateUploadText(file.name);
      this.ui.showLoading('Subiendo archivo...');

      // Subir archivo
      const result = await this.uploadFile(file);
      
      if (result && result.pdf) {
        this.ui.showNotification('Archivo subido exitosamente', 'success');
        this.addUploadedFile(result.pdf);
        this.resetUploadBox();
      } else {
        throw new Error('Error en la respuesta del servidor');
      }

    } catch (error) {
      console.error('Error subiendo archivo:', error);
      this.ui.showNotification('Error al subir el archivo: ' + error.message, 'error');
      this.resetUploadBox();
    } finally {
      this.ui.hideLoading();
    }
  }

  // Validar archivo
  validateFile(file) {
    // Verificar tipo
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.allowedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        message: `Tipo de archivo no permitido. Solo se permiten: ${this.allowedTypes.join(', ')}`
      };
    }

    // Verificar tamaño
    if (file.size > this.maxFileSize) {
      return {
        isValid: false,
        message: `El archivo es demasiado grande. Tamaño máximo: ${this.formatFileSize(this.maxFileSize)}`
      };
    }

    return { isValid: true };
  }

  // Subir archivo al servidor
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const result = await this.api.uploadPdf(formData);
      return result;
    } catch (error) {
      throw new Error('Error de red al subir el archivo');
    }
  }

  // Actualizar texto del área de upload
  updateUploadText(fileName) {
    if (this.uploadText) {
      this.uploadText.textContent = fileName;
      this.uploadBox?.classList.add('file-selected');
    }
  }

  // Resetear área de upload
  resetUploadBox() {
    if (this.uploadText) {
      this.uploadText.textContent = 'Ningún archivo seleccionado';
    }
    if (this.fileInput) {
      this.fileInput.value = '';
    }
    this.uploadBox?.classList.remove('file-selected');
  }

  // Cargar archivos ya subidos
  async loadUploadedFiles() {
    try {
      // Esto debería implementarse cuando tengamos el endpoint para listar PDFs del usuario
      // const files = await this.api.getUserPdfs();
      // files.forEach(file => this.addUploadedFile(file));
    } catch (error) {
      console.error('Error cargando archivos:', error);
    }
  }

  // Agregar archivo a la lista de subidos
  addUploadedFile(fileData) {
    if (!this.uploadedFilesContainer) return;

    const fileElement = this.createFileElement(fileData);
    this.uploadedFilesContainer.appendChild(fileElement);
  }

  // Crear elemento de archivo
  createFileElement(fileData) {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 8px;
      background: white;
    `;

    fileDiv.innerHTML = `
      <div class="file-icon" style="margin-right: 12px; font-size: 24px;">📄</div>
      <div class="file-info" style="flex: 1;">
        <div class="file-name" style="font-weight: 500; margin-bottom: 4px;">
          ${fileData.title || fileData.originalName || 'Archivo PDF'}
        </div>
        <div class="file-meta" style="font-size: 12px; color: #666;">
          Subido: ${new Date(fileData.created_at || Date.now()).toLocaleDateString()}
          ${fileData.file_size ? ` • ${this.formatFileSize(fileData.file_size)}` : ''}
        </div>
      </div>
      <div class="file-actions" style="display: flex; gap: 8px;">
        <button class="btn-process" data-pdf-id="${fileData.id}" style="
          padding: 6px 12px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Procesar</button>
        <button class="btn-delete" data-pdf-id="${fileData.id}" style="
          padding: 6px 12px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        ">Eliminar</button>
      </div>
    `;

    // Event listeners para los botones
    const processBtn = fileDiv.querySelector('.btn-process');
    const deleteBtn = fileDiv.querySelector('.btn-delete');

    processBtn?.addEventListener('click', () => {
      this.showProcessOptions(fileData.id);
    });

    deleteBtn?.addEventListener('click', async () => {
      const confirmed = await this.ui.confirm(
        '¿Estás seguro de que quieres eliminar este archivo?',
        'Eliminar archivo'
      );
      if (confirmed) {
        this.deleteFile(fileData.id, fileDiv);
      }
    });

    return fileDiv;
  }

  // Mostrar opciones de procesamiento
  showProcessOptions(pdfId) {
    // Esto se conectaría con el módulo de procesamiento de IA
    const event = new CustomEvent('showProcessOptions', { 
      detail: { pdfId } 
    });
    document.dispatchEvent(event);
  }

  // Eliminar archivo
  async deleteFile(pdfId, fileElement) {
    try {
      this.ui.showLoading('Eliminando archivo...');
      
      // Aquí iría la llamada a la API para eliminar
      // await this.api.deletePdf(pdfId);
      
      fileElement.remove();
      this.ui.showNotification('Archivo eliminado', 'success');
    } catch (error) {
      console.error('Error eliminando archivo:', error);
      this.ui.showNotification('Error al eliminar el archivo', 'error');
    } finally {
      this.ui.hideLoading();
    }
  }

  // Formatear tamaño de archivo
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Función para crear instancia del módulo
export function createUploadModule(apiModule, uiModule) {
  return new UploadModule(apiModule, uiModule);
}