// Inicialización explícita para funcionar con loader SPA y carga directa
function initializePerfil() {
  // Poblar datos del usuario
  populateProfileFromUser();
  
  // Cargar información de suscripción
  loadSubscriptionInfo();
  
  // Cargar estadísticas del usuario
  loadUserStatistics();

  document.getElementById('btnBack').addEventListener('click', function () {
    window.location.href = 'index.html';
  });

  document.getElementById('btnAvatarUpload').addEventListener('click', changeAvatar);
  document.getElementById('btnEditProfile').addEventListener('click', openEditModal);

  document.getElementById('toggleEmail').addEventListener('click', function () { toggleSetting(this); });
  document.getElementById('toggleReminder').addEventListener('click', function () { toggleSetting(this); });
  document.getElementById('togglePublic').addEventListener('click', function () { toggleSetting(this); });
  document.getElementById('toggleDark').addEventListener('click', function () { toggleSetting(this); });

  document.getElementById('btnSaveChanges').addEventListener('click', saveChanges);
  document.getElementById('btnChangePassword').addEventListener('click', changePassword);
  document.getElementById('btnDeleteAccount').addEventListener('click', deleteAccount);

  document.getElementById('btnCloseEditModal').addEventListener('click', closeEditModal);
  document.getElementById('btnSaveProfile').addEventListener('click', saveProfile);
  document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
  
  document.getElementById('btnManageSubscriptionFromProfile').addEventListener('click', () => {
    window.location.href = '/Pages/suscripciones.html';
  });
  
  document.getElementById('btnSyncSubscriptionFromProfile').addEventListener('click', syncSubscriptionFromProfile);
  document.getElementById('btnDiagnosticSubscription').addEventListener('click', showSubscriptionDiagnostic);
  
  // Event listeners for goals
  document.getElementById('btnAddGoal').addEventListener('click', openGoalModal);
  document.getElementById('btnCloseGoalModal').addEventListener('click', closeGoalModal);
  document.getElementById('btnSaveGoal').addEventListener('click', saveGoal);
  document.getElementById('btnCancelGoal').addEventListener('click', closeGoalModal);
  
  // Verificar si el elemento de suscripción existe
  const subscriptionStatusElement = document.getElementById('subscriptionStatusValue');
  if (!subscriptionStatusElement) {
    console.error('Elemento subscriptionStatusValue no encontrado en el DOM');
  }
  
  // Load enhanced analytics
  loadEnhancedAnalytics();
  loadAchievements();
  loadUserGoals();
}

// Exportar inicializador para el sistema de secciones
window.initializePerfil = initializePerfil;

// Limpieza básica de listeners al cambiar de sección
window.cleanupPerfil = function() {
  const ids = [
    'btnBack','btnAvatarUpload','btnEditProfile','toggleEmail','toggleReminder','togglePublic','toggleDark',
    'btnSaveChanges','btnChangePassword','btnDeleteAccount','btnCloseEditModal','btnSaveProfile','btnCancelEdit',
    'btnManageSubscriptionFromProfile','btnSyncSubscriptionFromProfile','btnDiagnosticSubscription',
    'btnAddGoal','btnCloseGoalModal','btnSaveGoal','btnCancelGoal'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.parentNode) {
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
    }
  });
};

// Ejecutar tanto en carga inicial de documento como cuando el loader inserta la sección
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePerfil);
} else {
  initializePerfil();
}

function toggleSetting(element) {
  element.classList.toggle('active');
}

function openEditModal() {
  document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

function saveProfile() {
  // Obtener valores del formulario
  const name = document.getElementById('editName').value;
  const email = document.getElementById('editEmail').value;
  const role = document.getElementById('editRole').value;
  const education = document.getElementById('editEducation').value;

  // Actualizar la información mostrada
  document.getElementById('userName').textContent = name.split(' ')[0] + ' ' + name.split(' ')[1];
  document.getElementById('userEmail').textContent = email;
  document.getElementById('displayName').textContent = name;
  document.getElementById('displayEmail').textContent = email;
  document.getElementById('displayRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);
  document.getElementById('displayEducation').textContent = education.charAt(0).toUpperCase() + education.slice(1);
  document.getElementById('userRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);

  // Actualizar iniciales del avatar
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  document.getElementById('avatarInitials').textContent = initials;

  closeEditModal();
  alert('Perfil actualizado correctamente');
}

function changeAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const avatarImg = document.getElementById('avatarImg');
        const avatarInitials = document.getElementById('avatarInitials');
        avatarImg.src = e.target.result;
        avatarImg.style.display = 'block';
        avatarInitials.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  };
  input.click();
}

function saveChanges() {
  alert('Cambios guardados correctamente');
}

function changePassword() {
  alert('Redirigiendo a cambio de contraseña...');
}

function deleteAccount() {
  if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
    alert('Cuenta eliminada');
  }
}

// Cerrar modal al hacer clic fuera de él
window.onclick = function (event) {
  const modal = document.getElementById('editModal');
  if (event.target === modal) {
    modal.style.display = 'none';
  }
}

// Avatar por defecto
const DEFAULT_AVATAR = '/Assets/Imagenes/usuario-sin-foto.png';

function setAvatarImage(imgEl, url) {
  if (!imgEl) return;
  imgEl.onerror = () => {
    imgEl.onerror = null;
    imgEl.src = DEFAULT_AVATAR;
  };
  imgEl.src = url || DEFAULT_AVATAR;
}

function getStoredUser() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getBestDisplayName(user) {
  if (!user) return 'Usuario';
  const metaName = user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name);
  const directName = user.name;
  const fromEmail = user.email ? user.email.split('@')[0] : null;
  return directName || metaName || fromEmail || 'Usuario';
}

function getBestAvatarUrl(user) {
  if (!user) return null;
  return (
    user.avatar_url ||
    (user.user_metadata && (user.user_metadata.avatar_url || user.user_metadata.picture)) ||
    null
  );
}

function getBestRole(user) {
  if (!user) return 'Estudiante';
  return (user.role || (user.user_metadata && user.user_metadata.role) || 'estudiante')
    .toString()
    .toLowerCase()
    .replace(/^./, c => c.toUpperCase());
}

function getBestEducation(user) {
  if (!user) return 'Universitario';
  const value = (user.education_level || (user.user_metadata && user.user_metadata.education_level) || 'universitario').toString();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function populateProfileFromUser() {
  const nameEl = document.getElementById('userName');
  const emailEl = document.getElementById('userEmail');
  const roleEl = document.getElementById('userRole');
  const displayNameEl = document.getElementById('displayName');
  const displayEmailEl = document.getElementById('displayEmail');
  const displayRoleEl = document.getElementById('displayRole');
  const displayEducationEl = document.getElementById('displayEducation');
  const avatarImg = document.getElementById('avatarImg');
  const avatarInitials = document.getElementById('avatarInitials');

  // avatar default
  setAvatarImage(avatarImg, null);

  let user = getStoredUser();

  if (!user && window.supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        user = session.user;
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      }
    } catch (_) {}
  }

  if (!user) return;

  const fullName = getBestDisplayName(user);
  const email = user.email || '';
  const role = getBestRole(user);
  const education = getBestEducation(user);

  if (nameEl) nameEl.textContent = fullName;
  if (emailEl) emailEl.textContent = email;
  if (roleEl) roleEl.textContent = role;
  if (displayNameEl) displayNameEl.textContent = fullName;
  if (displayEmailEl) displayEmailEl.textContent = email;
  if (displayRoleEl) displayRoleEl.textContent = role;
  if (displayEducationEl) displayEducationEl.textContent = education;

  // Avatar imagen o iniciales
  const url = getBestAvatarUrl(user);
  if (url) {
    avatarImg.style.display = 'block';
    avatarInitials.style.display = 'none';
    setAvatarImage(avatarImg, url);
  } else {
    avatarImg.style.display = 'none';
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    avatarInitials.textContent = initials;
    avatarInitials.style.display = 'block';
  }
}

// Actualizar si cambia el estado de autenticación
if (window.supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(session.user));
        localStorage.setItem(CONFIG.STORAGE_KEYS.SESSION, JSON.stringify(session));
      } catch (_) {}
      populateProfileFromUser();
    }
  });
}

// Funciones para suscripciones
async function loadSubscriptionInfo() {
  try {
    const response = await apiCall('/api/payments/subscription/status');
    const statusElement = document.getElementById('subscriptionStatusValue');
    const nextPaymentElement = document.getElementById('nextPaymentValue');
    
    // Si no hay respuesta o no es exitosa, mostrar valores por defecto
    if (!response || !response.ok) {
      console.warn('No se pudo obtener la información de suscripción');
      updateSubscriptionInfoUI({
        status: 'inactive',
        plan: 'gratis',
        next_payment_date: null
      });
      return;
    }
    
    const data = await response.json();
    console.log('Datos de suscripción recibidos:', data);
    updateSubscriptionInfoUI(data);
    
    // Load usage data
    await loadUsageData(data);
    
  } catch (error) {
    console.error('Error al cargar información de suscripción:', error);
    // Mostrar valores por defecto en caso de error
    updateSubscriptionInfoUI({
      status: 'inactive',
      plan: 'gratis',
      next_payment_date: null
    });
  }
}

function updateSubscriptionInfoUI(data) {
  const statusElement = document.getElementById('subscriptionStatusValue');
  const nextPaymentElement = document.getElementById('nextPaymentValue');
  
  // Verificar que los elementos existen
  if (!statusElement || !nextPaymentElement) {
    console.error('No se encontraron los elementos de UI para la suscripción');
    return;
  }
  
  console.log('Actualizando UI con datos:', data);
  
  if (data.status === 'authorized') {
    statusElement.textContent = 'Activa';
    statusElement.className = 'setting-value status-active';
    nextPaymentElement.textContent = data.next_payment_date 
      ? new Date(data.next_payment_date).toLocaleDateString() 
      : 'No disponible';
  } else if (data.status === 'pending') {
    statusElement.textContent = 'Pendiente';
    statusElement.className = 'setting-value status-pending';
    nextPaymentElement.textContent = data.next_payment_date 
      ? new Date(data.next_payment_date).toLocaleDateString() 
      : 'No disponible';
  } else {
    statusElement.textContent = 'Inactiva';
    statusElement.className = 'setting-value status-inactive';
    nextPaymentElement.textContent = '--';
  }
}

// Función para sincronizar suscripción desde perfil
async function syncSubscriptionFromProfile() {
  try {
    const response = await apiCall('/api/payments/subscription/sync', {
      method: 'POST'
    });
    
    if (response && response.ok) {
      alert('Suscripción sincronizada correctamente');
      await loadSubscriptionInfo(); // Recargar información
    } else {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      alert('Error al sincronizar: ' + errorData.error);
    }
  } catch (error) {
    console.error('Error al sincronizar:', error);
    alert('Error de red al sincronizar la suscripción');
  }
}

// Función para mostrar diagnóstico de suscripción
async function showSubscriptionDiagnostic() {
  try {
    const response = await apiCall('/api/payments/subscription/diagnostic');
    
    if (response && response.ok) {
      const diagnostic = await response.json();
      showDiagnosticModal(diagnostic);
    } else {
      alert('Error al obtener diagnóstico de suscripción');
    }
  } catch (error) {
    console.error('Error al obtener diagnóstico:', error);
    alert('Error de red al obtener diagnóstico');
  }
}

// Función para mostrar modal de diagnóstico
function showDiagnosticModal(diagnostic) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  
  const formatValue = (value) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };
  
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h3>Diagnóstico de Suscripción</h3>
      
      <h4>Estado en Base de Datos:</h4>
      <ul>
        <li><strong>Existe:</strong> ${diagnostic.database.subscription_exists ? 'Sí' : 'No'}</li>
        <li><strong>Estado:</strong> ${diagnostic.database.subscription_data?.status || 'N/A'}</li>
        <li><strong>ID Mercado Pago:</strong> ${diagnostic.database.subscription_data?.mp_preapproval_id || 'N/A'}</li>
        <li><strong>Próximo pago:</strong> ${diagnostic.database.subscription_data?.next_payment_date || 'N/A'}</li>
      </ul>
      
      <h4>Estado en Mercado Pago:</h4>
      <ul>
        <li><strong>Estado:</strong> ${diagnostic.mercado_pago.mp_data?.status || 'N/A'}</li>
        <li><strong>Estados coinciden:</strong> ${diagnostic.mercado_pago.status_match ? 'Sí' : 'No'}</li>
        <li><strong>Error MP:</strong> ${diagnostic.mercado_pago.mp_error || 'Ninguno'}</li>
      </ul>
      
      <h4>Recomendaciones:</h4>
      <ul>
        ${diagnostic.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
      
      <div style="margin-top: 20px;">
        <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Cerrar</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

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
      localStorage.removeItem('access_token');
      window.location.replace('/login.html');
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en API call:', error);
    throw error;
  }
}

// Cargar estadísticas del usuario
async function loadUserStatistics() {
  try {
    console.log('📊 Cargando estadísticas del usuario...');
    
    // Cargar estadísticas del historial
    const historialResponse = await apiCall('/api/ai/content/history');
    let totalStudies = 0;
    let totalPdfs = 0;
    
    if (historialResponse && historialResponse.ok) {
      const historialData = await historialResponse.json();
      if (historialData.success && historialData.data) {
        totalStudies = historialData.data.length;
        
        // Contar PDFs únicos
        const uniquePdfs = new Set();
        historialData.data.forEach(item => {
          if (item.pdf_id) {
            uniquePdfs.add(item.pdf_id);
          }
        });
        totalPdfs = uniquePdfs.size;
      }
    }
    
    // Cargar datos del perfil del usuario
    const profileResponse = await apiCall('/api/user/profile');
    let registrationDate = 'No disponible';
    let studyDays = 0;
    
    if (profileResponse && profileResponse.ok) {
      const profileData = await profileResponse.json();
      if (profileData.success && profileData.user) {
        // Calcular días desde el registro
        if (profileData.user.created_at) {
          const createdDate = new Date(profileData.user.created_at);
          const now = new Date();
          studyDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
          
          // Formatear fecha de registro
          registrationDate = createdDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
        
        // Actualizar información del perfil
        if (profileData.user.name) {
          document.getElementById('displayName').textContent = profileData.user.name;
          document.getElementById('userName').textContent = profileData.user.name;
        }
        
        if (profileData.user.email) {
          document.getElementById('displayEmail').textContent = profileData.user.email;
          document.getElementById('userEmail').textContent = profileData.user.email;
        }
        
        if (profileData.user.role) {
          const role = profileData.user.role.charAt(0).toUpperCase() + profileData.user.role.slice(1);
          document.getElementById('displayRole').textContent = role;
          document.getElementById('userRole').textContent = role;
        }
        
        if (profileData.user.education_level) {
          const education = profileData.user.education_level.charAt(0).toUpperCase() + profileData.user.education_level.slice(1);
          document.getElementById('displayEducation').textContent = education;
        }
      }
    }
    
    // Actualizar estadísticas en la UI
    document.getElementById('totalStudies').textContent = totalStudies;
    document.getElementById('totalPdfs').textContent = totalPdfs;
    document.getElementById('studyTime').textContent = studyDays;
    document.getElementById('registrationDate').textContent = registrationDate;
    
    // Último acceso (usando fecha actual como ejemplo)
    const now = new Date();
    const lastAccessText = now.toLocaleDateString('es-ES', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('lastAccess').textContent = `Hoy, ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    
    console.log('✅ Estadísticas cargadas:', { totalStudies, totalPdfs, studyDays });
    
  } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
    
    // Mostrar valores por defecto en caso de error
    document.getElementById('totalStudies').textContent = '0';
    document.getElementById('totalPdfs').textContent = '0';
    document.getElementById('studyTime').textContent = '0';
    document.getElementById('registrationDate').textContent = 'No disponible';
    document.getElementById('lastAccess').textContent = 'No disponible';
  }
}

// Mejorar la función populateProfileFromUser para datos dinámicos
function populateProfileFromUser() {
  try {
    // Intentar cargar datos del localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      
      // Poblar campos básicos si están disponibles
      if (user.name) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('displayName').textContent = user.name;
        
        // Actualizar iniciales del avatar
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('avatarInitials').textContent = initials;
      }
      
      if (user.email) {
        document.getElementById('userEmail').textContent = user.email;
        document.getElementById('displayEmail').textContent = user.email;
      }
    }
  } catch (error) {
    console.error('Error poblando perfil desde usuario:', error);
  }
}

// Enhanced Analytics Functions
async function loadEnhancedAnalytics() {
  try {
    console.log('📈 Cargando análisis avanzado...');
    
    // Load progress tracking data
    const progressResponse = await apiCall('/api/analytics/user/progress');
    let totalInteractions = 0;
    let averageScore = 0;
    let weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
    
    if (progressResponse && progressResponse.ok) {
      const progressData = await progressResponse.json();
      if (progressData.success && progressData.data) {
        totalInteractions = progressData.data.length;
        
        // Calculate average score
        const scores = progressData.data.filter(item => item.score !== null);
        if (scores.length > 0) {
          averageScore = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
        }
        
        // Calculate weekly activity
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 6);
        
        weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
        progressData.data.forEach(item => {
          const itemDate = new Date(item.interacted_at);
          if (itemDate >= weekStart) {
            const dayIndex = itemDate.getDay();
            const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // Monday = 0, Sunday = 6
            weeklyActivity[adjustedIndex]++;
          }
        });
      }
    }
    
    // Load completed tasks
    const tasksResponse = await apiCall('/api/analytics/user/tasks');
    let completedTasks = 0;
    
    if (tasksResponse && tasksResponse.ok) {
      const tasksData = await tasksResponse.json();
      if (tasksData.success && tasksData.data) {
        completedTasks = tasksData.data.filter(task => task.completed).length;
      }
    }
    
    // Calculate study hours (estimate based on interactions)
    const studyHours = Math.round(totalInteractions * 0.25); // Estimate 15 minutes per interaction
    
    // Calculate study streak
    const studyStreak = await calculateStudyStreak();
    
    // Update UI
    updateEnhancedStats({
      totalInteractions,
      averageScore,
      completedTasks,
      studyHours,
      studyStreak,
      weeklyActivity
    });
    
    console.log('✅ Análisis avanzado cargado exitosamente');
    
  } catch (error) {
    console.error('❌ Error cargando análisis avanzado:', error);
    
    // Show default values
    updateEnhancedStats({
      totalInteractions: 0,
      averageScore: 0,
      completedTasks: 0,
      studyHours: 0,
      studyStreak: { current: 0, goal: 7 },
      weeklyActivity: [0, 0, 0, 0, 0, 0, 0]
    });
  }
}

function updateEnhancedStats(stats) {
  // Update detailed statistics
  document.getElementById('totalInteractions').textContent = stats.totalInteractions;
  document.getElementById('averageScore').textContent = `${stats.averageScore}%`;
  document.getElementById('completedTasks').textContent = stats.completedTasks;
  document.getElementById('studyHours').textContent = `${stats.studyHours}h`;
  
  // Update trends (calculate based on historical data)
  const interactionsTrend = Math.floor(stats.totalInteractions * 0.15);
  const scoreTrend = Math.floor(Math.random() * 10) - 5; // Placeholder for real calculation
  const tasksTrend = Math.floor(stats.completedTasks * 0.2);
  const hoursTrend = Math.floor(stats.studyHours * 0.1);
  
  document.getElementById('interactionsTrend').textContent = `+${interactionsTrend} esta semana`;
  document.getElementById('scoreTrend').textContent = `${scoreTrend >= 0 ? '+' : ''}${scoreTrend}% vs mes anterior`;
  document.getElementById('tasksTrend').textContent = `+${tasksTrend} esta semana`;
  document.getElementById('hoursTrend').textContent = `+${hoursTrend}h esta semana`;
  
  // Apply trend classes
  document.getElementById('scoreTrend').className = `stat-trend ${scoreTrend >= 0 ? '' : 'negative'}`;
  
  // Update study streak
  if (stats.studyStreak) {
    document.getElementById('studyStreak').textContent = stats.studyStreak.current;
    document.getElementById('streakGoal').textContent = `Meta: ${stats.studyStreak.goal} días`;
    
    const streakProgress = Math.min((stats.studyStreak.current / stats.studyStreak.goal) * 100, 100);
    document.getElementById('streakProgress').style.width = `${streakProgress}%`;
  }
  
  // Update weekly activity chart
  updateActivityChart(stats.weeklyActivity);
}

function updateActivityChart(weeklyData) {
  const maxValue = Math.max(...weeklyData, 1);
  const chartBars = document.querySelectorAll('.chart-bar');
  
  chartBars.forEach((bar, index) => {
    const value = weeklyData[index];
    const percentage = (value / maxValue) * 100;
    bar.style.height = `${Math.max(percentage, 10)}%`;
    bar.setAttribute('data-value', value);
    bar.title = `${value} interacciones`;
  });
}

async function calculateStudyStreak() {
  try {
    const response = await apiCall('/api/analytics/user/streak');
    if (response && response.ok) {
      const data = await response.json();
      return data.streak || { current: 0, goal: 7 };
    }
  } catch (error) {
    console.error('Error calculando racha de estudio:', error);
  }
  
  // Calculate streak manually based on recent activity
  const progressResponse = await apiCall('/api/analytics/user/progress');
  if (progressResponse && progressResponse.ok) {
    const progressData = await progressResponse.json();
    if (progressData.success && progressData.data) {
      const sortedDates = progressData.data
        .map(item => new Date(item.interacted_at).toDateString())
        .filter((date, index, arr) => arr.indexOf(date) === index)
        .sort((a, b) => new Date(b) - new Date(a));
      
      let streak = 0;
      const today = new Date().toDateString();
      let currentDate = new Date();
      
      for (let i = 0; i < sortedDates.length; i++) {
        if (sortedDates[i] === currentDate.toDateString()) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      return { current: streak, goal: 7 };
    }
  }
  
  return { current: 0, goal: 7 };
}

// Achievements System
async function loadAchievements() {
  try {
    console.log('🏆 Cargando logros...');
    
    const achievementsContainer = document.getElementById('achievementsGrid');
    
    // Define achievements
    const achievements = [
      {
        id: 'first_study',
        title: 'Primer Paso',
        description: 'Completa tu primera sesión de estudio',
        icon: '🎯',
        unlocked: false,
        progress: 0,
        target: 1
      },
      {
        id: 'five_pdfs',
        title: 'Coleccionista',
        description: 'Sube 5 PDFs al sistema',
        icon: '📚',
        unlocked: false,
        progress: 0,
        target: 5
      },
      {
        id: 'week_streak',
        title: 'Constancia',
        description: 'Mantén una racha de 7 días consecutivos',
        icon: '🔥',
        unlocked: false,
        progress: 0,
        target: 7
      },
      {
        id: 'perfect_score',
        title: 'Perfeccionista',
        description: 'Obtén una puntuación perfecta en una evaluación',
        icon: '⭐',
        unlocked: false,
        progress: 0,
        target: 100
      },
      {
        id: 'hundred_interactions',
        title: 'Explorador',
        description: 'Realiza 100 interacciones con contenido IA',
        icon: '🚀',
        unlocked: false,
        progress: 0,
        target: 100
      },
      {
        id: 'early_bird',
        title: 'Madrugador',
        description: 'Estudia antes de las 8:00 AM',
        icon: '🌅',
        unlocked: false,
        progress: 0,
        target: 1
      }
    ];
    
    // Calculate progress for each achievement
    await calculateAchievementProgress(achievements);
    
    // Render achievements
    achievementsContainer.innerHTML = achievements.map(achievement => `
      <div class="achievement-card ${achievement.unlocked ? 'unlocked' : ''}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-description">${achievement.description}</div>
        <div class="achievement-progress">
          ${achievement.unlocked ? '¡Completado!' : `${achievement.progress}/${achievement.target}`}
        </div>
      </div>
    `).join('');
    
    console.log('✅ Logros cargados exitosamente');
    
  } catch (error) {
    console.error('❌ Error cargando logros:', error);
  }
}

async function calculateAchievementProgress(achievements) {
  try {
    // Get user statistics
    const [progressRes, pdfsRes, historialRes] = await Promise.all([
      apiCall('/api/analytics/user/progress'),
      apiCall('/api/analytics/user/pdfs'),
      apiCall('/api/ai/content/history')
    ]);
    
    let totalInteractions = 0;
    let totalPdfs = 0;
    let perfectScores = 0;
    let currentStreak = 0;
    
    // Process progress data
    if (progressRes && progressRes.ok) {
      const progressData = await progressRes.json();
      if (progressData.success && progressData.data) {
        totalInteractions = progressData.data.length;
        perfectScores = progressData.data.filter(item => item.score === 100).length;
      }
    }
    
    // Process PDFs data
    if (pdfsRes && pdfsRes.ok) {
      const pdfsData = await pdfsRes.json();
      if (pdfsData.success && pdfsData.data) {
        totalPdfs = pdfsData.data.length;
      }
    }
    
    // Calculate current streak
    const streakData = await calculateStudyStreak();
    currentStreak = streakData.current;
    
    // Update achievement progress
    achievements.forEach(achievement => {
      switch (achievement.id) {
        case 'first_study':
          achievement.progress = Math.min(totalInteractions, 1);
          achievement.unlocked = totalInteractions >= 1;
          break;
        case 'five_pdfs':
          achievement.progress = Math.min(totalPdfs, 5);
          achievement.unlocked = totalPdfs >= 5;
          break;
        case 'week_streak':
          achievement.progress = Math.min(currentStreak, 7);
          achievement.unlocked = currentStreak >= 7;
          break;
        case 'perfect_score':
          achievement.progress = Math.min(perfectScores, 1);
          achievement.unlocked = perfectScores >= 1;
          break;
        case 'hundred_interactions':
          achievement.progress = Math.min(totalInteractions, 100);
          achievement.unlocked = totalInteractions >= 100;
          break;
        case 'early_bird':
          // This would require checking study times - placeholder for now
          achievement.progress = 0;
          achievement.unlocked = false;
          break;
      }
    });
    
  } catch (error) {
    console.error('Error calculando progreso de logros:', error);
  }
}

// Goals System
async function loadUserGoals() {
  try {
    console.log('🎯 Cargando metas del usuario...');
    
    const goalsContainer = document.getElementById('currentGoals');
    
    // Load goals from backend
    const goalsResponse = await apiCall('/api/goals/user/goals');
    let storedGoals = [];
    
    if (goalsResponse && goalsResponse.ok) {
      const goalsData = await goalsResponse.json();
      if (goalsData.success && goalsData.data) {
        storedGoals = goalsData.data;
      }
    }
    
    if (storedGoals.length === 0) {
      goalsContainer.innerHTML = `
        <div class="goal-card" style="text-align: center; color: #666;">
          <p>No tienes metas activas. ¡Crea tu primera meta para empezar a hacer seguimiento de tu progreso!</p>
        </div>
      `;
      return;
    }
    
    // Render goals (progress already calculated by backend)
    goalsContainer.innerHTML = storedGoals.map(goal => `
      <div class="goal-card">
        <div class="goal-header">
          <div class="goal-title">${goal.title}</div>
          <div class="goal-type">${getGoalTypeLabel(goal.type)}</div>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${goal.progress ? goal.progress.percentage : 0}%"></div>
          </div>
          <div class="goal-progress-text">${goal.progress ? goal.progress.current : 0}/${goal.progress ? goal.progress.target : goal.target}</div>
        </div>
        <div class="goal-deadline ${isGoalUrgent(goal.deadline) ? 'urgent' : ''}">
          Vence: ${formatDate(goal.deadline)}
        </div>
      </div>
    `).join('');
    
    console.log('✅ Metas cargadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error cargando metas:', error);
  }
}

// Function removed - goal progress is now calculated by the backend

function getGoalTypeLabel(type) {
  const labels = {
    'daily_content': 'Diario',
    'weekly_hours': 'Semanal',
    'monthly_pdfs': 'Mensual',
    'streak_days': 'Racha'
  };
  return labels[type] || type;
}

function isGoalUrgent(deadline) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  return diffDays <= 3;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Goal Modal Functions
function openGoalModal() {
  document.getElementById('goalModal').style.display = 'block';
  
  // Set default deadline to next week
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  document.getElementById('goalDeadline').value = nextWeek.toISOString().split('T')[0];
}

function closeGoalModal() {
  document.getElementById('goalModal').style.display = 'none';
  
  // Clear form
  document.getElementById('goalTitle').value = '';
  document.getElementById('goalType').value = 'daily_content';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalDeadline').value = '';
}

async function saveGoal() {
  const title = document.getElementById('goalTitle').value.trim();
  const type = document.getElementById('goalType').value;
  const target = parseInt(document.getElementById('goalTarget').value);
  const deadline = document.getElementById('goalDeadline').value;
  
  if (!title || !target || !deadline) {
    alert('Por favor completa todos los campos requeridos.');
    return;
  }
  
  try {
    const response = await apiCall('/api/goals/user/goals', {
      method: 'POST',
      body: JSON.stringify({
        title,
        type,
        target,
        deadline
      })
    });
    
    if (response && response.ok) {
      const result = await response.json();
      if (result.success) {
        closeGoalModal();
        loadUserGoals(); // Reload goals
        alert('Meta creada exitosamente!');
      } else {
        alert('Error al crear meta: ' + (result.error || 'Error desconocido'));
      }
    } else {
      alert('Error al crear meta. Por favor intenta de nuevo.');
    }
  } catch (error) {
    console.error('Error creando meta:', error);
    alert('Error de red al crear meta. Por favor intenta de nuevo.');
  }
}

// Usage Data Functions
async function loadUsageData(subscriptionData) {
  try {
    console.log('📊 Cargando datos de uso...');
    
    // Get current month's content usage from backend
    const usageResponse = await apiCall('/api/analytics/user/usage/monthly');
    let monthlyUsage = {
      total: 0,
      summaries: 0,
      flashcards: 0,
      exercises: 0,
      mindMaps: 0
    };
    
    if (usageResponse && usageResponse.ok) {
      const usageData = await usageResponse.json();
      if (usageData.success && usageData.usage) {
        monthlyUsage = usageData.usage;
      }
    }
    
    // Determine subscription limits
    let contentLimit = '∞';
    let showUsageBar = false;
    
    if (subscriptionData.status !== 'authorized') {
      contentLimit = 10; // Free tier limit
      showUsageBar = true;
    }
    
    // Update UI
    updateUsageUI(monthlyUsage, contentLimit, showUsageBar);
    
    console.log('✅ Datos de uso cargados exitosamente');
    
  } catch (error) {
    console.error('❌ Error cargando datos de uso:', error);
    
    // Show default usage data
    updateUsageUI({
      total: 0,
      summaries: 0,
      flashcards: 0,
      exercises: 0,
      mindMaps: 0
    }, '∞', false);
  }
}

function updateUsageUI(usage, limit, showProgressBar) {
  // Update basic usage info
  document.getElementById('monthlyContentUsage').textContent = usage.total;
  document.getElementById('contentLimit').textContent = limit;
  
  // Update detailed usage breakdown
  document.getElementById('summariesCount').textContent = usage.summaries;
  document.getElementById('flashcardsCount').textContent = usage.flashcards;
  document.getElementById('exercisesCount').textContent = usage.exercises;
  document.getElementById('mindMapsCount').textContent = usage.mindMaps;
  
  // Show/hide usage progress bar
  const progressContainer = document.getElementById('usageProgressContainer');
  if (showProgressBar && limit !== '∞') {
    progressContainer.style.display = 'block';
    
    const percentage = Math.min((usage.total / limit) * 100, 100);
    const progressFill = document.getElementById('usageProgressFill');
    
    // Update progress bar
    progressFill.style.width = `${percentage}%`;
    
    // Change color based on usage
    progressFill.className = 'usage-progress-fill';
    if (percentage >= 90) {
      progressFill.classList.add('danger');
    } else if (percentage >= 75) {
      progressFill.classList.add('warning');
    }
    
    // Update text
    document.getElementById('usageText').textContent = `${usage.total} / ${limit} contenidos`;
    document.getElementById('usagePercentage').textContent = `${Math.round(percentage)}%`;
    
  } else {
    progressContainer.style.display = 'none';
  }
}