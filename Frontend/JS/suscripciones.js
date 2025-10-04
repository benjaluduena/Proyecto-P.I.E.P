document.addEventListener('DOMContentLoaded', async function() {
  await loadSubscriptionStatus();
  setupEventListeners();
});

async function loadSubscriptionStatus() {
  try {
<<<<<<< HEAD
    const response = await apiCall('/api/payments/subscription/status');
    if (response && response.ok) {
      const data = await response.json();
      updateSubscriptionUI(data);
    } else {
      document.getElementById('subscriptionStatus').textContent = 'No disponible';
    }
  } catch (error) {
    console.error('Error al cargar estado de suscripción:', error);
    document.getElementById('subscriptionStatus').textContent = 'Error al cargar';
=======
    // Solo cargar si estamos en una página que tiene los elementos de suscripción
    const statusElement = document.getElementById('subscriptionStatus');
    if (!statusElement) {
      console.log('Elementos de suscripción no encontrados, saltando carga...');
      return;
    }

    console.log('Cargando estado de suscripción...');
    const response = await apiCall('/api/payments/subscription/status');
    console.log('Respuesta de estado de suscripción:', response);
    
    if (response && response.ok) {
      const data = await response.json();
      console.log('Datos de suscripción recibidos:', data);
      updateSubscriptionUI(data);
    } else {
      console.warn('Respuesta no OK al cargar estado de suscripción:', response);
      statusElement.textContent = 'No disponible';
    }
  } catch (error) {
    console.error('Error al cargar estado de suscripción:', error);
    const statusElement = document.getElementById('subscriptionStatus');
    if (statusElement) {
      statusElement.textContent = 'Error al cargar';
    }
>>>>>>> origin/feat-plan-estudio
  }
}

function updateSubscriptionUI(data) {
  const statusElement = document.getElementById('subscriptionStatus');
  const detailsElement = document.getElementById('subscriptionDetails');
  
<<<<<<< HEAD
  if (data.status === 'authorized') {
    statusElement.textContent = 'Activa';
    statusElement.className = 'status-active';
    detailsElement.innerHTML = `
      <p>Plan: ${data.plan || 'Estudiante'}</p>
      <p>Próximo pago: ${data.next_payment_date ? new Date(data.next_payment_date).toLocaleDateString() : 'No disponible'}</p>
    `;
=======
  // Verificar que los elementos existan antes de modificarlos
  if (!statusElement) {
    console.log('Elemento subscriptionStatus no encontrado');
    return;
  }
  
  if (data.status === 'authorized') {
    statusElement.textContent = 'Activa';
    statusElement.className = 'status-active';
    if (detailsElement) {
      detailsElement.innerHTML = `
        <p>Plan: ${data.plan || 'Estudiante'}</p>
        <p>Próximo pago: ${data.next_payment_date ? new Date(data.next_payment_date).toLocaleDateString() : 'No disponible'}</p>
      `;
    }
>>>>>>> origin/feat-plan-estudio
  } else if (data.status === 'pending') {
    statusElement.textContent = 'Pendiente de activación';
    statusElement.className = 'status-pending';
  } else {
    statusElement.textContent = 'Inactiva';
    statusElement.className = 'status-inactive';
<<<<<<< HEAD
    detailsElement.innerHTML = '<p>Activa una suscripción para acceder a todas las funcionalidades.</p>';
=======
    if (detailsElement) {
      detailsElement.innerHTML = '<p>Activa una suscripción para acceder a todas las funcionalidades.</p>';
    }
>>>>>>> origin/feat-plan-estudio
  }
}

function setupEventListeners() {
<<<<<<< HEAD
  document.getElementById('btnEstudiante').addEventListener('click', () => startSubscriptionPlan('estudiante'));
  document.getElementById('btnDocente').addEventListener('click', () => startSubscriptionPlan('docente'));
  document.getElementById('btnManageSubscription').addEventListener('click', manageSubscription);
  document.getElementById('btnCancelSubscription').addEventListener('click', cancelSubscription);
=======
  // Solo agregar event listeners si los elementos existen
  const btnEstudiante = document.getElementById('btnEstudiante');
  if (btnEstudiante) {
    btnEstudiante.addEventListener('click', () => startSubscriptionPlan('estudiante'));
  }

  const btnDocente = document.getElementById('btnDocente');
  if (btnDocente) {
    btnDocente.addEventListener('click', () => startSubscriptionPlan('docente'));
  }

  const btnManageSubscription = document.getElementById('btnManageSubscription');
  if (btnManageSubscription) {
    btnManageSubscription.addEventListener('click', manageSubscription);
  }

  const btnCancelSubscription = document.getElementById('btnCancelSubscription');
  if (btnCancelSubscription) {
    btnCancelSubscription.addEventListener('click', cancelSubscription);
  }
  
  // Agregar evento para sincronización si el botón existe
  const syncBtn = document.getElementById('btnSyncSubscription');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncSubscriptionStatus);
  }
>>>>>>> origin/feat-plan-estudio
}

async function startSubscriptionPlan(planType) {
  try {
    const planDetails = {
      'estudiante': { amount: 999, reason: 'Suscripción Estudiante P.I.E.P.', plan: 'estudiante' },
      'docente': { amount: 1999, reason: 'Suscripción Docente P.I.E.P.', plan: 'docente' }
    };
    
    const plan = planDetails[planType];
    if (plan) {
      await PIEP.startSubscription({
        amount: plan.amount,
        reason: plan.reason,
        currency: 'ARS',
        plan: plan.plan
      });
    }
  } catch (error) {
    alert('No se pudo iniciar la suscripción. Intenta de nuevo.');
    console.error('Error al iniciar suscripción:', error);
  }
}

function manageSubscription() {
  // Redirigir al panel de Mercado Pago o mostrar información de gestión
  alert('Para gestionar tu suscripción, visita el panel de Mercado Pago.');
}

function cancelSubscription() {
  if (confirm('¿Estás seguro de que quieres cancelar tu suscripción?')) {
    // Llamar a la API para cancelar
    cancelSubscriptionAPI();
  }
}

async function cancelSubscriptionAPI() {
  try {
    const response = await apiCall('/api/payments/subscription/cancel', {
      method: 'POST'
    });
    
    if (response && response.ok) {
      alert('Suscripción cancelada correctamente.');
      loadSubscriptionStatus(); // Recargar estado
    } else {
      alert('Error al cancelar la suscripción.');
    }
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    alert('Error al cancelar la suscripción.');
  }
<<<<<<< HEAD
=======
}

// Función para sincronizar suscripción
async function syncSubscriptionStatus() {
  try {
    console.log('Sincronizando estado de suscripción con Mercado Pago...');
    const response = await apiCall('/api/payments/subscription/sync', {
      method: 'POST'
    });
    
    if (response && response.ok) {
      const data = await response.json();
      console.log('Suscripción sincronizada:', data);
      alert('Estado de suscripción actualizado correctamente');
      // Recargar el estado después de sincronizar
      await loadSubscriptionStatus();
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      console.error('Error al sincronizar suscripción:', errorData);
      alert('Error al sincronizar el estado de suscripción: ' + errorData.error);
    }
  } catch (error) {
    console.error('Error al sincronizar suscripción:', error);
    alert('Error de red al sincronizar el estado de suscripción');
  }
>>>>>>> origin/feat-plan-estudio
}