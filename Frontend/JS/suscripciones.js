document.addEventListener('DOMContentLoaded', async function() {
  await loadSubscriptionStatus();
  setupEventListeners();
});

async function loadSubscriptionStatus() {
  try {
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
  }
}

function updateSubscriptionUI(data) {
  const statusElement = document.getElementById('subscriptionStatus');
  const detailsElement = document.getElementById('subscriptionDetails');
  
  if (data.status === 'authorized') {
    statusElement.textContent = 'Activa';
    statusElement.className = 'status-active';
    detailsElement.innerHTML = `
      <p>Plan: ${data.plan || 'Estudiante'}</p>
      <p>Próximo pago: ${data.next_payment_date ? new Date(data.next_payment_date).toLocaleDateString() : 'No disponible'}</p>
    `;
  } else if (data.status === 'pending') {
    statusElement.textContent = 'Pendiente de activación';
    statusElement.className = 'status-pending';
  } else {
    statusElement.textContent = 'Inactiva';
    statusElement.className = 'status-inactive';
    detailsElement.innerHTML = '<p>Activa una suscripción para acceder a todas las funcionalidades.</p>';
  }
}

function setupEventListeners() {
  document.getElementById('btnEstudiante').addEventListener('click', () => startSubscriptionPlan('estudiante'));
  document.getElementById('btnDocente').addEventListener('click', () => startSubscriptionPlan('docente'));
  document.getElementById('btnManageSubscription').addEventListener('click', manageSubscription);
  document.getElementById('btnCancelSubscription').addEventListener('click', cancelSubscription);
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
}