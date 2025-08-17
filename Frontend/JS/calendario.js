// Calendario StudyAI - Gestión de eventos de estudio
class CalendarioStudyAI {
  constructor() {
    this.currentDate = new Date();
    this.selectedDate = new Date(); // Seleccionar hoy por defecto
    this.eventos = this.loadEventos();
    if (!this.eventos || this.eventos.length === 0) {
      this.eventos = this.createSampleEvents();
    }
    this.currentView = 'month';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderCalendar();
    this.updateCurrentMonthDisplay();
    this.loadTodaysEvents();
  }

  setupEventListeners() {
    // Navegación del calendario
    document.getElementById('btnAnterior')?.addEventListener('click', () => this.navigateMonth(-1));
    document.getElementById('btnSiguiente')?.addEventListener('click', () => this.navigateMonth(1));
    document.getElementById('btnHoy')?.addEventListener('click', () => this.goToToday());

    // Cambio de vista
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.changeView(e.target.dataset.view));
    });

    // Modal de eventos
    document.getElementById('btnNuevoEvento')?.addEventListener('click', () => this.openModal());
    document.getElementById('btnCerrarModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelar')?.addEventListener('click', () => this.closeModal());
    
    // Formulario de eventos
    document.getElementById('formEvento')?.addEventListener('submit', (e) => this.handleSubmitEvento(e));

    // Cerrar modal al hacer clic fuera
    document.getElementById('modalEvento')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalEvento') this.closeModal();
    });

    // Auto-calcular hora fin al cambiar duración
    document.getElementById('eventoDuracion')?.addEventListener('input', () => this.updateEndTime());
    document.getElementById('eventoHoraInicio')?.addEventListener('input', () => this.updateEndTime());
  }

  navigateMonth(direction) {
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.renderCalendar();
    this.updateCurrentMonthDisplay();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.renderCalendar();
    this.updateCurrentMonthDisplay();
    this.updateSelectedDateEvents();
  }

  changeView(view) {
    this.currentView = view;
    
    // Actualizar botones activos
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Por ahora solo implementamos vista mensual
    if (view !== 'month') {
      this.showNotification('Vista ' + view + ' próximamente disponible', 'info');
      return;
    }

    this.renderCalendar();
  }

  updateCurrentMonthDisplay() {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const monthEl = document.getElementById('currentMonth');
    if (monthEl) {
      monthEl.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
    }
  }

  renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Primer día del mes y último día
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Días del mes anterior para completar la primera semana
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    // Generar 42 días (6 semanas completas)
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayElement = this.createDayElement(currentDate, month);
      grid.appendChild(dayElement);
    }
  }

  createDayElement(date, currentMonth) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    
    const isCurrentMonth = date.getMonth() === currentMonth;
    const isToday = this.isToday(date);
    const isSelected = this.selectedDate && this.isSameDay(date, this.selectedDate);
    
    // Clases CSS
    if (!isCurrentMonth) dayDiv.classList.add('other-month');
    if (isToday) dayDiv.classList.add('today');
    if (isSelected) dayDiv.classList.add('selected');

    // Número del día
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayDiv.appendChild(dayNumber);

    // Eventos del día
    const dayEvents = this.getEventosForDate(date);
    if (dayEvents.length > 0) {
      dayDiv.classList.add('has-events');
      
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events';
      
      // Mostrar hasta 3 eventos
      const visibleEvents = dayEvents.slice(0, 3);
      visibleEvents.forEach(evento => {
        const eventDot = document.createElement('div');
        eventDot.className = `event-dot event-${evento.tipo}`;
        eventDot.title = `${evento.horaInicio} - ${evento.titulo}`;
        eventsContainer.appendChild(eventDot);
      });

      // Indicador de más eventos
      if (dayEvents.length > 3) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'more-events';
        moreIndicator.textContent = `+${dayEvents.length - 3}`;
        eventsContainer.appendChild(moreIndicator);
      }

      dayDiv.appendChild(eventsContainer);
    }

    // Event listener para seleccionar día
    dayDiv.addEventListener('click', () => {
      document.querySelectorAll('.calendar-day.selected').forEach(el => 
        el.classList.remove('selected'));
      dayDiv.classList.add('selected');
      this.selectedDate = new Date(date);
      this.updateSelectedDateEvents();
    });

    return dayDiv;
  }

  getEventosForDate(date) {
    return this.eventos.filter(evento => {
      const eventoDate = new Date(evento.fecha);
      return this.isSameDay(eventoDate, date);
    }).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  updateSelectedDateEvents() {
    const fechaEl = document.getElementById('fechaSeleccionada');
    const listaEl = document.getElementById('eventosLista');
    
    if (!this.selectedDate || !fechaEl || !listaEl) return;

    // Actualizar fecha seleccionada
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    fechaEl.textContent = this.selectedDate.toLocaleDateString('es-ES', options);

    // Obtener eventos del día
    const dayEvents = this.getEventosForDate(this.selectedDate);
    
    if (dayEvents.length === 0) {
      listaEl.innerHTML = `
        <div class="no-eventos">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
          </svg>
          <p>No hay eventos programados</p>
          <button class="btn-small btn-primary" onclick="calendario.openModal()">
            Agregar evento
          </button>
        </div>
      `;
      return;
    }

    // Renderizar eventos
    listaEl.innerHTML = dayEvents.map(evento => this.createEventoListItem(evento)).join('');
  }

  createEventoListItem(evento) {
    const tipoEmojis = {
      estudio: '📚',
      examen: '📝',
      tarea: '📋',
      revision: '🔍',
      descanso: '☕'
    };

    const prioridadClasses = {
      baja: 'priority-low',
      media: 'priority-medium',
      alta: 'priority-high'
    };

    const horaFin = this.calculateEndTime(evento.horaInicio, evento.duracion);

    return `
      <div class="evento-item ${prioridadClasses[evento.prioridad]}" data-id="${evento.id}">
        <div class="evento-header">
          <div class="evento-tipo">${tipoEmojis[evento.tipo] || '📅'}</div>
          <div class="evento-time">${evento.horaInicio} - ${horaFin}</div>
          <div class="evento-actions">
            <button class="btn-icon" onclick="calendario.editEvento('${evento.id}')" title="Editar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="btn-icon btn-danger" onclick="calendario.deleteEvento('${evento.id}')" title="Eliminar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="evento-title">${evento.titulo}</div>
        ${evento.descripcion ? `<div class="evento-description">${evento.descripcion}</div>` : ''}
        <div class="evento-duration">${evento.duracion} minutos</div>
      </div>
    `;
  }

  loadTodaysEvents() {
    this.selectedDate = new Date();
    this.updateSelectedDateEvents();
  }

  openModal(evento = null) {
    const modal = document.getElementById('modalEvento');
    const form = document.getElementById('formEvento');
    const title = document.getElementById('modalTitle');
    
    if (!modal || !form) return;

    // Limpiar formulario
    form.reset();
    
    if (evento) {
      // Modo edición
      title.textContent = 'Editar Evento';
      this.fillFormWithEvento(evento);
      form.dataset.editId = evento.id;
    } else {
      // Modo creación
      title.textContent = 'Nuevo Evento de Estudio';
      delete form.dataset.editId;
      
      // Pre-llenar con fecha seleccionada si existe
      if (this.selectedDate) {
        const dateInput = document.getElementById('eventoFecha');
        if (dateInput) {
          dateInput.value = this.selectedDate.toISOString().split('T')[0];
        }
      }
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    const modal = document.getElementById('modalEvento');
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  fillFormWithEvento(evento) {
    document.getElementById('eventoTitulo').value = evento.titulo || '';
    document.getElementById('eventoTipo').value = evento.tipo || '';
    document.getElementById('eventoFecha').value = evento.fecha || '';
    document.getElementById('eventoDuracion').value = evento.duracion || 60;
    document.getElementById('eventoHoraInicio').value = evento.horaInicio || '';
    document.getElementById('eventoPrioridad').value = evento.prioridad || 'media';
    document.getElementById('eventoDescripcion').value = evento.descripcion || '';
    document.getElementById('eventoRecordatorio').checked = evento.recordatorio || false;
  }

  handleSubmitEvento(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const evento = {
      id: e.target.dataset.editId || this.generateId(),
      titulo: formData.get('titulo'),
      tipo: formData.get('tipo'),
      fecha: formData.get('fecha'),
      duracion: parseInt(formData.get('duracion')),
      horaInicio: formData.get('horaInicio'),
      prioridad: formData.get('prioridad'),
      descripcion: formData.get('descripcion'),
      recordatorio: formData.has('recordatorio'),
      createdAt: new Date().toISOString()
    };

    // Validaciones
    if (!this.validateEvento(evento)) return;

    // Verificar conflictos de horario
    if (this.hasTimeConflict(evento)) {
      this.showNotification('Ya tienes un evento programado en ese horario', 'error');
      return;
    }

    if (e.target.dataset.editId) {
      // Actualizar evento existente
      const index = this.eventos.findIndex(ev => ev.id === e.target.dataset.editId);
      if (index !== -1) {
        this.eventos[index] = evento;
        this.showNotification('Evento actualizado correctamente', 'success');
      }
    } else {
      // Crear nuevo evento
      this.eventos.push(evento);
      this.showNotification('Evento creado correctamente', 'success');
    }

    this.saveEventos();
    this.renderCalendar();
    this.updateSelectedDateEvents();
    this.closeModal();
  }

  validateEvento(evento) {
    if (!evento.titulo.trim()) {
      this.showNotification('El título es obligatorio', 'error');
      return false;
    }
    
    if (!evento.tipo) {
      this.showNotification('Selecciona un tipo de actividad', 'error');
      return false;
    }
    
    if (!evento.fecha) {
      this.showNotification('La fecha es obligatoria', 'error');
      return false;
    }
    
    if (!evento.horaInicio) {
      this.showNotification('La hora de inicio es obligatoria', 'error');
      return false;
    }
    
    if (evento.duracion < 15 || evento.duracion > 480) {
      this.showNotification('La duración debe estar entre 15 y 480 minutos', 'error');
      return false;
    }

    return true;
  }

  hasTimeConflict(newEvento) {
    const newStart = new Date(`${newEvento.fecha}T${newEvento.horaInicio}`);
    const newEnd = new Date(newStart.getTime() + newEvento.duracion * 60000);

    return this.eventos.some(evento => {
      if (evento.id === newEvento.id) return false; // Ignorar el mismo evento al editar
      
      if (evento.fecha !== newEvento.fecha) return false; // Diferentes días
      
      const existingStart = new Date(`${evento.fecha}T${evento.horaInicio}`);
      const existingEnd = new Date(existingStart.getTime() + evento.duracion * 60000);
      
      // Verificar solapamiento
      return (newStart < existingEnd && newEnd > existingStart);
    });
  }

  editEvento(id) {
    const evento = this.eventos.find(ev => ev.id === id);
    if (evento) {
      this.openModal(evento);
    }
  }

  deleteEvento(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      this.eventos = this.eventos.filter(ev => ev.id !== id);
      this.saveEventos();
      this.renderCalendar();
      this.updateSelectedDateEvents();
      this.showNotification('Evento eliminado correctamente', 'success');
    }
  }

  updateEndTime() {
    const horaInicio = document.getElementById('eventoHoraInicio')?.value;
    const duracion = document.getElementById('eventoDuracion')?.value;
    
    if (horaInicio && duracion) {
      const endTime = this.calculateEndTime(horaInicio, parseInt(duracion));
      
      // Mostrar hora de fin en algún lugar del formulario si es necesario
      const endTimeDisplay = document.querySelector('.end-time-display');
      if (endTimeDisplay) {
        endTimeDisplay.textContent = `Termina a las ${endTime}`;
      }
    }
  }

  calculateEndTime(startTime, durationMinutes) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, minutes, 0, 0);
    
    const end = new Date(start.getTime() + durationMinutes * 60000);
    
    return end.toTimeString().slice(0, 5);
  }

  // Utilidades
  isToday(date) {
    const today = new Date();
    return this.isSameDay(date, today);
  }

  isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Persistencia
  saveEventos(eventos = null) {
    try {
      const eventosToSave = eventos || this.eventos;
      localStorage.setItem('studyai_eventos', JSON.stringify(eventosToSave));
      if (eventos) {
        this.eventos = eventos;
      }
    } catch (error) {
      console.error('Error guardando eventos:', error);
      this.showNotification('Error al guardar eventos', 'error');
    }
  }

  loadEventos() {
    try {
      const stored = localStorage.getItem('studyai_eventos');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error cargando eventos:', error);
      return [];
    }
  }

  // Crear eventos de muestra
  createSampleEvents() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const sampleEvents = [
      {
        id: 'sample-1',
        titulo: 'Estudio de Matemáticas',
        tipo: 'estudio',
        fecha: today.toISOString().split('T')[0],
        duracion: 90,
        horaInicio: '09:00',
        prioridad: 'alta',
        descripcion: 'Repaso de álgebra lineal y cálculo diferencial',
        recordatorio: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-2',
        titulo: 'Examen de Historia',
        tipo: 'examen',
        fecha: tomorrow.toISOString().split('T')[0],
        duracion: 120,
        horaInicio: '14:00',
        prioridad: 'alta',
        descripcion: 'Examen sobre la Segunda Guerra Mundial',
        recordatorio: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'sample-3',
        titulo: 'Proyecto de Programación',
        tipo: 'tarea',
        fecha: nextWeek.toISOString().split('T')[0],
        duracion: 180,
        horaInicio: '10:00',
        prioridad: 'media',
        descripcion: 'Desarrollo de aplicación web con JavaScript',
        recordatorio: false,
        createdAt: new Date().toISOString()
      }
    ];

    // Guardar eventos de muestra
    this.saveEventos(sampleEvents);
    return sampleEvents;
  }

  // Notificaciones
  showNotification(message, type = 'info') {
    // Si existe el módulo UI global, usar eso
    if (window.app && window.app.uiModule) {
      window.app.uiModule.showNotification(message, type);
      return;
    }

    // Fallback: crear notificación simple
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Inicializar calendario solo cuando la página del calendario está cargada
let calendario;

function initializeCalendar() {
  // Solo inicializar si los elementos del calendario están presentes
  if (document.getElementById('calendarGrid') && !calendario) {
    try {
      calendario = new CalendarioStudyAI();
      window.calendario = calendario;
      console.log('Calendario inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando calendario:', error);
    }
  }
}

// Exponer funciones globalmente
window.initializeCalendar = initializeCalendar;
window.calendario = calendario;

// Auto-inicializar si los elementos ya están presentes
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCalendar);
} else {
  // Dar un pequeño delay para que los elementos se carguen
  setTimeout(initializeCalendar, 100);
}