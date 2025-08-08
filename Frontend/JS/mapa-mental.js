// Parámetros
const urlParams = new URLSearchParams(window.location.search);
const pdfId = urlParams.get('pdfId');
const outputId = urlParams.get('outputId');
const fileName = urlParams.get('fileName');

// DOM
const fileNameElement = document.getElementById('fileName');
const fileTimeElement = document.getElementById('fileTime');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

async function loadMindmap() {
  try {
    fileNameElement.textContent = fileName || 'Documento PDF';
    fileTimeElement.textContent = '⏱️ Generado ahora';

    let progress = 0;
    const timer = setInterval(() => {
      progress = Math.min(100, progress + 12);
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Render progresando ${progress}%`;
      if (progress >= 100) {
        clearInterval(timer);
        progressText.textContent = 'Render listo';
      }
    }, 180);

    const response = await apiCall(`/api/ai/content/${outputId}`);
    if (!response || !response.ok) {
      throw new Error('Error al cargar el mapa mental');
    }
    const { output } = await response.json();

    const content = output.content || {};
    const titulo = content.titulo || 'Mapa mental';
    const markdown = typeof content.markmap === 'string' ? content.markmap : '# Mapa mental\n- Tema principal';

    document.title = `${titulo} - Study AI`;

    // Usar markmap-autoloader global
    const mmGlobal = window.markmap;
    if (!mmGlobal || !mmGlobal.Transformer || !mmGlobal.Markmap) {
      throw new Error('Biblioteca Markmap no cargada');
    }

    const transformer = new mmGlobal.Transformer();
    let { root } = transformer.transform(markdown);
    // Si el markdown está vacío o sin hijos, usar un ejemplo mínimo
    if (!root || !root.children || root.children.length === 0) {
      const fallback = '# Mapa mental\n- Tema principal\n  - Concepto 1\n  - Concepto 2\n  - Concepto 3';
      ({ root } = transformer.transform(fallback));
    }
    const svg = document.getElementById('markmap');
    // Asegurar alto mínimo
    svg.style.width = '100%';
    svg.style.height = '100%';
    mmGlobal.Markmap.create(svg, { fit: true }, root);

    // Título visible
    const titleEl = document.querySelector('.summary-title');
    if (titleEl && titulo) titleEl.textContent = `Mapa mental: ${titulo}`;

    // Acciones
    document.getElementById('downloadBtn').addEventListener('click', () => {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(titulo || 'mapa-mental').replace(/\s+/g, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('copyBtn').addEventListener('click', async () => {
      await navigator.clipboard.writeText(markdown);
      alert('Markdown copiado al portapapeles');
    });

  } catch (err) {
    console.error(err);
    const wrapper = document.getElementById('markmapWrapper');
    wrapper.innerHTML = `<div class="error-message"><h3>❌ Error</h3><p>${err.message}</p><pre style="white-space:pre-wrap">${(err.stack||'')}</pre></div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadMindmap);
document.querySelector('.back-btn').addEventListener('click', function () {
  window.location.href = '/index.html';
});


