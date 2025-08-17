// Módulo de UI y componentes
export class UIModule {
  constructor() {
    this.loadingOverlay = null;
    this.notifications = [];
  }

  // Inicializar módulo UI
  initialize() {
    this.setupLoadingOverlay();
    this.setupNotificationContainer();
    this.setupGlobalEventListeners();
  }

  // Configurar overlay de carga
  setupLoadingOverlay() {
    this.loadingOverlay = document.getElementById('loadingOverlay');
    if (!this.loadingOverlay) {
      this.loadingOverlay = this.createLoadingOverlay();
      document.body.appendChild(this.loadingOverlay);
    }
  }

  // Crear overlay de carga si no existe
  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      display: none;
    `;
    
    overlay.innerHTML = `
      <div class="loading-spinner" style="
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
      "></div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    return overlay;
  }

  // Configurar contenedor de notificaciones
  setupNotificationContainer() {
    let container = document.getElementById('notificationContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notificationContainer';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }
  }

  // Configurar event listeners globales
  setupGlobalEventListeners() {
    // Escape key para cerrar modales
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeTopModal();
      }
    });

    // Click fuera de modales para cerrar
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        this.closeTopModal();
      }
    });
  }

  // Mostrar loading
  showLoading(message = 'Cargando...') {
    if (this.loadingOverlay) {
      const messageEl = this.loadingOverlay.querySelector('.loading-message');
      if (messageEl) {
        messageEl.textContent = message;
      } else {
        const spinner = this.loadingOverlay.querySelector('.loading-spinner');
        const messageDiv = document.createElement('p');
        messageDiv.className = 'loading-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = 'color: white; margin-top: 20px; text-align: center;';
        this.loadingOverlay.appendChild(messageDiv);
      }
      this.loadingOverlay.style.display = 'flex';
    }
  }

  // Ocultar loading
  hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.display = 'none';
    }
  }

  // Mostrar notificación toast
  showNotification(message, type = 'info', duration = 5000) {
    const notification = this.createNotification(message, type);
    const container = document.getElementById('notificationContainer');
    
    if (container) {
      container.appendChild(notification);
      this.notifications.push(notification);

      // Auto-remove después del tiempo especificado
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);

      // Animar entrada
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
      }, 10);
    }
  }

  // Crear elemento de notificación
  createNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };

    notification.style.cssText = `
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
      position: relative;
      padding-right: 40px;
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

    // Click para cerrar
    notification.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    return notification;
  }

  // Remover notificación
  removeNotification(notification) {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  // Confirmar acción
  async confirm(message, title = 'Confirmar') {
    return new Promise((resolve) => {
      const modal = this.createConfirmModal(message, title, resolve);
      document.body.appendChild(modal);
      
      // Mostrar modal
      setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
      }, 10);
    });
  }

  // Crear modal de confirmación
  createConfirmModal(message, title, resolve) {
    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    modal.innerHTML = `
      <div class="modal-content" style="
        background: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        transform: scale(0.9);
        transition: transform 0.3s ease;
      ">
        <h3 style="margin: 0 0 16px 0;">${title}</h3>
        <p style="margin: 0 0 24px 0;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button class="btn-cancel" style="
            padding: 8px 16px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
          ">Cancelar</button>
          <button class="btn-confirm" style="
            padding: 8px 16px;
            border: none;
            background: #2196F3;
            color: white;
            border-radius: 4px;
            cursor: pointer;
          ">Confirmar</button>
        </div>
      </div>
    `;

    // Event listeners
    modal.querySelector('.btn-cancel').addEventListener('click', () => {
      this.closeModal(modal);
      resolve(false);
    });

    modal.querySelector('.btn-confirm').addEventListener('click', () => {
      this.closeModal(modal);
      resolve(true);
    });

    return modal;
  }

  // Cerrar modal
  closeModal(modal) {
    modal.style.opacity = '0';
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }

  // Cerrar modal superior
  closeTopModal() {
    const modals = document.querySelectorAll('.modal-backdrop');
    if (modals.length > 0) {
      this.closeModal(modals[modals.length - 1]);
    }
  }

  // Utilitarias para manejo de elementos
  show(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      element.style.display = 'block';
    }
  }

  hide(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      element.style.display = 'none';
    }
  }

  toggle(element) {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      element.style.display = element.style.display === 'none' ? 'block' : 'none';
    }
  }

  // Validar formularios
  validateForm(form) {
    const errors = [];
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        errors.push(`${field.name || field.id} es requerido`);
        field.classList.add('error');
      } else {
        field.classList.remove('error');
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Instancia global
export const uiModule = new UIModule();