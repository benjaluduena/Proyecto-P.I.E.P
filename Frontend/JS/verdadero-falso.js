// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const pdfId = urlParams.get('pdfId');
const outputId = urlParams.get('outputId');
const fileName = urlParams.get('fileName');

const vfMeta = document.getElementById('vfMeta');
const vfList = document.getElementById('vfList');
const vfStats = document.getElementById('vfStats');
const toggleExplain = document.getElementById('toggleExplain');

function renderVF(data) {
  const preguntas = Array.isArray(data?.preguntas) ? data.preguntas : [];
  if (preguntas.length === 0) {
    vfList.innerHTML = '<p style="color:#666;">No se generaron preguntas. Intenta con otro PDF.</p>';
    return;
  }
  let v = 0, f = 0;
  vfList.innerHTML = preguntas
    .map((p, idx) => {
      const respuesta = (p.respuesta || '').toString().toLowerCase().includes('verd') ? 'verdadero' : 'falso';
      if (respuesta === 'verdadero') v++; else f++;
      return `
      <article class="vf-card" tabindex="0" role="group" aria-label="Pregunta ${idx + 1}">
        <header class="vf-card-title">
          <h3 style="margin:0; font-size:16px; line-height:1.3;">${idx + 1}. ${p.enunciado || ''}</h3>
          <span class="vf-chip ${respuesta === 'verdadero' ? 'v' : 'f'}">${respuesta === 'verdadero' ? 'Verdadero' : 'Falso'}</span>
        </header>
        ${p.explicacion ? `<p class="vf-explain">${p.explicacion}</p>` : ''}
      </article>
      `;
    })
    .join('');
  vfStats.textContent = `V: ${v} · F: ${f}`;

  // Toggle explicaciones
  const applyExplain = () => {
    document.querySelectorAll('.vf-card').forEach(card => {
      if (toggleExplain.checked) card.classList.add('show-exp');
      else card.classList.remove('show-exp');
    });
  };
  toggleExplain.addEventListener('change', applyExplain);
  applyExplain();
}

async function loadVF() {
  try {
    vfMeta.textContent = `Archivo: ${fileName || 'Documento PDF'} | Generado ahora`;

    const response = await apiCall(`/api/ai/content/${outputId}`);
    if (!response || !response.ok) {
      throw new Error('No se pudo cargar el contenido');
    }
    const { output } = await response.json();

    let data;
    if (typeof output.content === 'string') {
      try { data = JSON.parse(output.content); } catch { data = {}; }
    } else {
      data = output.content || {};
    }

    // Normalizar estructura mínima
    if (!Array.isArray(data.preguntas)) {
      data = { preguntas: [] };
    }
    renderVF(data);
  } catch (error) {
    vfList.innerHTML = `<div class="error-message"><p>${error.message}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadVF);

document.querySelector('.back-btn').addEventListener('click', function () {
  window.location.href = '/index.html';
});

document.getElementById('downloadBtn').addEventListener('click', function() {
  window.print();
});

document.getElementById('shareBtn').addEventListener('click', function() {
  if (navigator.share) {
    navigator.share({ title: 'Verdadero/Falso generado', url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('URL copiada al portapapeles');
  }
});


