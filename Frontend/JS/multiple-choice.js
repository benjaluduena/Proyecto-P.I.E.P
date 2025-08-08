const urlParams = new URLSearchParams(window.location.search);
const outputId = urlParams.get('outputId');
const fileName = urlParams.get('fileName');

const mcMeta = document.getElementById('mcMeta');
const mcStats = document.getElementById('mcStats');
const mcList = document.getElementById('mcList');

function renderMC(data) {
  const preguntas = Array.isArray(data?.preguntas) ? data.preguntas : [];
  mcStats.textContent = `Preguntas: ${preguntas.length}`;

  mcList.innerHTML = preguntas.map((q, idx) => {
    const opciones = Array.isArray(q.opciones) ? q.opciones.slice(0, 4) : ['', '', '', ''];
    const correctIndex = typeof q.respuesta === 'number' ? q.respuesta : 0;
    const optionLetter = (i) => ['A', 'B', 'C', 'D'][i];
    return `
    <article class="vf-card" tabindex="0" role="group" aria-label="Pregunta ${idx + 1}">
      <header class="vf-card-title">
        <h3 style="margin:0; font-size:16px; line-height:1.3;">${idx + 1}. ${q.enunciado || ''}</h3>
        <span class="vf-chip v">${optionLetter(correctIndex)}</span>
      </header>
      <ol style="margin:0; padding-left: 18px; display:grid; gap:6px;">
        ${opciones.map((op, i) => `
          <li style="list-style: upper-alpha;">
            <span style="${i === correctIndex ? 'font-weight:700; color:#0369a1;' : ''}">${op || ''}</span>
          </li>
        `).join('')}
      </ol>
      ${q.explicacion ? `<p class="vf-explain" style="display:block;">${q.explicacion}</p>` : ''}
    </article>
    `;
  }).join('');
}

async function loadMC() {
  try {
    mcMeta.textContent = `Archivo: ${fileName || 'Documento PDF'} · Generado ahora`;
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
      mcList.innerHTML = '<p style="color:#6b7280;">No se recibieron preguntas. Intenta regenerar el examen.</p>';
      return;
    }
    renderMC(data);
  } catch (e) {
    mcList.innerHTML = `<p style="color:#b91c1c;">${e.message}</p>`;
  }
}

document.addEventListener('DOMContentLoaded', loadMC);
document.querySelector('.back-btn').addEventListener('click', () => { window.location.href = '/index.html'; });
document.getElementById('downloadBtn').addEventListener('click', () => window.print());
document.getElementById('shareBtn').addEventListener('click', () => {
  if (navigator.share) navigator.share({ title: 'Multiple Choice generado', url: window.location.href });
  else { navigator.clipboard.writeText(window.location.href); alert('URL copiada al portapapeles'); }
});


