// Cambiar Plan - JavaScript
let currentUserPlan = 'basico';
let planData = {
  basico: {
    name: 'Básico',
    price: 0,
    features: ['5 PDFs por mes', 'Resúmenes básicos', 'Preguntas simples'],
    status: 'Gratis para siempre'
  },
  premium: {
    name: 'Premium',
    price: 2999,
    features: ['50 PDFs por mes', 'IA avanzada', 'Mapas mentales', 'Chat Q&A ilimitado', 'Soporte prioritario']
  },
  pro: {
    name: 'Pro',
    price: 4999,
    features: ['PDFs ilimitados', 'IA de última generación', 'Análisis avanzado', 'Colaboración', 'Exportación múltiple', 'Soporte 24/7']
  }
};

// Función para hacer llamadas a la API con autenticación
async function apiCall(url, options = {}) {
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
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      window.location.replace('/login.html');
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en llamada a API:', error);
    throw error;
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Inicializando cambiar plan...');
  
  try {
    // Agregar estilos para modales
    addSimpleModalStyles();
    
    // Configurar event listeners PRIMERO (usando delegación, no importa si los botones no existen aún)
    setupEventListeners();
    
    // Cargar plan actual del usuario (esto actualiza los botones)
    await loadCurrentPlan();
    
    // Configurar FAQ interactivo
    setupFAQ();
    
    console.log('✅ Cambiar plan inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando cambiar plan:', error);
    showError('Error al cargar la información de planes');
  }
});

// Cargar plan actual del usuario
async function loadCurrentPlan() {
  try {
    // Obtener información de suscripción actual
    const response = await apiCall('/api/diagnostic/subscription/diagnostic');
    
    if (response && response.ok) {
      const data = await response.json();
      
      if (data.subscription) {
        // Usuario tiene suscripción activa
        currentUserPlan = data.subscription.reason?.includes('Premium') ? 'premium' : 
                          data.subscription.reason?.includes('Pro') ? 'pro' : 'basico';
        
        updateCurrentPlanDisplay(data.subscription);
      } else {
        // Usuario sin suscripción = plan básico
        currentUserPlan = 'basico';
        updateCurrentPlanDisplay(null);
      }
    }
    
    updatePlanButtons();
  } catch (error) {
    console.error('Error cargando plan actual:', error);
    // Asumir plan básico si hay error
    currentUserPlan = 'basico';
    updateCurrentPlanDisplay(null);
    updatePlanButtons();
  }
}

// Actualizar display del plan actual
function updateCurrentPlanDisplay(subscription) {
  const currentPlanName = document.getElementById('currentPlanName');
  const currentPlanStatus = document.getElementById('currentPlanStatus');
  
  if (!currentPlanName || !currentPlanStatus) return;
  
  const plan = planData[currentUserPlan];
  
  currentPlanName.textContent = plan.name;
  
  if (subscription && subscription.status === 'authorized') {
    const nextPayment = new Date(subscription.next_payment_date);
    currentPlanStatus.textContent = `Activo hasta el ${nextPayment.toLocaleDateString('es-ES')}`;
  } else {
    currentPlanStatus.textContent = plan.status || 'Plan activo';
  }
}

// Actualizar botones de planes
function updatePlanButtons() {
  const planCards = document.querySelectorAll('.plan-card');
  
  planCards.forEach(card => {
    const planType = card.dataset.plan;
    const button = card.querySelector('.plan-btn');
    
    if (planType === currentUserPlan) {
      button.textContent = 'Plan Actual';
      button.className = 'plan-btn plan-btn-current';
      button.disabled = true;
    } else {
      const planName = planData[planType].name;
      button.textContent = `Actualizar a ${planName}`;
      button.className = 'plan-btn plan-btn-upgrade';
      button.disabled = false;
    }
  });
}

// Configurar event listeners
function setupEventListeners() {
  console.log('🔧 Configurando event listeners...');
  
  // Usar delegación de eventos para botones de cambiar plan
  document.addEventListener('click', function(event) {
    // Verificar si el click fue en un botón de upgrade
    if (event.target.matches('.plan-btn-upgrade') || event.target.closest('.plan-btn-upgrade')) {
      event.preventDefault();
      event.stopPropagation();
      
      const button = event.target.matches('.plan-btn-upgrade') ? event.target : event.target.closest('.plan-btn-upgrade');
      console.log('🔄 Botón de upgrade clickeado:', button);
      
      handlePlanUpgrade(event);
    }
  });
  
  console.log('✅ Event listeners configurados con delegación');
}

// Manejar actualización de plan
async function handlePlanUpgrade(event) {
  const button = event.target.matches('.plan-btn-upgrade') ? event.target : event.target.closest('.plan-btn-upgrade');
  const planCard = button.closest('.plan-card');
  const newPlan = planCard.dataset.plan;
  
  if (newPlan === currentUserPlan) return;
  
  console.log(`Iniciando proceso de actualización a plan: ${newPlan}`);
  
  // Mostrar solo confirmación simple y directa
  const confirmedUpgrade = await showSimpleConfirmationModal(newPlan);
  if (!confirmedUpgrade) {
    console.log('❌ Usuario canceló la actualización');
    return;
  }
  
  // Ir directamente a MercadoPago
  try {
    showLoading('Redirigiendo a MercadoPago...');
    await createSubscription(newPlan);
  } catch (error) {
    console.error('Error actualizando plan:', error);
    showError('Error al procesar el cambio de plan. Inténtalo de nuevo.');
  } finally {
    hideLoading();
  }
}

// Crear suscripción
async function createSubscription(planType) {
  const plan = planData[planType];
  
  const subscriptionData = {
    reason: `Suscripción mensual P.I.E.P. - Plan ${plan.name}`,
    amount: plan.price,
    currency: 'ARS',
    frequency: 1,
    frequencyType: 'months',
    plan: planType
  };
  
  const response = await apiCall('/api/payments/mp/create-subscription', {
    method: 'POST',
    body: JSON.stringify(subscriptionData)
  });
  
  if (!response || !response.ok) {
    throw new Error('Error al crear la suscripción');
  }
  
  const data = await response.json();
  
  if (data.init_point) {
    // Redirigir a MercadoPago
    showSuccess('Redirigiendo a MercadoPago...');
    setTimeout(() => {
      window.location.href = data.init_point;
    }, 1500);
  } else {
    throw new Error('No se recibió el enlace de pago');
  }
}

// Modal simple de confirmación
function showSimpleConfirmationModal(planType) {
  return new Promise((resolve) => {
    const plan = planData[planType];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay simple-confirmation-modal';
    modal.innerHTML = `
      <div class="modal-content simple-modal-content">
        <div class="modal-header">
          <h3>🚀 Confirmar Actualización</h3>
          <p>¿Deseas actualizar a Plan ${plan.name}?</p>
        </div>
        <div class="modal-body">
          <div class="plan-upgrade-summary">
            <div class="upgrade-plan">
              <div class="plan-info">
                <h4>Plan ${plan.name}</h4>
                <div class="plan-price-display">$${plan.price}/mes</div>
              </div>
              <div class="plan-highlights">
                ${plan.features.slice(0, 3).map(feature => `<div class="highlight">✨ ${feature}</div>`).join('')}
              </div>
            </div>
            
            <div class="payment-note">
              <div class="note-icon">💳</div>
              <p>Serás redirigido a MercadoPago para completar el pago de forma segura</p>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary modal-cancel">Cancelar</button>
          <button class="btn-primary modal-confirm">Continuar a MercadoPago</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    modal.querySelector('.modal-confirm').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    // Cerrar con click fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
    
    // Cerrar con ESC
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(modal);
        document.removeEventListener('keydown', handleEsc);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
  });
}

// Modal de comparación de planes (DEPRECADO - mantener por compatibilidad)
function showPlanComparisonModal(newPlanType) {
  return new Promise((resolve) => {
    const newPlan = planData[newPlanType];
    const currentPlan = planData[currentUserPlan];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay plan-comparison-modal';
    modal.innerHTML = `
      <div class="modal-content comparison-modal-content">
        <div class="modal-header">
          <h3>✨ Comparar Planes</h3>
          <p>Revisa los beneficios de tu nuevo plan</p>
        </div>
        <div class="modal-body">
          <div class="plans-comparison">
            <div class="plan-column current-plan">
              <div class="plan-header">
                <span class="plan-badge current">Actual</span>
                <h4>${currentPlan.name}</h4>
                <div class="plan-price">$${currentPlan.price}<span>/mes</span></div>
              </div>
              <div class="plan-features">
                ${currentPlan.features.map(feature => `<div class="feature">✅ ${feature}</div>`).join('')}
              </div>
            </div>
            
            <div class="comparison-arrow">
              <div class="arrow-container">
                <span class="arrow">→</span>
                <span class="upgrade-text">Actualizar</span>
              </div>
            </div>
            
            <div class="plan-column new-plan">
              <div class="plan-header featured">
                <span class="plan-badge new">Nuevo</span>
                <h4>${newPlan.name}</h4>
                <div class="plan-price">$${newPlan.price}<span>/mes</span></div>
              </div>
              <div class="plan-features">
                ${newPlan.features.map(feature => `<div class="feature">⭐ ${feature}</div>`).join('')}
              </div>
            </div>
          </div>
          
          <div class="upgrade-benefits">
            <h4>🎯 Lo que obtienes con este cambio:</h4>
            <div class="benefits-list">
              <div class="benefit">📈 Más características premium</div>
              <div class="benefit">⚡ Mayor capacidad de procesamiento</div>
              <div class="benefit">🔧 Funcionalidades avanzadas</div>
              <div class="benefit">🎧 Soporte mejorado</div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary modal-cancel">Cancelar</button>
          <button class="btn-primary modal-continue">Continuar con ${newPlan.name}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    modal.querySelector('.modal-continue').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    // Cerrar con click fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });
}

// Modal de confirmación de pago (PASO 2)
function showPaymentConfirmationModal(planType) {
  return new Promise((resolve) => {
    const plan = planData[planType];
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay payment-confirmation-modal';
    modal.innerHTML = `
      <div class="modal-content payment-modal-content">
        <div class="modal-header">
          <h3>💳 Confirmar Pago</h3>
          <p>Procederemos con el pago seguro a través de MercadoPago</p>
        </div>
        <div class="modal-body">
          <div class="payment-summary">
            <div class="plan-summary">
              <h4>Plan seleccionado: <strong>${plan.name}</strong></h4>
              <div class="price-breakdown">
                <div class="price-row">
                  <span>Precio mensual:</span>
                  <span class="price">$${plan.price}</span>
                </div>
                <div class="price-row total">
                  <span><strong>Total a pagar:</strong></span>
                  <span class="price"><strong>$${plan.price}</strong></span>
                </div>
              </div>
            </div>
            
            <div class="payment-info">
              <div class="info-box">
                <div class="info-icon">🔐</div>
                <div class="info-content">
                  <h5>Pago Seguro</h5>
                  <p>Serás redirigido a MercadoPago para completar el pago de forma segura</p>
                </div>
              </div>
              
              <div class="info-box">
                <div class="info-icon">⚡</div>
                <div class="info-content">
                  <h5>Activación Inmediata</h5>
                  <p>Tu plan se activará inmediatamente después del pago exitoso</p>
                </div>
              </div>
              
              <div class="info-box">
                <div class="info-icon">🔄</div>
                <div class="info-content">
                  <h5>Cancelación Flexible</h5>
                  <p>Puedes cancelar tu suscripción en cualquier momento</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn-secondary modal-cancel">Cancelar</button>
          <button class="btn-primary modal-pay">Proceder al Pago</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    modal.querySelector('.modal-pay').addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    // Cerrar con click fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });
}

// Agregar estilos para el modal simple
function addSimpleModalStyles() {
  if (document.getElementById('simple-modal-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'simple-modal-styles';
  style.textContent = `
    .simple-confirmation-modal .modal-content {
      max-width: 500px;
      margin: auto;
    }
    
    .simple-modal-content .modal-header {
      text-align: center;
      padding: 30px 30px 20px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .simple-modal-content .modal-header h3 {
      font-size: 1.5rem;
      color: #2d3748;
      margin-bottom: 8px;
    }
    
    .simple-modal-content .modal-header p {
      color: #718096;
      font-size: 1rem;
    }
    
    .plan-upgrade-summary {
      padding: 20px 30px;
    }
    
    .upgrade-plan {
      background: linear-gradient(135deg, #a259fa 0%, #667eea 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .plan-info h4 {
      font-size: 1.4rem;
      margin-bottom: 8px;
    }
    
    .plan-price-display {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 15px;
    }
    
    .plan-highlights .highlight {
      padding: 4px 0;
      font-size: 0.9rem;
      opacity: 0.95;
    }
    
    .payment-note {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px;
      background: #f0f8ff;
      border: 1px solid #bee3f8;
      border-radius: 8px;
    }
    
    .note-icon {
      font-size: 1.2rem;
    }
    
    .payment-note p {
      color: #2b6cb0;
      font-size: 0.9rem;
      margin: 0;
    }
    
    .simple-modal-content .modal-actions {
      padding: 20px 30px 30px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .btn-secondary, .btn-primary {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-secondary {
      background: #f7fafc;
      color: #4a5568;
      border: 1px solid #e2e8f0;
    }
    
    .btn-secondary:hover {
      background: #edf2f7;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #a259fa 0%, #667eea 100%);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(162, 89, 250, 0.3);
    }
    
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(5px);
    }
    
    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: modalSlideIn 0.3s ease-out;
    }
    
    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-30px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `;
  document.head.appendChild(style);
}

// Configurar FAQ
function setupFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      // Cerrar otros items abiertos
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });
      
      // Toggle el item actual
      item.classList.toggle('active');
    });
  });
}

// Funciones de UI
function showLoading(message) {
  const overlay = document.getElementById('planLoadingOverlay');
  const messageEl = document.getElementById('loadingMessage');
  
  if (messageEl) messageEl.textContent = message;
  if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('planLoadingOverlay');
  if (overlay) overlay.style.display = 'none';
}

function showError(message) {
  // Implementar notificación de error
  console.error(message);
  alert(message); // Temporal - mejorar con toast notification
}

function showSuccess(message) {
  // Implementar notificación de éxito
  console.log(message);
  alert(message); // Temporal - mejorar con toast notification
}

// Funciones globales para integración con main.js
window.initializeCambiarPlan = function() {
  // Ya inicializado con DOMContentLoaded
  console.log('Cambiar plan ya inicializado');
};

// Limpiar recursos al cambiar de sección
window.cleanupCambiarPlan = function() {
  console.log('🧹 Limpiando recursos de cambiar plan...');
  
  // Remover modales si existen
  const modals = document.querySelectorAll('.modal-overlay');
  modals.forEach(modal => {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  });
  
  hideLoading();
};