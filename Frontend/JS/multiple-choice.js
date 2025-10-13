const urlParams = new URLSearchParams(window.location.search);
const outputId = urlParams.get('outputId');
const fileName = urlParams.get('fileName');

const mcMeta = document.getElementById('mcMeta');
const questionCountEl = document.getElementById('questionCount');
const mcList = document.getElementById('mcQuestionsList');
const mcLoading = document.getElementById('mcLoadingState');
const mcContainer = document.getElementById('mcQuestionsContainer');
const totalQuestionsEl = document.getElementById('totalQuestions');
const currentQuestionEl = document.getElementById('currentQuestion');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressFill = document.getElementById('progressFill');

// Config de tiempos
const NEXT_DELAY_MS = 1500;
const FEEDBACK_DURATION_MS = 1500;

// Estado
let selections = [];
let evaluated = [];
let currentIndex = 0;

function updateProgress() {
  const total = document.querySelectorAll('.mc-question').length;
  if (totalQuestionsEl) totalQuestionsEl.textContent = String(total);
  if (currentQuestionEl) currentQuestionEl.textContent = String(currentIndex + 1);
  if (progressFill) {
    const pct = total > 0 ? Math.round(((currentIndex) / (total - 1)) * 100) : 0;
    progressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }
  if (prevBtn) prevBtn.disabled = currentIndex === 0;
  if (nextBtn) nextBtn.textContent = currentIndex === total - 1 ? 'Finalizar' : 'Siguiente';
}

function showQuestion(idx) {
  const questions = document.querySelectorAll('.mc-question');
  if (!questions.length) return;
  currentIndex = Math.max(0, Math.min(questions.length - 1, idx));
  questions.forEach((qEl, i) => {
    qEl.style.display = i === currentIndex ? '' : 'none';
    qEl.classList.toggle('current', i === currentIndex);
  });
  updateProgress();
}

function attachOptionHandlers() {
  const questions = document.querySelectorAll('.mc-question');
  questions.forEach((qEl, qIndex) => {
    const options = qEl.querySelectorAll('.mc-option');
    options.forEach((opEl, opIndex) => {
      opEl.addEventListener('click', () => {
        // Limpiar estados visuales previos
        options.forEach(o => o.classList.remove('selected', 'correct', 'incorrect'));
        const explain = qEl.querySelector('.vf-explain');
        if (explain && !evaluated[qIndex]) explain.style.display = 'none';
        // Marcar selección
        opEl.classList.add('selected');
        selections[qIndex] = opIndex;
        // Mover indicador de pregunta actual
        if (currentQuestionEl) currentQuestionEl.textContent = String(qIndex + 1);
      });
    });
  });
}

function renderMC(data) {
  const preguntas = Array.isArray(data?.preguntas) ? data.preguntas : [];
  if (questionCountEl) {
    questionCountEl.textContent = String(preguntas.length);
  }
  if (totalQuestionsEl) {
    totalQuestionsEl.textContent = String(preguntas.length);
  }
  if (currentQuestionEl) {
    currentQuestionEl.textContent = preguntas.length ? '1' : '0';
  }

  if (!mcList) return;
  mcList.innerHTML = preguntas.map((q, idx) => {
    const opciones = Array.isArray(q.opciones) ? q.opciones.slice(0, 4) : ['', '', '', ''];
    const correctIndex = typeof q.respuesta === 'number' ? q.respuesta : 0;
    const optionLetter = (i) => ['A', 'B', 'C', 'D'][i];
    return `
    <article class="mc-question" tabindex="0" role="group" aria-label="Pregunta ${idx + 1}" data-correct-index="${correctIndex}" style="display:none;">
      <div class="mc-question-header">
        <span class="mc-question-number">Pregunta ${idx + 1}</span>
        <h3 class="mc-question-text">${q.enunciado || ''}</h3>
      </div>
      <div class="mc-options">
        ${opciones.map((op, i) => `
          <div class="mc-option" data-index="${i}">
            <span class="option-letter">${optionLetter(i)}</span>
            <span>${op || ''}</span>
          </div>
        `).join('')}
      </div>
      ${q.explicacion ? `<p class="vf-explain" style="display:none; margin-top:12px;">${q.explicacion}</p>` : ''}
    </article>
    `;
  }).join('');

  // Inicializar estado y handlers
  selections = new Array(preguntas.length).fill(undefined);
  evaluated = new Array(preguntas.length).fill(false);
  attachOptionHandlers();
  // Mostrar la primera pregunta
  showQuestion(0);
}

function evaluateCurrent() {
  const questions = document.querySelectorAll('.mc-question');
  const qEl = questions[currentIndex];
  if (!qEl) return null;
  const selectedEl = qEl.querySelector('.mc-option.selected');
  if (!selectedEl) {
    // aviso sutil sin alert
    const existing = qEl.querySelector('.mc-feedback');
    if (!existing) {
      const fb = document.createElement('div');
      fb.className = 'mc-feedback';
      fb.textContent = 'Selecciona una opción para continuar';
      fb.style.cssText = 'margin-top:8px;color:#6b7280;font-size:0.9rem;';
      qEl.appendChild(fb);
      setTimeout(() => fb.remove(), 1500);
    }
    return null;
  }
  const selectedIdx = parseInt(selectedEl.dataset.index, 10);
  const correctIdx = parseInt(qEl.dataset.correctIndex, 10);
  const options = qEl.querySelectorAll('.mc-option');
  // Marcar resultado
  if (selectedIdx === correctIdx) {
    selectedEl.classList.add('correct');
    // feedback
    const fb = document.createElement('div');
    fb.className = 'mc-feedback';
    fb.textContent = '¡Correcto!';
    fb.style.cssText = 'margin-top:8px;color:#16a34a;font-weight:600;';
    qEl.appendChild(fb);
    setTimeout(() => fb.remove(), FEEDBACK_DURATION_MS);
  } else {
    selectedEl.classList.add('incorrect');
    const correctEl = qEl.querySelector(`.mc-option[data-index="${correctIdx}"]`);
    if (correctEl) correctEl.classList.add('correct');
    const fb = document.createElement('div');
    fb.className = 'mc-feedback';
    fb.textContent = 'Incorrecto';
    fb.style.cssText = 'margin-top:8px;color:#dc2626;font-weight:600;';
    qEl.appendChild(fb);
    setTimeout(() => fb.remove(), FEEDBACK_DURATION_MS);
  }
  const explain = qEl.querySelector('.vf-explain');
  if (explain) explain.style.display = 'block';
  evaluated[currentIndex] = true;
  return selectedIdx === correctIdx;
}

async function loadMC() {
  try {
    if (mcMeta) {
      mcMeta.textContent = `Archivo: ${fileName || 'Documento PDF'} · Generado ahora`;
    }
    if (!outputId) throw new Error('Falta outputId en la URL');
    const response = await apiCall(`/api/ai/content/${outputId}`);
    if (!response || !response.ok) throw new Error('No se pudo cargar el examen');
    const { output } = await response.json();
    let data;
    if (typeof output.content === 'string') {
      try { data = JSON.parse(output.content); } catch { data = {}; }
    } else {
      data = output.content || {};
    }
    if (!Array.isArray(data.preguntas)) data = { preguntas: [] };
    if (!data.preguntas.length) {
      if (mcList) {
        mcList.innerHTML = '<p style="color:#6b7280;">No se recibieron preguntas. Intenta regenerar el examen.</p>';
      }
      return;
    }
    // Render preguntas
    renderMC(data);
    // Mostrar contenedor y ocultar loading
    if (mcLoading) mcLoading.style.display = 'none';
    if (mcContainer) mcContainer.style.display = '';
  } catch (e) {
    if (mcList) {
      mcList.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', loadMC);

const backBtn = document.querySelector('.back-btn-modern');
if (backBtn) {
  backBtn.addEventListener('click', () => { window.location.href = '/index.html'; });
}

const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', () => window.print());
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', () => {
    if (navigator.share) navigator.share({ title: 'Multiple Choice generado', url: window.location.href });
    else { navigator.clipboard.writeText(window.location.href); alert('URL copiada al portapapeles'); }
  });
}

// Navegación
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    const target = currentIndex - 1;
    showQuestion(target);
  });
}
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    const total = document.querySelectorAll('.mc-question').length;
    // Si aún no evaluamos la pregunta actual, evaluar primero
    if (!evaluated[currentIndex]) {
      const res = evaluateCurrent();
      if (res === null) return; // no seleccionó opción
      // deshabilitar y mostrar estado
      nextBtn.disabled = true;
      nextBtn.textContent = 'Continuando...';
      if (currentIndex < total - 1) {
        setTimeout(() => {
          showQuestion(currentIndex + 1);
          nextBtn.disabled = false;
          nextBtn.textContent = currentIndex === total - 1 ? 'Finalizar' : 'Siguiente';
        }, NEXT_DELAY_MS);
      } else {
        // última pregunta: mantener feedback y luego re-habilitar
        setTimeout(() => {
          updateProgress();
          nextBtn.disabled = false;
          nextBtn.textContent = 'Finalizar';
        }, FEEDBACK_DURATION_MS);
      }
    } else {
      // ya evaluada, avanzar sin espera
      if (currentIndex < total - 1) showQuestion(currentIndex + 1);
    }
  });
}


