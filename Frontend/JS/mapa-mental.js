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
    // Aguardar un momento para asegurar que el DOM esté completamente renderizado
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const svg = document.getElementById('markmap');
    const wrapper = document.getElementById('markmapWrapper');
    
    if (!svg || !wrapper) {
      throw new Error('Elementos SVG o wrapper no encontrados');
    }
    
    // Mostrar el wrapper antes de inicializar
    wrapper.style.display = 'block';
    
    // Asegurar dimensiones mínimas explícitas
    const minWidth = 800;
    const minHeight = 500;
    
    // Aguardar a que el wrapper tenga dimensiones
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Obtener dimensiones del contenedor padre
    const containerRect = wrapper.getBoundingClientRect();
    const width = Math.max(containerRect.width || minWidth, minWidth);
    const height = Math.max(containerRect.height || minHeight, minHeight);
    
    // Validar que las dimensiones sean válidas
    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
      throw new Error(`Dimensiones inválidas: width=${width}, height=${height}`);
    }
    
    // Limpiar el SVG antes de establecer nuevas dimensiones
    svg.innerHTML = '';
    
    // Establecer dimensiones explícitas en el SVG
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.width = width + 'px';
    svg.style.height = height + 'px';
    
    // Ocultar estado de carga y mostrar visualización
    document.getElementById('mmLoadingState').style.display = 'none';
    wrapper.style.display = 'block';
    document.getElementById('mmActions').style.display = 'flex';
    
    // Crear el mapa mental con opciones mejoradas
    const mm = mmGlobal.Markmap.create(svg, {
      fit: true,
      zoom: true,
      pan: true,
      fitRatio: 0.95,
      spacingHorizontal: 80,
      spacingVertical: 20,
      duration: 500,
      maxWidth: 300
    }, root);
    
    // Verificar que el mapa mental se haya creado correctamente
    if (!mm) {
      throw new Error('Error al crear el mapa mental con markmap');
    }

    // Título visible
    const titleEl = document.querySelector('.summary-title');
    if (titleEl && titulo) titleEl.textContent = `Mapa mental: ${titulo}`;

    // Controles de zoom y navegación
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        if (mm && mm.svg) {
          const currentTransform = d3.zoomTransform(mm.svg.node());
          const newK = Math.min(currentTransform.k * 1.5, 3);
          mm.svg.transition().duration(300).call(
            mm.zoom.transform,
            d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newK)
          );
        }
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        if (mm && mm.svg) {
          const currentTransform = d3.zoomTransform(mm.svg.node());
          const newK = Math.max(currentTransform.k * 0.7, 0.3);
          mm.svg.transition().duration(300).call(
            mm.zoom.transform,
            d3.zoomIdentity.translate(currentTransform.x, currentTransform.y).scale(newK)
          );
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (mm && mm.fit) {
          mm.fit();
        }
      });
    }

    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => {
        const container = document.querySelector('.mm-container');
        if (container) {
          container.classList.toggle('mm-fullscreen');
          
          setTimeout(() => {
            if (mm && mm.fit) {
              mm.fit();
            }
          }, 100);
        }
      });
    }

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


