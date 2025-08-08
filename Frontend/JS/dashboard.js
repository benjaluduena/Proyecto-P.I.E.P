// Dashboard JavaScript
class Dashboard {
  constructor() {
    this.currentUser = null;
    this.stats = {};
    this.init();
  }

  async init() {
    try {
      // Verificar autenticación
      await this.checkAuth();
      
      // Cargar datos del dashboard
      await this.loadDashboardData();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      // Ocultar loading
      this.hideLoading();
      
    } catch (error) {
      console.error('Error inicializando dashboard:', error);
      this.showError('Error al cargar el dashboard');
    }
  }

  async checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      window.location.href = '/login.html';
      return;
    }

    this.currentUser = session.user;
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single();

      if (error) throw error;

      // Actualizar información del usuario en el header
      document.getElementById('userName').textContent = profile.name || this.currentUser.email;
      
      // Actualizar mensaje de bienvenida
      this.updateWelcomeMessage(profile.name);
      
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  }

  updateWelcomeMessage(userName) {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) {
      greeting = '¡Buenos días';
    } else if (hour < 18) {
      greeting = '¡Buenas tardes';
    } else {
      greeting = '¡Buenas noches';
    }
    
    welcomeMessage.textContent = `${greeting}, ${userName}! Esperamos que tengas un excelente día de estudio.`;
  }

  async loadDashboardData() {
    try {
      // Cargar estadísticas generales
      await this.loadGeneralStats();
      
      // Cargar estadísticas del usuario
      await this.loadUserStats();
      
      // Cargar actividad reciente
      await this.loadRecentActivity();
      
      // Cargar distribución de tipos de contenido
      await this.loadContentTypeDistribution();
      
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      throw error;
    }
  }

  async loadGeneralStats() {
    try {
      // Obtener estadísticas generales usando la vista user_dashboard_stats
      const { data: stats, error } = await supabase
        .from('user_dashboard_stats')
        .select('*');

      if (error) throw error;

      // Calcular totales
      const totals = {
        users: stats.length,
        pdfs: stats.reduce((sum, stat) => sum + (stat.total_pdfs || 0), 0),
        outputs: stats.reduce((sum, stat) => sum + (stat.total_outputs || 0), 0),
        plans: stats.reduce((sum, stat) => sum + (stat.total_plans || 0), 0),
        tasks: stats.reduce((sum, stat) => sum + (stat.total_tasks || 0), 0),
        completedTasks: stats.reduce((sum, stat) => sum + (stat.completed_tasks || 0), 0)
      };

      // Actualizar estadísticas generales
      this.updateGeneralStats(totals);
      
      // Actualizar estadísticas rápidas en la tarjeta de bienvenida
      this.updateQuickStats(totals);

    } catch (error) {
      console.error('Error cargando estadísticas generales:', error);
    }
  }

  updateGeneralStats(totals) {
    document.getElementById('totalUsers').textContent = totals.users.toLocaleString();
    document.getElementById('totalPdfsProcessed').textContent = totals.pdfs.toLocaleString();
    document.getElementById('totalContentGenerated').textContent = totals.outputs.toLocaleString();
    document.getElementById('totalStudyPlans').textContent = totals.plans.toLocaleString();
  }

  updateQuickStats(totals) {
    document.getElementById('totalPdfs').textContent = totals.pdfs.toLocaleString();
    document.getElementById('totalOutputs').textContent = totals.outputs.toLocaleString();
    document.getElementById('completedTasks').textContent = totals.completedTasks.toLocaleString();
  }

  async loadUserStats() {
    try {
      // Obtener estadísticas específicas del usuario actual
      const { data: userStats, error } = await supabase
        .from('user_dashboard_stats')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error) throw error;

      // Actualizar estadísticas personales
      this.updatePersonalStats(userStats);
      
      // Actualizar progreso del mes
      await this.updateMonthlyProgress();

    } catch (error) {
      console.error('Error cargando estadísticas del usuario:', error);
    }
  }

  updatePersonalStats(userStats) {
    document.getElementById('personalPdfs').textContent = userStats.total_pdfs || 0;
    document.getElementById('personalContent').textContent = userStats.total_outputs || 0;
    document.getElementById('personalPlans').textContent = userStats.total_plans || 0;
    document.getElementById('personalTasks').textContent = userStats.completed_tasks || 0;
  }

  async updateMonthlyProgress() {
    try {
      // Obtener tareas completadas este mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: tasks, error } = await supabase
        .from('plan_tasks')
        .select('*')
        .eq('completed', true)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;

      const completedThisMonth = tasks.length;
      const progressPercentage = Math.min(completedThisMonth * 10, 100); // 10% por tarea

      // Actualizar progreso visual
      document.getElementById('completedThisMonth').textContent = completedThisMonth;
      document.getElementById('progressPercentage').textContent = `${progressPercentage}%`;
      
      // Actualizar círculo de progreso
      const progressCircle = document.getElementById('progressCircle');
      const circumference = 2 * Math.PI * 50; // r=50
      const offset = circumference - (progressPercentage / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;

    } catch (error) {
      console.error('Error actualizando progreso mensual:', error);
    }
  }

  async loadRecentActivity() {
    try {
      // Obtener actividad reciente usando la vista recent_content
      const { data: recentContent, error } = await supabase
        .from('recent_content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      this.updateRecentActivity(recentContent);

    } catch (error) {
      console.error('Error cargando actividad reciente:', error);
    }
  }

  updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
      container.innerHTML = `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="fas fa-info-circle"></i>
          </div>
          <div class="activity-content">
            <p>No hay actividad reciente</p>
            <span class="activity-time">Comienza subiendo tu primer PDF</span>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = activities.map(activity => {
      const icon = this.getActivityIcon(activity.type);
      const message = this.getActivityMessage(activity);
      const timeAgo = this.getTimeAgo(activity.created_at);
      
      return `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="${icon}"></i>
          </div>
          <div class="activity-content">
            <p>${message}</p>
            <span class="activity-time">${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  getActivityIcon(type) {
    const icons = {
      'resumen': 'fas fa-book',
      'verdadero_falso': 'fas fa-check-circle',
      'multiple_choice': 'fas fa-list-ul',
      'flashcards': 'fas fa-credit-card',
      'problema': 'fas fa-calculator'
    };
    return icons[type] || 'fas fa-file-alt';
  }

  getActivityMessage(activity) {
    const typeNames = {
      'resumen': 'Resumen',
      'verdadero_falso': 'Preguntas Verdadero/Falso',
      'multiple_choice': 'Preguntas de Opción Múltiple',
      'flashcards': 'Flashcards',
      'problema': 'Problema'
    };
    
    const typeName = typeNames[activity.type] || 'Contenido';
    return `Se generó ${typeName} para "${activity.pdf_title || 'PDF sin título'}"`;
  }

  getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Hace un momento';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Hace ${days} día${days > 1 ? 's' : ''}`;
    }
  }

  async loadContentTypeDistribution() {
    try {
      // Obtener distribución de tipos de contenido
      const { data: contentTypes, error } = await supabase
        .from('study_outputs')
        .select('type');

      if (error) throw error;

      // Contar por tipo
      const distribution = contentTypes.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {});

      this.updateContentTypeDistribution(distribution);

    } catch (error) {
      console.error('Error cargando distribución de tipos:', error);
    }
  }

  updateContentTypeDistribution(distribution) {
    document.getElementById('resumenCount').textContent = distribution.resumen || 0;
    document.getElementById('verdaderoFalsoCount').textContent = distribution.verdadero_falso || 0;
    document.getElementById('multipleChoiceCount').textContent = distribution.multiple_choice || 0;
    document.getElementById('flashcardsCount').textContent = distribution.flashcards || 0;
  }

  setupEventListeners() {
    // Botón de logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.logout();
    });

    // Botón de crear plan
    document.getElementById('createPlanBtn').addEventListener('click', () => {
      this.createStudyPlan();
    });
  }

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Limpiar localStorage
      localStorage.clear();
      
      // Redirigir a login
      window.location.href = '/login.html';
      
    } catch (error) {
      console.error('Error en logout:', error);
      this.showError('Error al cerrar sesión');
    }
  }

  async createStudyPlan() {
    // Por ahora, redirigir a la página principal
    // En el futuro, esto podría abrir un modal para crear un plan
    window.location.href = '/index.html';
  }

  showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
  }

  hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
  }

  showError(message) {
    // Crear y mostrar notificación de error
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 5 segundos
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

// Inicializar dashboard cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});

// Estilos para notificaciones de error
const errorStyles = `
  .error-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc3545;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 1001;
    animation: slideIn 0.3s ease;
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Agregar estilos al head
const styleSheet = document.createElement('style');
styleSheet.textContent = errorStyles;
document.head.appendChild(styleSheet); 