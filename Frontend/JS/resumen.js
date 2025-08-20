/**
 * Módulo mejorado para el manejo de resúmenes inteligentes
 * Incluye validación, manejo de errores mejorado y mejores prácticas de seguridad
 */

class SummaryModule {
    constructor() {
        this.urlParams = new URLSearchParams(window.location.search);
        this.pdfId = this.urlParams.get('pdfId');
        this.outputId = this.urlParams.get('outputId');
        this.fileName = this.urlParams.get('fileName');
        
        // Referencias a elementos DOM
        this.domElements = {};
        this.isLoading = false;
        
        this.init();
    }

    init() {
        // Validar parámetros requeridos
        if (!this.validateRequiredParams()) {
            return;
        }

        // Obtener referencias DOM de forma segura
        this.initDOMElements();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Cargar el resumen
        this.loadSummary();
    }

    validateRequiredParams() {
        if (!this.pdfId || !this.outputId) {
            this.showError(
                'Parámetros faltantes',
                'No se encontraron los parámetros necesarios para cargar el resumen. Por favor, regresa al inicio y vuelve a generar el resumen.',
                true
            );
            return false;
        }

        // Validar que los IDs sean números válidos
        if (isNaN(parseInt(this.pdfId)) || isNaN(parseInt(this.outputId))) {
            this.showError(
                'Parámetros inválidos',
                'Los identificadores proporcionados no son válidos.',
                true
            );
            return false;
        }

        return true;
    }

    initDOMElements() {
        const elementIds = [
            'fileName', 'filePagesElement', 'fileTime', 'progressFill', 
            'progressText', 'summaryContent', 'generateQuestionsBtn', 
            'downloadBtn', 'shareBtn'
        ];

        elementIds.forEach(id => {
            this.domElements[id] = document.getElementById(id);
        });

        // Elementos especiales
        this.domElements.backBtn = document.querySelector('.back-btn');
        this.domElements.progressBar = document.getElementById('progressBar');
    }

    setupEventListeners() {
        // Back button
        if (this.domElements.backBtn) {
            this.domElements.backBtn.addEventListener('click', () => {
                this.navigateToHome();
            });
        }

        // Action buttons con verificación de existencia
        if (this.domElements.generateQuestionsBtn) {
            this.domElements.generateQuestionsBtn.addEventListener('click', () => {
                this.navigateToQuestions();
            });
        }

        if (this.domElements.downloadBtn) {
            this.domElements.downloadBtn.addEventListener('click', () => {
                this.downloadSummary();
            });
        }

        if (this.domElements.shareBtn) {
            this.domElements.shareBtn.addEventListener('click', () => {
                this.shareSummary();
            });
        }
    }

    async loadSummary() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            // Actualizar información del archivo
            this.updateFileInfo();
            
            // Mostrar progreso de análisis
            await this.showProgress();
            
            // Obtener el resumen desde el backend
            const summaryData = await this.fetchSummaryData();
            
            // Renderizar el resumen
            this.renderSummary(summaryData);
            
            // Habilitar botones de acción
            this.enableActionButtons();

        } catch (error) {
            console.error('Error al cargar el resumen:', error);
            this.showError(
                'Error al cargar el resumen',
                error.message || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.',
                false
            );
        } finally {
            this.isLoading = false;
        }
    }

    updateFileInfo() {
        if (this.domElements.fileName) {
            this.domElements.fileName.textContent = this.sanitizeText(this.fileName) || 'Documento PDF';
        }
        
        if (this.domElements.fileTime) {
            this.domElements.fileTime.textContent = `⏱️ ${new Date().toLocaleString()}`;
        }
    }

    async showProgress() {
        return new Promise((resolve) => {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15 + 5; // Progreso más realista
                progress = Math.min(progress, 100);
                
                if (this.domElements.progressFill) {
                    this.domElements.progressFill.style.width = `${progress}%`;
                }
                
                if (this.domElements.progressText) {
                    this.domElements.progressText.textContent = `Análisis completado al ${Math.round(progress)}%`;
                }
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    if (this.domElements.progressText) {
                        this.domElements.progressText.textContent = 'Análisis completado';
                    }
                    resolve();
                }
            }, 150);
        });
    }

    async fetchSummaryData() {
        if (!window.apiCall) {
            throw new Error('Sistema de API no disponible. Por favor, recarga la página.');
        }

        const response = await apiCall(`/api/ai/content/${this.outputId}`, {
            method: 'GET'
        });

        if (!response || !response.ok) {
            const errorData = response ? await response.json().catch(() => ({})) : {};
            throw new Error(errorData.error || 'Error al cargar el resumen desde el servidor');
        }

        const { output } = await response.json();
        
        // Procesar y validar el contenido
        return this.processSummaryContent(output.content);
    }

    processSummaryContent(content) {
        let summaryData;

        if (typeof content === 'string') {
            try {
                summaryData = JSON.parse(content);
            } catch (e) {
                // Si no es JSON válido, tratarlo como texto plano
                summaryData = {
                    resumen_general: content,
                    conceptos_clave: [],
                    aplicaciones_practicas: [],
                    conclusiones: 'Resumen generado exitosamente.'
                };
            }
        } else {
            summaryData = content || {};
        }

        // Asegurar estructura mínima
        return {
            resumen_general: summaryData.resumen_general || summaryData.summary || 'No se pudo generar el resumen general.',
            conceptos_clave: Array.isArray(summaryData.conceptos_clave) ? summaryData.conceptos_clave : [],
            aplicaciones_practicas: Array.isArray(summaryData.aplicaciones_practicas) ? summaryData.aplicaciones_practicas : [],
            conclusiones: summaryData.conclusiones || 'No se pudieron generar conclusiones.'
        };
    }

    renderSummary(data) {
        if (!this.domElements.summaryContent) {
            console.error('Elemento summaryContent no encontrado');
            return;
        }

        const summaryHTML = this.buildSummaryHTML(data);
        this.domElements.summaryContent.innerHTML = summaryHTML;
    }

    buildSummaryHTML(data) {
        return `
            <div class="summary-section">
                <h2 class="section-title">📋 Resumen General</h2>
                <div class="summary-text">${this.sanitizeHTML(data.resumen_general)}</div>
            </div>

            ${data.conceptos_clave.length > 0 ? `
                <div class="summary-section">
                    <h2 class="section-title">🔑 Conceptos Clave</h2>
                    <ul class="key-points">
                        ${data.conceptos_clave.map(concepto => 
                            `<li>${this.sanitizeHTML(concepto)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}

            ${data.aplicaciones_practicas.length > 0 ? `
                <div class="summary-section">
                    <h2 class="section-title">🛠️ Aplicaciones Prácticas</h2>
                    <ul class="key-points">
                        ${data.aplicaciones_practicas.map(aplicacion => 
                            `<li>${this.sanitizeHTML(aplicacion)}</li>`
                        ).join('')}
                    </ul>
                </div>
            ` : ''}

            ${data.conclusiones ? `
                <div class="summary-section">
                    <h2 class="section-title">💡 Conclusiones</h2>
                    <div class="summary-text">${this.sanitizeHTML(data.conclusiones)}</div>
                </div>
            ` : ''}
        `;
    }

    enableActionButtons() {
        // Habilitar todos los botones de acción
        [this.domElements.generateQuestionsBtn, this.domElements.downloadBtn, this.domElements.shareBtn]
            .forEach(btn => {
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('disabled');
                }
            });
    }

    showError(title, message, showBackButton = false) {
        if (!this.domElements.summaryContent) return;

        this.domElements.summaryContent.innerHTML = `
            <div class="error-container">
                <div class="error-icon">❌</div>
                <h3 class="error-title">${this.sanitizeHTML(title)}</h3>
                <p class="error-message">${this.sanitizeHTML(message)}</p>
                <div class="error-actions">
                    ${showBackButton ? 
                        '<button class="btn btn-primary" onclick="summaryModule.navigateToHome()">Volver al Inicio</button>' : 
                        '<button class="btn btn-secondary" onclick="summaryModule.loadSummary()">Reintentar</button>'
                    }
                </div>
            </div>
        `;

        // Ocultar barra de progreso en caso de error
        if (this.domElements.progressBar) {
            this.domElements.progressBar.style.display = 'none';
        }
    }

    // Métodos de navegación
    navigateToHome() {
        window.location.href = '/index.html';
    }

    navigateToQuestions() {
        if (!this.pdfId) {
            alert('No se puede generar preguntas: ID de PDF no válido');
            return;
        }
        window.location.href = `/Pages/home.html?action=questions&pdfId=${encodeURIComponent(this.pdfId)}`;
    }

    // Funcionalidades adicionales
    downloadSummary() {
        try {
            // Mejorar la experiencia de descarga
            const printStyle = `
                <style>
                    @media print {
                        .actions, .back-btn, .top-header { display: none !important; }
                        .summary-container { box-shadow: none !important; margin: 0 !important; }
                        body { font-size: 12pt; line-height: 1.4; }
                    }
                </style>
            `;
            
            const head = document.head || document.getElementsByTagName('head')[0];
            const styleElement = document.createElement('style');
            styleElement.innerHTML = printStyle;
            head.appendChild(styleElement);
            
            window.print();
            
            // Remover el estilo después de imprimir
            setTimeout(() => {
                head.removeChild(styleElement);
            }, 100);
            
        } catch (error) {
            console.error('Error al descargar:', error);
            alert('Error al preparar la descarga. Por favor, intenta de nuevo.');
        }
    }

    async shareSummary() {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Resumen generado con Study AI',
                    text: `Resumen inteligente de: ${this.fileName || 'Documento PDF'}`,
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                this.showTemporaryMessage('URL copiada al portapapeles ✓');
            }
        } catch (error) {
            console.error('Error al compartir:', error);
            // Fallback manual
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showTemporaryMessage('URL copiada al portapapeles ✓');
        }
    }

    showTemporaryMessage(message, duration = 3000) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'temporary-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, duration);
    }

    // Métodos de seguridad
    sanitizeText(text) {
        if (!text) return '';
        return text.toString().substring(0, 1000); // Limitar longitud
    }

    sanitizeHTML(html) {
        if (!html) return '';
        const div = document.createElement('div');
        div.textContent = html.toString();
        return div.innerHTML;
    }
}

// Inicializar cuando el DOM esté listo
let summaryModule;
document.addEventListener('DOMContentLoaded', () => {
    summaryModule = new SummaryModule();
});

// Exportar para uso global si es necesario
window.summaryModule = summaryModule;