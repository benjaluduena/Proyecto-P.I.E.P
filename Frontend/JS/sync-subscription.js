// Función para sincronizar el estado de suscripción manualmente
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
      const errorData = await response.json();
      console.error('Error al sincronizar suscripción:', errorData);
      alert('Error al sincronizar el estado de suscripción: ' + (errorData.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('Error al sincronizar suscripción:', error);
    alert('Error de red al sincronizar el estado de suscripción');
  }
}

// Añadir botón de sincronización en la UI
function addSyncButton() {
  const actionsDiv = document.querySelector('.subscription-actions');
  if (actionsDiv) {
    const syncButton = document.createElement('button');
    syncButton.className = 'btn btn-secondary';
    syncButton.id = 'btnSyncSubscription';
    syncButton.textContent = 'Sincronizar Estado';
    syncButton.addEventListener('click', syncSubscriptionStatus);
    
    // Insertar antes del botón de cancelar
    const cancelButton = document.getElementById('btnCancelSubscription');
    if (cancelButton) {
      actionsDiv.insertBefore(syncButton, cancelButton);
    } else {
      actionsDiv.appendChild(syncButton);
    }
  }
}

// Modificar setupEventListeners para añadir el botón de sincronización
function setupEventListeners() {
  document.getElementById('btnEstudiante').addEventListener('click', () => startSubscriptionPlan('estudiante'));
  document.getElementById('btnDocente').addEventListener('click', () => startSubscriptionPlan('docente'));
  document.getElementById('btnManageSubscription').addEventListener('click', manageSubscription);
  document.getElementById('btnCancelSubscription').addEventListener('click', cancelSubscription);
  
  // Añadir botón de sincronización
  addSyncButton();
}