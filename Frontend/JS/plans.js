// Gestión de Planes de Estudio (CRUD) usando endpoints /api/study

let editingPlanId = null;

// Exponer inicializador idempotente para que main.js lo invoque al cargar la sección
window.__initPlans = function initPlansSection() {
  try {
    attachEvents();
  } catch(_) {}
  loadPlans();
};

function ensureFlatpickr(readyCb) {
  const cssId = 'flatpickr-css';
  if (!document.getElementById(cssId)) {
    const link = document.createElement('link');
    link.id = cssId; link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css';
    document.head.appendChild(link);
  }
  const jsId = 'flatpickr-js';
  if (!document.getElementById(jsId)) {
    const s = document.createElement('script');
    s.id = jsId; s.src = 'https://cdn.jsdelivr.net/npm/flatpickr';
    s.onload = () => readyCb && readyCb();
    document.body.appendChild(s);
  } else {
    readyCb && readyCb();
  }
}

function attachEvents() {
  const btn = document.getElementById('btnNewPlan');
  const form = document.getElementById('planForm');
  const cancel = document.getElementById('pCancel');
  const save = document.getElementById('pSave');

  if (btn) btn.addEventListener('click', () => {
    editingPlanId = null;
    form.style.display = '';
    clearForm();
    try { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(_) {}
  });
  if (cancel) cancel.addEventListener('click', () => {
    form.style.display = 'none';
    editingPlanId = null;
  });
  if (save) save.addEventListener('click', savePlan);
}

function clearForm() {
  document.getElementById('pTitle').value = '';
  document.getElementById('pDesc').value = '';
  document.getElementById('pStart').value = '';
  document.getElementById('pEnd').value = '';
  document.getElementById('pEmail').checked = false;
  document.getElementById('pWhats').checked = false;
}

async function loadPlans() {
  const container = document.getElementById('plansContainer');
  if (!container) return;
  container.innerHTML = 'Cargando...';
  try {
    const resp = await apiCall('/api/study/plans');
    if (!resp || !resp.ok) throw new Error('No se pudieron cargar los planes');
    const { plans } = await resp.json();
    renderPlans(plans || []);
  } catch (e) {
    container.innerHTML = '<p>Error al cargar planes. <button class="btn-small" id="retryPlans">Reintentar</button></p>';
    const retry = document.getElementById('retryPlans');
    if (retry) retry.addEventListener('click', loadPlans);
  }
}

function renderPlans(plans) {
  const container = document.getElementById('plansContainer');
  if (!container) return;
  if (!plans.length) {
    container.innerHTML = '<p>No tienes planes aún. Crea uno nuevo.</p>';
    return;
  }

  container.innerHTML = '';
  plans.forEach(p => container.appendChild(renderPlanCard(p)));
}

function renderPlanCard(plan) {
  const card = document.createElement('div');
  card.className = 'plan-card';
  card.innerHTML = `
    <div class="plan-head">
      <div>
        <h3>${escapeHtml(plan.title)}</h3>
        <small>${escapeHtml(plan.description || '')}</small>
      </div>
      <div class="actions">
        <button class="btn-small" data-edit="${plan.id}">Editar</button>
        <button class="btn-small btn-ghost" data-delete="${plan.id}">Eliminar</button>
      </div>
    </div>
    <div class="plan-meta">
      <span>Inicio: ${plan.start_date || '-'}</span>
      <span>Fin: ${plan.end_date || '-'}</span>
      <span>Notificaciones: ${plan.notify_by_email ? 'Email ' : ''}${plan.notify_by_whatsapp ? 'WhatsApp' : ''}</span>
    </div>
    <div class="plan-tasks">
      <h4>Tareas</h4>
      ${(plan.plan_tasks || []).length ? '' : '<p>Sin tareas</p>'}
      <ul>
        ${(plan.plan_tasks || []).map(t => `
          <li>
            <span>${t.completed ? '✓' : '•'} ${escapeHtml(t.title)}</span>
            <small>${t.due_date || ''} ${t.due_at || ''}</small>
          </li>`).join('')}
      </ul>
      <button class="btn-small" data-add-task="${plan.id}">Agregar tarea</button>
    </div>
  `;

  // Editar
  card.querySelector(`[data-edit="${plan.id}"]`).addEventListener('click', () => startEditPlan(plan));
  // Eliminar
  card.querySelector(`[data-delete="${plan.id}"]`).addEventListener('click', () => deletePlan(plan.id));
  // Agregar tarea
  card.querySelector(`[data-add-task="${plan.id}"]`).addEventListener('click', () => showPlanQuickTaskForm(plan.id));
  return card;
}

function startEditPlan(plan) {
  editingPlanId = plan.id;
  const form = document.getElementById('planForm');
  form.style.display = '';
  try { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch(_) {}
  document.getElementById('pTitle').value = plan.title || '';
  document.getElementById('pDesc').value = plan.description || '';
  document.getElementById('pStart').value = plan.start_date || '';
  document.getElementById('pEnd').value = plan.end_date || '';
  document.getElementById('pEmail').checked = !!plan.notify_by_email;
  document.getElementById('pWhats').checked = !!plan.notify_by_whatsapp;
}

async function savePlan() {
  const payload = {
    title: document.getElementById('pTitle').value.trim(),
    description: document.getElementById('pDesc').value.trim(),
    start_date: document.getElementById('pStart').value || null,
    end_date: document.getElementById('pEnd').value || null,
    notify_by_email: document.getElementById('pEmail').checked,
    notify_by_whatsapp: document.getElementById('pWhats').checked
  };
  if (!payload.title || !payload.start_date || !payload.end_date) {
    alert('Título, fecha de inicio y fecha de fin son requeridos');
    return;
  }
  let resp;
  if (editingPlanId) {
    resp = await apiCall(`/api/study/plans/${editingPlanId}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    resp = await apiCall('/api/study/plans', { method: 'POST', body: JSON.stringify(payload) });
  }
  if (!resp || !resp.ok) { 
    showToast('No se pudo guardar el plan', 'error');
    return; 
  }
  showToast('Plan guardado exitosamente', 'success');
  document.getElementById('planForm').style.display = 'none';
  editingPlanId = null;
  loadPlans();
}

async function deletePlan(planId) {
  if (!confirm('¿Eliminar este plan?')) return;
  const resp = await apiCall(`/api/study/plans/${planId}`, { method: 'DELETE' });
  if (!resp || !resp.ok) { 
    showToast('No se pudo eliminar el plan', 'error');
    return; 
  }
  showToast('Plan eliminado exitosamente', 'success');
  loadPlans();
}

function showPlanQuickTaskForm(planId) {
  // Crear formulario flotante rápido (reusa estilos de quick-task-form del calendario)
  const form = document.createElement('div');
  form.className = 'quick-task-form';
  form.innerHTML = `
    <div class="quick-form-header">
      <h4>Nueva tarea</h4>
      <button class="close-btn" id="qClose">×</button>
    </div>
    <input id="qTitle" placeholder="Título de la tarea" />
    <input id="qDate" type="text" placeholder="Fecha" />
    <input id="qTime" type="text" placeholder="Hora (HH:MM)" />
    <textarea id="qDesc" placeholder="Descripción (opcional)" style="width:100%;min-height:70px;"></textarea>
    <div class="quick-form-actions">
      <button id="qSave" class="btn-small">Guardar</button>
      <button id="qCancel" class="btn-small btn-ghost">Cancelar</button>
    </div>
  `;
  // Overlay simple
  const overlay = document.createElement('div');
  overlay.className = 'global-overlay';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(0,0,0,0.55)';
  overlay.style.zIndex = '1500';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.appendChild(form);
  document.body.appendChild(overlay);
  try { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(_) {}

  const remove = () => document.body.contains(overlay) && overlay.remove();
  form.querySelector('#qClose').addEventListener('click', remove);
  form.querySelector('#qCancel').addEventListener('click', remove);

  // Inicializar datepicker cómodo (como en calendario)
  ensureFlatpickr(() => {
    if (window.flatpickr) {
      // Date picker
      window.flatpickr(form.querySelector('#qDate'), {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd/m/Y'
      });
      // Time picker
      window.flatpickr(form.querySelector('#qTime'), {
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        defaultHour: 9,
        defaultMinute: 0
      });
    }
  });
  form.querySelector('#qSave').addEventListener('click', async () => {
    const title = (form.querySelector('#qTitle').value || '').trim();
    const rawDate = (form.querySelector('#qDate').value || '').trim();
    const rawTime = (form.querySelector('#qTime').value || '').trim();
    const desc = (form.querySelector('#qDesc').value || '').trim();
    if (!title) { alert('Ingresa un título'); return; }
    if (!rawDate) { alert('Ingresa una fecha'); return; }
    const isoDate = normalizeToISODate(rawDate);
    if (!isoDate) { alert('Fecha inválida. Usa YYYY-MM-DD o DD/MM/YYYY'); return; }
    const hhmm = rawTime || null;
    const resp = await apiCall(`/api/study/plans/${planId}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, description: desc, due_date: isoDate, due_at: hhmm })
    });
    if (!resp || !resp.ok) { 
      showToast('No se pudo crear la tarea', 'error');
      return; 
    }
    showToast('Tarea creada exitosamente', 'success');
    remove();
    loadPlans();
  });
}

function normalizeToISODate(input) {
  // Acepta 'YYYY-MM-DD' o 'DD/MM/YYYY' y devuelve 'YYYY-MM-DD'
  const s = String(input).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/](\d{1,2})[\/]((?:\d{2}){1,2})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    const y = parseInt(m[3].length === 2 ? ('20' + m[3]) : m[3], 10);
    if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dd = String(d).padStart(2, '0');
    const mm = String(mo).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  }
  return null;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Función para mostrar toasts (reutilizada de home.js)
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


