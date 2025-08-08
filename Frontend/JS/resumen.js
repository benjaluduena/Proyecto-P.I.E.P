// Código movido desde resumen.html
// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
const pdfId = urlParams.get('pdfId');
const outputId = urlParams.get('outputId');
const fileName = urlParams.get('fileName');

// Elementos del DOM
const fileNameElement = document.getElementById('fileName');
const filePagesElement = document.getElementById('filePages');
const fileTimeElement = document.getElementById('fileTime');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const summaryContent = document.getElementById('summaryContent');

// Cargar datos del resumen
async function loadSummary() {
    try {
        // Actualizar información del archivo
        fileNameElement.textContent = fileName || 'Documento PDF';
        fileTimeElement.textContent = '⏱️ Generado ahora';

        // Simular progreso
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Análisis completado al ${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                progressText.textContent = 'Análisis completado';
            }
        }, 200);

        // Obtener el resumen desde el backend
        const response = await apiCall(`/api/ai/content/${outputId}`);
        if (!response || !response.ok) {
            throw new Error('Error al cargar el resumen');
        }

        const { output } = await response.json();
        
        // Parsear el contenido JSON del resumen si viniera como string.
        // Si el backend guarda jsonb nativo, output.content ya será un objeto.
        let summaryData;
        if (typeof output.content === 'string') {
          try {
            summaryData = JSON.parse(output.content);
          } catch (e) {
            summaryData = {
              resumen_general: output.content,
              conceptos_clave: [],
              aplicaciones_practicas: [],
              conclusiones: 'Resumen generado exitosamente.'
            };
          }
        } else {
          summaryData = output.content || {
            resumen_general: '',
            conceptos_clave: [],
            aplicaciones_practicas: [],
            conclusiones: ''
          };
        }

        // Renderizar el resumen
        renderSummary(summaryData);

    } catch (error) {
        console.error('Error al cargar el resumen:', error);
        summaryContent.innerHTML = `
            <div class="error-message">
                <h3>❌ Error al cargar el resumen</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" id="retryBtn">Reintentar</button>
            </div>
        `;
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) retryBtn.addEventListener('click', loadSummary);
    }
}

// Renderizar el resumen en el DOM
function renderSummary(data) {
    summaryContent.innerHTML = `
        <div class="summary-section">
            <h2 class="section-title">Resumen General</h2>
            <p>${data.resumen_general || data.summary || 'Resumen generado por IA'}</p>
        </div>

        ${data.conceptos_clave ? `
        <div class="summary-section">
            <h2 class="section-title">Conceptos Clave</h2>
            <ul class="key-points">
                ${data.conceptos_clave.map(concepto => `<li>${concepto}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${data.aplicaciones_practicas ? `
        <div class="summary-section">
            <h2 class="section-title">Aplicaciones Prácticas</h2>
            <ul class="key-points">
                ${data.aplicaciones_practicas.map(aplicacion => `<li>${aplicacion}</li>`).join('')}
            </ul>
        </div>
        ` : ''}

        ${data.conclusiones ? `
        <div class="summary-section">
            <h2 class="section-title">Conclusiones</h2>
            <p>${data.conclusiones}</p>
        </div>
        ` : ''}
    `;
}

// Event listeners
document.querySelector('.back-btn').addEventListener('click', function () {
    window.location.href = '/index.html';
});

document.addEventListener('DOMContentLoaded', loadSummary);

document.getElementById('generateQuestionsBtn').addEventListener('click', function() {
    window.location.href = `/Frontend/Pages/home.html?action=questions&pdfId=${pdfId}`;
});

document.getElementById('downloadBtn').addEventListener('click', function() {
    window.print();
});

document.getElementById('shareBtn').addEventListener('click', function() {
    if (navigator.share) {
        navigator.share({
            title: 'Resumen generado con Study AI',
            text: 'Mira este resumen inteligente que generé con Study AI',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert('URL copiada al portapapeles');
    }
}); 