const uploadBox = document.querySelector('.upload-box');
const uploadText = document.querySelector('.upload-text');
const fileInput = document.querySelector('.file-input');
const loadingOverlay = document.getElementById("loadingOverlay")
const cardActionBtns = document.querySelectorAll('.card-action-btn');
const cards = document.querySelectorAll('.card');
const uploadedFilesContainer = document.getElementById('uploadedFilesContainer');
const calendarModal = document.getElementById('calendarModal');
const btnCloseCalendar = document.getElementById('btnCloseCalendar');
const btnNewTask = document.getElementById('btnNewTask');
const btnNewPlanToggle = document.getElementById('btnNewPlanToggle');
const newPlanContainer = document.getElementById('newPlanContainer');
const btnSavePlan = document.getElementById('btnSavePlan');
const btnCancelPlan = document.getElementById('btnCancelPlan');
const managePlansContainer = document.getElementById('managePlansContainer');
const plansList = document.getElementById('plansList');
const taskFormContainer = document.getElementById('taskFormContainer');
const btnSaveTask = document.getElementById('btnSaveTask');
const btnDeleteTask = document.getElementById('btnDeleteTask');
const btnCancelTask = document.getElementById('btnCancelTask');
let currentTaskId = null;

cards.forEach(card => card.classList.add('disabled'));

// Arrastrar encima
uploadBox.addEventListener('dragover', e => {
  e.preventDefault();
  uploadBox.classList.add('hover');
});

// Salir del área
uploadBox.addEventListener('dragleave', e => {
  e.preventDefault();
  uploadBox.classList.remove('hover');
});

// Soltar archivo
uploadBox.addEventListener('drop', e => {
  e.preventDefault();
  uploadBox.classList.remove('hover');

  const files = e.dataTransfer.files;

  if (files.length > 1) {
    alert('Solo se permite subir un archivo PDF.');
    resetFileInput();
    return;
  }

  if (files[0].type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    resetFileInput();
    return;
  }

  fileInput.files = files;
  mostrarArchivos(files);
});



// Manejar selección de archivo
fileInput.addEventListener('change', () => {
  const files = fileInput.files;

  if (files.length > 1) {
    alert('Solo se permite subir un archivo PDF.');
    resetFileInput();
    return;
  }

  if (files.length && files[0].type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    resetFileInput();
    return;
  }

  if (files.length) {
    mostrarArchivos(files);
  } else {
    uploadText.textContent = "Ningún archivo válido";
    cards.forEach(card => card.classList.add('disabled'));
  }
});

// Resetear input de archivo

function resetFileInput() {
  fileInput.value = '';
  uploadedFilesContainer.innerHTML = '';
  uploadText.textContent = "Ningún archivo seleccionado";
  cards.forEach(card => card.classList.add('disabled'));
}


// Mostrar archivos
function mostrarArchivos(files) {
  uploadedFilesContainer.innerHTML = '';
  uploadText.textContent = `${files.length} archivo(s) cargado(s)`;
  cards.forEach(card => card.classList.remove('disabled'));

  [...files].forEach((file, index) => {
    const fileDiv = document.createElement('div');
    fileDiv.className = 'uploaded-file';
    fileDiv.innerHTML = `
      <span title="${file.name}">${file.name} <small>(${file.type || 'desconocido'})</small></span>
      <button class="remove-btn" data-index="${index}">❌</button>
    `;
    uploadedFilesContainer.appendChild(fileDiv);
  });

  // Manejar eliminar archivo (esto borra todo porque input.files es readonly)
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      fileInput.value = '';
      uploadedFilesContainer.innerHTML = '';
      uploadText.textContent = "Ningún archivo seleccionado";
      cards.forEach(card => card.classList.add('disabled'));
    });
  });
}


// Manejar clics en botones de acción de tarjetas

cardActionBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    // Solo continuar si hay archivo cargado
    if (fileInput.files.length === 0) {
      showInfoMessage("Primero debes subir un archivo PDF.");
      return;
    }

    loadingOverlay.classList.add("show");

    const card = btn.closest(".card");
    const type = card?.dataset.type;

    try {
      if (type === "resumen") {
        // Subir PDF y generar resumen
        const formData = new FormData();
        formData.append('pdf', fileInput.files[0]);
        
        const response = await apiCall('/api/pdfs/upload', {
          method: 'POST',
          body: formData,
          headers: {
            // Remover Content-Type para FormData
            'Authorization': getAuthHeaders().Authorization
          }
        });

        if (!response || !response.ok) {
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        // Generar resumen con IA
        const summaryResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'resumen' })
        });

        if (!summaryResponse || !summaryResponse.ok) {
          throw new Error('Error al generar el resumen');
        }

        const { output } = await summaryResponse.json();

        // Redirigir a la página de resumen con los datos
        const params = new URLSearchParams({
          pdfId: pdfId,
          outputId: output.id,
          fileName: fileInput.files[0].name
        });
        
        window.location.href = `/Frontend/resumen.html?${params.toString()}`;
        return;
      }

      if (type === "verdadero-falso") {
        // Subir PDF y generar preguntas de verdadero/falso
        const formData = new FormData();
        formData.append('pdf', fileInput.files[0]);

        const response = await apiCall('/api/pdfs/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': getAuthHeaders().Authorization
          }
        });

        if (!response || !response.ok) {
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        // Generar verdadero/falso con IA
        const vfResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'verdadero_falso' })
        });

        if (!vfResponse || !vfResponse.ok) {
          throw new Error('Error al generar las preguntas de Verdadero/Falso');
        }

        const { output } = await vfResponse.json();

        // Redirigir a la vista de verdadero/falso
        const params = new URLSearchParams({
          pdfId: String(pdfId),
          outputId: String(output.id),
          fileName: fileInput.files[0].name
        });
        window.location.href = `/verdadero-falso.html?${params.toString()}`;
        return;
      }

      if (type === "multiple-choice") {
        const formData = new FormData();
        formData.append('pdf', fileInput.files[0]);

        const response = await apiCall('/api/pdfs/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': getAuthHeaders().Authorization
          }
        });

        if (!response || !response.ok) {
          throw new Error('Error al subir el PDF');
        }

        const { pdf } = await response.json();
        const pdfId = pdf.id;

        const mcResponse = await apiCall(`/api/ai/generate/${pdfId}`, {
          method: 'POST',
          body: JSON.stringify({ type: 'multiple_choice' })
        });

        if (!mcResponse || !mcResponse.ok) {
          throw new Error('Error al generar el examen Multiple Choice');
        }

        const { output } = await mcResponse.json();

        const params = new URLSearchParams({
          pdfId: String(pdfId),
          outputId: String(output.id),
          fileName: fileInput.files[0].name
        });
        window.location.href = `/multiple-choice.html?${params.toString()}`;
        return;
      }

      // Para otros tipos de contenido (mantener lógica existente)
      setTimeout(() => {
        loadingOverlay.classList.remove("show");
        if (type) {
          showSuccessMessage(type);
        } else {
          showInfoMessage("¡Proceso completado!");
        }
      }, 3000);

    } catch (error) {
      console.error('Error:', error);
      loadingOverlay.classList.remove("show");
      showNotification(`Error: ${error.message}`, "error");
    }
  });
});


// Mostrar mensajes de éxito o información

function showSuccessMessage(type) {
  const messages = {
    "verdadero-falso": "¡Preguntas de Verdadero/Falso generadas exitosamente!",
    resumen: "¡Resumen creado exitosamente!",
    "multiple-choice": "¡Examen de opción múltiple generado exitosamente!",
  };

  showNotification(messages[type] || "¡Proceso exitoso!", "success");
}

function showInfoMessage(message) {
  showNotification(message, "info");
}

function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
  const bgColor =
    type === "success"
      ? "linear-gradient(135deg, #00b894, #00a085)"
      : type === "error"
      ? "linear-gradient(135deg, #e74c3c, #c0392b)"
      : "linear-gradient(135deg, #0984e3, #74b9ff)";

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icon}</div>
      <div class="notification-text">${message}</div>
    </div>
  `;

  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 1001;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    max-width: 300px;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = "translateX(0)";
  }, 100);

  setTimeout(() => {
    notification.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 4000);
}

// ==================== CALENDARIO ====================
// Cargar FullCalendar desde CDN si no está presente
(function ensureCalendarAssets() {
  const cssId = 'fullcalendar-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.css';
    document.head.appendChild(link);
  }
  const jsId = 'fullcalendar-js';
  if (!document.getElementById(jsId)) {
    const script = document.createElement('script');
    script.id = jsId;
    script.src = 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.11/index.global.min.js';
    document.body.appendChild(script);
  }
})();

// Abrir calendario cuando se haga clic en el botón del menú (ícono calendario)
// Buscamos el botón por el icono en la sidebar y asignamos el listener de forma robusta
function asignarBotonCalendario() {
  const botones = document.querySelectorAll('.menu .menu-item');
  for (let btn of botones) {
    const svg = btn.querySelector('use');
    const isCalendarIcon = svg && svg.getAttribute('href') && svg.getAttribute('href').includes('icon-calendar');
    const isCalendarText = (btn.textContent || '').trim().toLowerCase().includes('calendario');
    if (isCalendarIcon || isCalendarText) {
      btn.removeEventListener('click', openCalendar);
      btn.addEventListener('click', openCalendar);
      break;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', asignarBotonCalendario);
} else {
  asignarBotonCalendario();
}

function openCalendar() {
  // Reconsultar el modal por si fue re-renderizado
  const modal = document.getElementById('calendarModal');
  if (!modal) {
    if (typeof cargarSeccion === 'function') {
      cargarSeccion('home');
      setTimeout(openCalendar, 400);
    }
    return;
  }
  modal.classList.add('show');
  initCalendarWhenReady();
}

btnCloseCalendar?.addEventListener('click', () => {
  calendarModal?.classList.remove('show');
  // Cerrar formularios flotantes si quedaron abiertos
  document.querySelectorAll('.quick-task-form').forEach(el => el.remove());
  document.querySelectorAll('.quick-task-menu').forEach(el => el.remove());
});

btnCancelTask?.addEventListener('click', () => {
  taskFormContainer.style.display = 'none';
  currentTaskId = null;
});

let calendarInstance = null;

function initCalendarWhenReady() {
  if (window.FullCalendar) {
    initDatePickers();
    initCalendar();
  } else {
    setTimeout(initCalendarWhenReady, 200);
  }
}

function initDatePickers() {
  // Cargar flatpickr desde CDN si es necesario
  const cssId = 'flatpickr-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId;
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
    document.head.appendChild(link);
  }
  const jsId = 'flatpickr-js';
  if (!document.getElementById(jsId)) {
    const s = document.createElement('script');
    s.id = jsId;
    s.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
    document.body.appendChild(s);
  }

  // Inicializar cuando esté disponible
  (function waitFP(){
    if (window.flatpickr) {
      const optsDate = { dateFormat: 'Y-m-d' };
      const optsDateTime = { enableTime: true, time_24hr: true, dateFormat: 'Y-m-d H:i' };
      const planStart = document.getElementById('planStart');
      const planEnd = document.getElementById('planEnd');
      const due = document.getElementById('taskDueDate');
      const rem = document.getElementById('remDateTime');
      if (planStart) window.flatpickr(planStart, optsDate);
      if (planEnd) window.flatpickr(planEnd, optsDate);
      if (due) window.flatpickr(due, optsDateTime);
      if (rem) window.flatpickr(rem, optsDateTime);
    } else {
      setTimeout(waitFP, 150);
    }
  })();
}

function parseDateTime(input) {
  if (!input) return null;
  // Si viene en formato 'Y-m-d H:i' lo convertimos a ISO local
  const d = new Date(input.replace(' ', 'T'));
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseDateOnly(input) {
  if (!input) return null;
  const d = new Date(input.replace(' ', 'T'));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

async function fetchTasks() {
  // Primero intentar endpoint dedicado /api/tasks
  try {
    const resp = await apiCall('/api/tasks');
    if (resp && resp.ok) {
      const { tasks } = await resp.json();
      return tasks || [];
    }
  } catch (e) {
    // seguir a fallback
  }
  // Fallback: obtener planes y aplanar sus tareas
  try {
    const resp2 = await apiCall('/api/study/plans');
    if (resp2 && resp2.ok) {
      const { plans } = await resp2.json();
      const tasks = [];
      (plans || []).forEach(p => {
        (p.plan_tasks || []).forEach(t => tasks.push({ ...t, plan_id: p.id }));
      });
      return tasks;
    }
  } catch (e) {}
  return [];
}

async function fetchPlans() {
  const resp = await apiCall('/api/study/plans');
  if (!resp || !resp.ok) return [];
  const { plans } = await resp.json();
  return plans || [];
}

function mapTasksToEvents(tasks) {
  return tasks.map(task => {
    let startStr;
    if (task.due_at) {
      const date = String(task.due_date).slice(0, 10);
      startStr = `${date}T${String(task.due_at).slice(0,5)}:00`;
    } else {
      startStr = String(task.due_date).length > 10 ? task.due_date : `${task.due_date}T00:00:00`;
    }
    const isOverdue = !task.completed && new Date(startStr) < new Date();
    return {
      id: task.id,
      title: task.completed ? '✓ ' + task.title : task.title,
      start: startStr,
      allDay: !task.due_at,
      extendedProps: {
        description: task.description,
        plan_id: task.plan_id,
        completed: task.completed,
        plan_title: task.plan_title,
        due_at: task.due_at
      },
      className: task.completed ? 'completed' : (isOverdue ? 'overdue' : ''),
      backgroundColor: task.completed ? '#4CAF50' : (isOverdue ? '#f44336' : '#2196F3'),
      borderColor: task.completed ? '#4CAF50' : (isOverdue ? '#f44336' : '#2196F3')
    };
  });
}

async function initCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  calendarInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    buttonText: {
      today: 'Hoy',
      month: 'Mes',
      week: 'Semana',
      day: 'Día'
    },
    locale: 'es',
    selectable: true,
    editable: false,
    events: async (info, success, failure) => {
      try {
        const tasks = await fetchTasks();
        success(mapTasksToEvents(tasks));
      } catch (e) {
        console.error('Error cargando eventos:', e);
        failure(e);
      }
    },
    dateClick: handleDateClick,
    eventClick: handleEventClick
  });

  calendarInstance.render();
  loadPlansIntoSelect();
}

async function loadPlansIntoSelect() {
  const plans = await fetchPlans();
  const select = document.getElementById('taskPlan');
  if (!select) return;
  select.innerHTML = '<option value="">Selecciona plan</option>' +
    plans.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
  // Tip UX: si no hay planes, mostrar el creador inline automáticamente
  if (!plans || plans.length === 0) {
    newPlanContainer.style.display = '';
    managePlansContainer.style.display = 'none';
  } else {
    renderPlansList(plans);
  }
}

function resetTaskForm() {
  currentTaskId = null;
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDescription').value = '';
  document.getElementById('taskDueDate').value = '';
  document.getElementById('taskPlan').value = '';
  document.getElementById('taskCompleted').checked = false;
  document.getElementById('remEmail').checked = false;
  document.getElementById('remWhatsapp').checked = false;
  document.getElementById('remDateTime').value = '';
  btnDeleteTask.style.display = 'none';
}

// Exponer edición de tarea desde el formulario rápido/menú
async function populateTaskForm(taskId) {
  try {
    const resp = await apiCall(`/api/tasks`);
    if (!resp || !resp.ok) return;
    const { tasks } = await resp.json();
    const t = tasks.find(x => String(x.id) === String(taskId));
    if (!t) return;
    currentTaskId = t.id;
    document.getElementById('taskTitle').value = t.title || '';
    document.getElementById('taskDescription').value = t.description || '';
    const dueInput = document.getElementById('taskDueDate');
    if (t.due_date) {
      const date = String(t.due_date).slice(0,10);
      const time = t.due_at ? String(t.due_at).slice(0,5) : '00:00';
      dueInput.value = `${date} ${time}`;
    } else {
      dueInput.value = '';
    }
    document.getElementById('taskPlan').value = t.plan_id || '';
    document.getElementById('taskCompleted').checked = !!t.completed;
    btnDeleteTask.style.display = '';
    taskFormContainer.style.display = '';
  } catch (e) {
    console.error('No se pudo cargar tarea:', e);
  }
}

// Cargar planes también al abrir el formulario de tarea
function showTaskForm(defaultDateTimeISO) {
  resetTaskForm();
  if (defaultDateTimeISO) {
    document.getElementById('taskDueDate').value = defaultDateTimeISO;
  }
  loadPlansIntoSelect();
  taskFormContainer.style.display = '';
}

function handleDateClick(info) {
  const clickedDate = info.dateStr;
  // Mostrar formulario rápido para nueva tarea
  showQuickTaskForm(clickedDate);
}

function handleEventClick(info) {
  const task = info.event;
  const taskId = task.id;
  // Mostrar menú contextual rápido
  showQuickTaskMenu(task, info.jsEvent);
}

function showQuickTaskMenu(event, mouseEvent) {
  const task = event;
  const taskId = task.id;
  const isCompleted = task.extendedProps.completed;
  
  // Crear menú contextual
  const menu = document.createElement('div');
  menu.className = 'quick-task-menu';
  menu.innerHTML = `
    <div class="menu-item" onclick="toggleTaskComplete(${taskId}, ${!isCompleted})">
      ${isCompleted ? '❌ Desmarcar' : '✅ Completar'}
    </div>
    <div class="menu-item" onclick="editTaskFromMenu(${taskId})">
      ✏️ Editar
    </div>
    <div class="menu-item" onclick="deleteTaskFromMenu(${taskId})">
      🗑️ Eliminar
    </div>
  `;
  
  // Posicionar menú
  menu.style.position = 'absolute';
  menu.style.left = mouseEvent.pageX + 'px';
  menu.style.top = mouseEvent.pageY + 'px';
  menu.style.zIndex = '1000';
  
  document.body.appendChild(menu);
  
  // Cerrar menú al hacer click fuera
  setTimeout(() => {
    document.addEventListener('click', function closeMenu() {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    });
  }, 100);
}

function toggleTaskComplete(taskId, completed) {
  // Guardar toggle en backend
  apiCall(`/api/study/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ completed }) })
    .then(resp => { if (resp && resp.ok) { calendarInstance.refetchEvents(); showToast('Actualizado', 'success'); } else { showToast('No se pudo actualizar', 'error'); }})
    .catch(() => showToast('No se pudo actualizar', 'error'));
}

function editTaskFromMenu(taskId) {
  populateTaskForm(taskId);
}

function deleteTaskFromMenu(taskId) {
  if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    deleteTask(taskId);
  }
}

function showQuickTaskForm(dateStr) {
  // Crear formulario flotante rápido
  const quickForm = document.createElement('div');
  quickForm.className = 'quick-task-form';
  quickForm.innerHTML = `
    <div class="quick-form-header">
      <h4>Nueva tarea para ${new Date(dateStr).toLocaleDateString()}</h4>
      <button onclick="this.parentElement.parentElement.remove()" class="close-btn">×</button>
    </div>
    <input id="quickTaskTitle" placeholder="Título de la tarea" />
    <select id="quickTaskPlan">
      <option value="">Sin plan</option>
    </select>
    <div class="quick-form-actions">
      <button onclick="saveQuickTask('${dateStr}')" class="btn-small">Guardar</button>
      <button onclick="this.parentElement.parentElement.remove()" class="btn-small btn-ghost">Cancelar</button>
    </div>
  `;
  
  // Posicionar formulario
  quickForm.style.position = 'fixed';
  quickForm.style.top = '50%';
  quickForm.style.left = '50%';
  quickForm.style.transform = 'translate(-50%, -50%)';
  quickForm.style.zIndex = '1000';
  
  document.body.appendChild(quickForm);
  
  // Cargar planes en el select
  loadPlansForQuickForm();
}

async function loadPlansForQuickForm() {
  try {
    const response = await fetch('/api/study/plans', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (response.ok) {
      const { plans } = await response.json();
      const select = document.getElementById('quickTaskPlan');
      (plans || []).forEach(plan => {
        const option = document.createElement('option');
        option.value = plan.id;
        option.textContent = plan.title;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading plans:', error);
  }
}

async function saveQuickTask(dateStr) {
  const title = document.getElementById('quickTaskTitle').value.trim();
  const planId = document.getElementById('quickTaskPlan').value;
  
  if (!title) {
    alert('Por favor ingresa un título para la tarea');
    return;
  }
  if (!planId) {
    alert('Selecciona un plan para la tarea');
    return;
  }
  
  try {
    const response = await fetch(`/api/study/plans/${planId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        title,
        description: '',
        due_date: parseDateOnly(dateStr),
        due_at: null
      })
    });
    
    if (response.ok) {
      document.querySelector('.quick-task-form').remove();
      calendarInstance.refetchEvents();
      showToast('Tarea creada exitosamente', 'success');
    } else {
      throw new Error('Error al crear tarea');
    }
  } catch (error) {
    console.error('Error:', error);
    showToast('Error al crear tarea', 'error');
  }
}

btnNewTask?.addEventListener('click', () => showTaskForm());

btnNewPlanToggle?.addEventListener('click', () => {
  const willShow = newPlanContainer.style.display === 'none';
  newPlanContainer.style.display = willShow ? '' : 'none';
  managePlansContainer.style.display = willShow ? 'none' : (plansList?.children?.length ? '' : 'none');
});

btnCancelPlan?.addEventListener('click', () => {
  newPlanContainer.style.display = 'none';
});

btnSavePlan?.addEventListener('click', async () => {
  const payload = {
    title: document.getElementById('planTitle').value.trim(),
    description: document.getElementById('planDescription').value.trim(),
    start_date: document.getElementById('planStart').value || null,
    end_date: document.getElementById('planEnd').value || null,
    notify_by_email: document.getElementById('planNotifyEmail').checked,
    notify_by_whatsapp: document.getElementById('planNotifyWhats').checked
  };
  if (!payload.title) { showToast('El título del plan es obligatorio', 'error'); return; }
  const resp = await apiCall('/api/study/plans', { method:'POST', body: JSON.stringify(payload) });
  if (!resp || !resp.ok) { showToast('No se pudo crear el plan', 'error'); return; }
  const { plan } = await resp.json();
  showToast('Plan creado exitosamente', 'success');
  newPlanContainer.style.display = 'none';
  // refrescar selector de planes y preseleccionar el nuevo
  await loadPlansIntoSelect();
  const select = document.getElementById('taskPlan');
  if (select && plan?.id) select.value = String(plan.id);
});

function renderPlansList(plans) {
  if (!plansList) return;
  plansList.innerHTML = '';
  managePlansContainer.style.display = '';
  plans.forEach(p => {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div>
        <strong>${p.title}</strong><br/>
        <small>${p.description || ''}</small>
      </div>
      <button class="btn-small btn-ghost" data-edit="${p.id}">Editar</button>
      <button class="btn-small btn-ghost" data-delete="${p.id}">Eliminar</button>
    `;
    plansList.appendChild(row);

    const editBtn = row.querySelector(`[data-edit="${p.id}"]`);
    const delBtn = row.querySelector(`[data-delete="${p.id}"]`);
    editBtn.addEventListener('click', () => openEditPlan(p));
    delBtn.addEventListener('click', () => deletePlan(p.id));
  });
}

function openEditPlan(plan) {
  // Mostrar formulario de edición reutilizando el bloque newPlanContainer como edit-form adyacente
  const edit = document.createElement('div');
  edit.className = 'edit-form';
  edit.innerHTML = `
    <div class="row"><input id="eTitle" value="${plan.title}" /><input id="eStart" type="date" value="${plan.start_date || ''}"></div>
    <div class="row"><textarea id="eDesc">${plan.description || ''}</textarea><input id="eEnd" type="date" value="${plan.end_date || ''}"></div>
    <div class="row">
      <label><input id="eEmail" type="checkbox" ${plan.notify_by_email ? 'checked' : ''}/> Email</label>
      <label><input id="eWhats" type="checkbox" ${plan.notify_by_whatsapp ? 'checked' : ''}/> WhatsApp</label>
    </div>
    <div class="actions"><button id="eSave" class="btn-small">Guardar</button><button id="eCancel" class="btn-small btn-ghost">Cancelar</button></div>
  `;
  // Insertar debajo de su fila
  const rows = plansList.querySelectorAll('.row');
  for (const r of rows) {
    if (r.querySelector(`[data-edit="${plan.id}"]`)) {
      // eliminar ediciones previas
      const prev = r.querySelector('.edit-form');
      if (prev) prev.remove();
      r.appendChild(edit);
      break;
    }
  }
  edit.querySelector('#eCancel').addEventListener('click', () => edit.remove());
  edit.querySelector('#eSave').addEventListener('click', async () => {
    const payload = {
      title: edit.querySelector('#eTitle').value.trim(),
      description: edit.querySelector('#eDesc').value.trim(),
      start_date: edit.querySelector('#eStart').value || null,
      end_date: edit.querySelector('#eEnd').value || null,
      notify_by_email: edit.querySelector('#eEmail').checked,
      notify_by_whatsapp: edit.querySelector('#eWhats').checked
    };
    if (!payload.title) { showToast('El título es obligatorio', 'error'); return; }
    const resp = await apiCall(`/api/study/plans/${plan.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    if (!resp || !resp.ok) { showToast('No se pudo actualizar el plan', 'error'); return; }
    showToast('Plan actualizado exitosamente', 'success');
    const plans = await fetchPlans();
    renderPlansList(plans);
    await loadPlansIntoSelect();
  });
}

async function deletePlan(planId) {
  if (!confirm('¿Eliminar este plan y sus tareas?')) return;
  const resp = await apiCall(`/api/study/plans/${planId}`, { method: 'DELETE' });
  if (!resp || !resp.ok) { showToast('No se pudo eliminar el plan', 'error'); return; }
  showToast('Plan eliminado exitosamente', 'success');
  const plans = await fetchPlans();
  renderPlansList(plans);
  await loadPlansIntoSelect();
}

btnSaveTask?.addEventListener('click', async () => {
  const payload = {
    plan_id: document.getElementById('taskPlan').value,
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDescription').value.trim(),
    due_date: parseDateOnly(document.getElementById('taskDueDate').value),
    due_at: (function(){
      const val = document.getElementById('taskDueDate').value.trim();
      const parts = val.split(' ');
      return parts.length > 1 ? parts[1].slice(0,5) : null; // HH:mm
    })(),
    completed: document.getElementById('taskCompleted').checked
  };
  if (!payload.plan_id || !payload.title || !payload.due_date) {
    showToast('Plan, Título y Fecha/Hora son obligatorios', 'error');
    return;
  }

  let resp;
  if (currentTaskId) {
    resp = await apiCall(`/api/study/tasks/${currentTaskId}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    resp = await apiCall(`/api/study/plans/${payload.plan_id}/tasks`, { method: 'POST', body: JSON.stringify(payload) });
  }
  if (!resp || !resp.ok) {
    showToast('No se pudo guardar la tarea', 'error');
    return;
  }
  const { task } = await resp.json();

  // Recordatorios
  const remindAt = parseDateTime(document.getElementById('remDateTime').value);
  const wantsEmail = document.getElementById('remEmail').checked;
  const wantsWhatsapp = document.getElementById('remWhatsapp').checked;
  if (remindAt && (wantsEmail || wantsWhatsapp)) {
    const selectedMethods = [];
    if (wantsEmail) selectedMethods.push('email');
    if (wantsWhatsapp) selectedMethods.push('whatsapp');
    for (const method of selectedMethods) {
      await apiCall('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          task_id: task.id,
          method,
          scheduled_at: remindAt
        })
      });
    }
  }

  showToast('Tarea guardada exitosamente', 'success');
  taskFormContainer.style.display = 'none';
  currentTaskId = null;
  calendarInstance.refetchEvents();
});

btnDeleteTask?.addEventListener('click', async () => {
  if (!currentTaskId) return;
  const resp = await apiCall(`/api/study/tasks/${currentTaskId}`, { method: 'DELETE' });
  if (!resp || !resp.ok) { showToast('No se pudo eliminar', 'error'); return; }
  showToast('Tarea eliminada exitosamente', 'success');
  taskFormContainer.style.display = 'none';
  currentTaskId = null;
  calendarInstance.refetchEvents();
});

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Animar entrada
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
