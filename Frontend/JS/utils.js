// Archivo de utilidades comunes para StudyAI

// Función para validar email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar contraseña
function isValidPassword(password) {
  // Mínimo 8 caracteres, al menos una letra y un número
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

// Función para formatear fecha
function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

// Función para formatear fecha relativa
function formatRelativeDate(date) {
  if (!date) return '';
  
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = now - targetDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays === -1) return 'Mañana';
  if (diffDays > 0 && diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 0 && diffDays > -7) return `En ${Math.abs(diffDays)} días`;
  
  return formatDate(date);
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para generar ID único
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Función para debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Función para throttle
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Función para copiar al portapapeles
async function copyToClipboard(text) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback para navegadores antiguos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Error al copiar al portapapeles:', error);
    return false;
  }
}

// Función para descargar archivo
function downloadFile(data, filename, mimeType = 'application/octet-stream') {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Función para mostrar confirmación personalizada
function showConfirm(message, title = 'Confirmar') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'custom-confirm-modal';
    modal.innerHTML = `
      <div class="custom-confirm-content">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="custom-confirm-buttons">
          <button class="btn-small btn-ghost" id="confirmCancel">Cancelar</button>
          <button class="btn-small" id="confirmOk">Aceptar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const handleConfirm = (result) => {
      document.body.removeChild(modal);
      resolve(result);
    };
    
    modal.querySelector('#confirmOk').addEventListener('click', () => handleConfirm(true));
    modal.querySelector('#confirmCancel').addEventListener('click', () => handleConfirm(false));
    
    // Cerrar con Escape
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', handleKeydown);
        handleConfirm(false);
      }
    };
    document.addEventListener('keydown', handleKeydown);
  });
}

// Función para mostrar loading en botón
function setButtonLoading(button, isLoading, loadingText = 'Cargando...') {
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = `
      <span class="button-spinner"></span>
      ${loadingText}
    `;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

// Función para validar formulario
function validateForm(formData, rules) {
  const errors = {};
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = formData[field];
    
    if (rule.required && (!value || value.trim() === '')) {
      errors[field] = `${rule.label || field} es requerido`;
      continue;
    }
    
    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `${rule.label || field} debe tener al menos ${rule.minLength} caracteres`;
      continue;
    }
    
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `${rule.label || field} debe tener máximo ${rule.maxLength} caracteres`;
      continue;
    }
    
    if (rule.pattern && value && !rule.pattern.test(value)) {
      errors[field] = rule.message || `${rule.label || field} tiene un formato inválido`;
      continue;
    }
    
    if (rule.custom && typeof rule.custom === 'function') {
      const customError = rule.custom(value, formData);
      if (customError) {
        errors[field] = customError;
      }
    }
  }
  
  return errors;
}

// Función para sanitizar HTML
function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

// Función para obtener parámetros de URL
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
}

// Función para establecer parámetros de URL
function setUrlParams(params) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url);
}

// Función para detectar dispositivo móvil
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Función para detectar conexión lenta
function isSlowConnection() {
  if ('connection' in navigator) {
    return navigator.connection.effectiveType === 'slow-2g' || 
           navigator.connection.effectiveType === '2g' ||
           navigator.connection.effectiveType === '3g';
  }
  return false;
}

// Función para manejar errores de red
function handleNetworkError(error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'Error de conexión. Verifica tu conexión a internet.';
  }
  
  if (error.status === 404) {
    return 'Recurso no encontrado.';
  }
  
  if (error.status === 500) {
    return 'Error del servidor. Intenta más tarde.';
  }
  
  if (error.status === 401) {
    return 'Sesión expirada. Inicia sesión nuevamente.';
  }
  
  if (error.status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }
  
  return 'Ha ocurrido un error inesperado.';
}

// Función para retry con backoff exponencial
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Exportar funciones para uso global
window.Utils = {
  isValidEmail,
  isValidPassword,
  formatDate,
  formatRelativeDate,
  formatFileSize,
  generateId,
  debounce,
  throttle,
  copyToClipboard,
  downloadFile,
  showConfirm,
  setButtonLoading,
  validateForm,
  sanitizeHtml,
  getUrlParams,
  setUrlParams,
  isMobile,
  isSlowConnection,
  handleNetworkError,
  retryWithBackoff
};
