// ===== VARIABLES GLOBALES =====
let currentQuestionIndex = 0;
let questions = [];
let userAnswers = [];
let isQuestionAnswered = false;
let pdfId, outputId, fileName;

// ===== ELEMENTOS DEL DOM =====
let vfOptions = document.querySelectorAll('.vf-option');
let vfFeedback = document.getElementById('vfFeedback');
let feedbackText = document.getElementById('feedbackText');
let explanationLink = document.getElementById('explanationLink');
let vfExplanation = document.getElementById('vfExplanation');
let continueContainer = document.getElementById('continueContainer');
let continueBtn = document.getElementById('continueBtn');
const closeBtn = document.getElementById('closeBtn');
const quizTitle = document.getElementById('quizTitle');
const printBtn = document.getElementById('printBtn');
const shareBtn = document.getElementById('shareBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación antes de continuar
    if (!checkAuthentication()) {
        return;
    }
    
// Obtener parámetros de la URL
const urlParams = new URLSearchParams(window.location.search);
    pdfId = urlParams.get('pdfId');
    outputId = urlParams.get('outputId');
    fileName = urlParams.get('fileName');
    
    if (!pdfId || !outputId) {
        showError('Faltan parámetros necesarios para cargar el quiz');
        return;
    }
    
    initializeQuiz();
    setupEventListeners();
});

// ===== VERIFICAR AUTENTICACIÓN =====
function checkAuthentication() {
    try {
        // Verificar si hay sesión en localStorage
        const storedSession = localStorage.getItem('session');
        const storedUser = localStorage.getItem('user');
        
        if (!storedSession && !storedUser) {
            console.log('No hay sesión ni usuario, redirigiendo a login');
            redirectToLogin();
            return false;
        }
        
        // Verificar sesión de Supabase si existe
        if (storedSession) {
            const sessionData = JSON.parse(storedSession);
            
            // Verificar si la sesión tiene expires_at
            if (sessionData.expires_at) {
                const now = Math.floor(Date.now() / 1000);
                if (sessionData.expires_at <= now) {
                    console.log('Sesión expirada, redirigiendo a login');
                    localStorage.clear();
                    redirectToLogin();
                    return false;
                }
            }
            
            // Verificar si tiene access_token
            if (sessionData.access_token) {
                console.log('Sesión válida con token, continuando...');
                return true;
            }
        }
        
        // Verificar usuario si existe
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            if (userData.id) {
                console.log('Usuario válido encontrado, continuando...');
                return true;
            }
        }
        
        console.log('Sesión inválida, redirigiendo a login');
        localStorage.clear();
        redirectToLogin();
        return false;
        
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        localStorage.clear();
        redirectToLogin();
        return false;
    }
}

// ===== REDIRIGIR A LOGIN =====
function redirectToLogin() {
    // Guardar la URL actual para redirigir después del login
    const currentUrl = window.location.href;
    localStorage.setItem('redirectAfterLogin', currentUrl);
    
    // Redirigir a login
    window.location.replace('/login.html');
}

// ===== OBTENER HEADERS DE AUTORIZACIÓN =====
function getAuthHeaders() {
    try {
        // Intentar obtener token de la sesión
        const storedSession = localStorage.getItem('session');
        if (storedSession) {
            const sessionData = JSON.parse(storedSession);
            const token = sessionData.access_token;
            
            if (token) {
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
            }
        }
        
        // Si no hay token, intentar con el usuario
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            if (userData.id) {
                // Para usuarios autenticados sin token específico
                return {
                    'Content-Type': 'application/json',
                    'X-User-ID': userData.id
                };
            }
        }
        
    } catch (error) {
        console.error('Error obteniendo headers de autorización:', error);
    }
    
    // Headers por defecto
    return {
        'Content-Type': 'application/json'
    };
}

// ===== CONFIGURACIÓN DE EVENTOS =====
function setupEventListeners() {
    // Event listeners para las opciones
    vfOptions.forEach(option => {
        option.addEventListener('click', handleOptionClick);
    });

    // Event listener para el enlace de explicación
    explanationLink.addEventListener('click', toggleExplanation);

    // Event listener para el botón continuar
    continueBtn.addEventListener('click', function() {
        // Verificar si estamos en modo de revisión de preguntas contestadas
        if (userAnswers.length > 0 && userAnswers.length === questions.length) {
            goToNextQuestion();
        } else {
            goToNextQuestion();
        }
    });

    // Event listeners para botones de navegación
    closeBtn.addEventListener('click', handleClose);
    quizTitle.addEventListener('click', handleQuizTitle);
    printBtn.addEventListener('click', handlePrint);
    shareBtn.addEventListener('click', handleShare);
    prevBtn.addEventListener('click', goToPreviousQuestion);
    nextBtn.addEventListener('click', goToNextQuestion);
    
    // Event listener para volver a resultados
    const backToResultsBtn = document.getElementById('backToResultsBtn');
    if (backToResultsBtn) {
        backToResultsBtn.addEventListener('click', function() {
            console.log('Botón volver a resultados clickeado');
            showResults();
        });
    }

    // Deshabilitar botones de navegación inicialmente
    updateNavigationButtons();
}

// ===== MANEJO DE OPCIONES =====
function handleOptionClick(event) {
    console.log('Opción clickeada:', event.currentTarget);
    
    if (isQuestionAnswered) {
        console.log('Pregunta ya respondida, ignorando click');
        return; // Evitar múltiples respuestas
    }

    const selectedOption = event.currentTarget;
    const isCorrect = selectedOption.dataset.correct === 'true';
    
    console.log('Respuesta seleccionada:', {
        option: selectedOption.dataset.option,
        isCorrect: isCorrect,
        questionIndex: currentQuestionIndex
    });
    
    // Marcar la pregunta como respondida
    isQuestionAnswered = true;
    
    // Guardar la respuesta del usuario
    const currentQuestion = questions[currentQuestionIndex];
    userAnswers.push({
        questionId: currentQuestion.id,
        userAnswer: selectedOption.dataset.option === 'true',
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect: isCorrect
    });
    
    // Aplicar estilos visuales
    applyAnswerStyles(selectedOption, isCorrect);
    
    // Mostrar feedback
    showFeedback(isCorrect);
    
    // Mostrar enlace de explicación
    if (explanationLink) {
        explanationLink.style.display = 'inline-flex';
    }
    
    // Mostrar botón de continuar
    if (continueContainer) {
        continueContainer.style.display = 'flex';
    }
    
    // Mostrar botón de volver a resultados
    const backToResultsContainer = document.getElementById('backToResultsContainer');
    if (backToResultsContainer) {
        backToResultsContainer.style.display = 'flex';
    }
    
    // Deshabilitar todas las opciones
    vfOptions.forEach(option => {
        option.classList.add('answered');
        option.style.cursor = 'default';
        option.disabled = true;
    });

    // Actualizar botones de navegación
    updateNavigationButtons();
    
    console.log('Pregunta respondida exitosamente');
}

// ===== APLICAR ESTILOS DE RESPUESTA =====
function applyAnswerStyles(selectedOption, isCorrect) {
    console.log('Aplicando estilos de respuesta:', { isCorrect, selectedOption });
    
    vfOptions.forEach(option => {
        const optionIsCorrect = option.dataset.correct === 'true';
        
        if (option === selectedOption) {
            // Opción seleccionada por el usuario
            if (isCorrect) {
                option.classList.add('correct');
                console.log('Opción seleccionada marcada como correcta');
            } else {
                option.classList.add('incorrect');
                console.log('Opción seleccionada marcada como incorrecta');
            }
        }
    });
    
    console.log('Estilos de respuesta aplicados correctamente');
}

// ===== MOSTRAR FEEDBACK =====
function showFeedback(isCorrect) {
    vfFeedback.style.display = 'block';
    
    if (isCorrect) {
        feedbackText.textContent = '¡Correcto!';
        feedbackText.className = 'vf-feedback-text';
    } else {
        feedbackText.textContent = '¡Incorrecto!';
        feedbackText.className = 'vf-feedback-text incorrect';
    }
}

// ===== TOGGLE EXPLICACIÓN =====
function toggleExplanation() {
    const isVisible = vfExplanation.classList.contains('show');
    
    if (isVisible) {
        vfExplanation.classList.remove('show');
        explanationLink.innerHTML = 'Ver explicación <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>';
    } else {
        vfExplanation.classList.add('show');
        explanationLink.innerHTML = 'Ocultar explicación <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
    }
}

// ===== CONFIGURAR PREGUNTA ACTUAL =====
function setupCurrentQuestion() {
    if (currentQuestionIndex >= questions.length) {
        showResults();
    return;
  }

    const currentQuestion = questions[currentQuestionIndex];
    
    // Primero resetear completamente el estado de la pregunta anterior
    resetQuestionState();
    
    // Actualizar el título de la pregunta
    const questionTitle = document.querySelector('.vf-question-title');
    if (questionTitle) {
        questionTitle.textContent = currentQuestion.question;
    }
    
    // Actualizar el número de pregunta
    const questionNumber = document.querySelector('.vf-question-number');
    if (questionNumber) {
        questionNumber.textContent = currentQuestion.id;
    }
    
    // Actualizar las opciones con la respuesta correcta
    updateOptions(currentQuestion);
    
    // Actualizar la explicación
    const explanationText = document.querySelector('#vfExplanation p');
    if (explanationText) {
        explanationText.textContent = currentQuestion.explanation;
    }
    
    // Actualizar barra de progreso
    updateProgressBar();
    
    // Actualizar botones de navegación
    updateNavigationButtons();
    
    // Actualizar título del quiz con el nombre del archivo
    if (quizTitle && fileName) {
        quizTitle.textContent = `Quiz: ${fileName}`;
    }
    
    // Resetear el estado de respuesta
    isQuestionAnswered = false;
}

// ===== ACTUALIZAR OPCIONES =====
function updateOptions(currentQuestion) {
    console.log('Actualizando opciones para pregunta:', currentQuestion.id);
    
    vfOptions.forEach((option, index) => {
        const isCorrect = index === 0 ? currentQuestion.correctAnswer : !currentQuestion.correctAnswer;
        
        // Limpiar completamente el estado anterior
        option.classList.remove('correct', 'incorrect', 'answered');
        option.style.cursor = 'pointer';
        option.disabled = false;
        
        // Actualizar el dataset con la respuesta correcta
        option.dataset.correct = isCorrect.toString();
        option.dataset.option = index === 0 ? 'true' : 'false';
        
        // Actualizar el texto de la opción
        const optionText = option.querySelector('.vf-option-text');
        if (optionText) {
            optionText.textContent = index === 0 ? 'Verdadero' : 'Falso';
        }
        
        // Asegurar que el event listener esté funcionando
        option.onclick = null; // Remover listeners previos
        option.addEventListener('click', handleOptionClick);
        
        console.log(`Opción ${index + 1} configurada:`, {
            text: index === 0 ? 'Verdadero' : 'Falso',
            isCorrect: isCorrect,
            dataset: option.dataset
        });
    });
    
    console.log('Opciones actualizadas correctamente');
}

// ===== ACTUALIZAR BARRA DE PROGRESO =====
function updateProgressBar() {
    const progressFill = document.querySelector('.vf-progress-fill');
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // Actualizar números de progreso
    const currentNumber = document.querySelector('.vf-progress span:first-child');
    const totalNumber = document.querySelector('.vf-progress span:last-child');
    
    if (currentNumber) {
        currentNumber.textContent = currentQuestionIndex + 1;
    }
    if (totalNumber) {
        totalNumber.textContent = questions.length;
    }
}

// ===== IR A LA SIGUIENTE PREGUNTA =====
function goToNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        
        // Verificar si estamos en modo de revisión de preguntas contestadas
        if (userAnswers.length > 0 && userAnswers.length === questions.length) {
            setupAnsweredQuestion();
        } else {
            setupCurrentQuestion();
        }
        
        updateNavigationButtons();
    } else {
        // Última pregunta - mostrar resultados
        showResults();
    }
}

// ===== IR A LA PREGUNTA ANTERIOR =====
function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        
        // Verificar si estamos en modo de revisión de preguntas contestadas
        if (userAnswers.length > 0 && userAnswers.length === questions.length) {
            setupAnsweredQuestion();
        } else {
            setupCurrentQuestion();
        }
        
        updateNavigationButtons();
    }
}

// ===== RESETEAR ESTADO DE LA PREGUNTA =====
function resetQuestionState() {
    console.log('Reseteando estado de la pregunta...');
    
    // Remover clases de estado de las opciones
    vfOptions.forEach(option => {
        option.classList.remove('correct', 'incorrect', 'answered');
        option.style.cursor = 'pointer';
        option.disabled = false;
    });
    
    // Ocultar feedback y explicación
    if (vfFeedback) {
        vfFeedback.style.display = 'none';
    }
    
    if (explanationLink) {
        explanationLink.style.display = 'none';
    }
    
    if (vfExplanation) {
        vfExplanation.classList.remove('show');
    }
    
    if (continueContainer) {
        continueContainer.style.display = 'none';
    }
    
    // Resetear estado interno
    isQuestionAnswered = false;
    
    console.log('Estado de la pregunta reseteado completamente');
}

// ===== ACTUALIZAR BOTONES DE NAVEGACIÓN =====
function updateNavigationButtons() {
    prevBtn.disabled = currentQuestionIndex === 0;
    nextBtn.disabled = currentQuestionIndex === questions.length - 1;
    
    // Aplicar estilos visuales para botones deshabilitados
    if (prevBtn.disabled) {
        prevBtn.classList.add('disabled');
    } else {
        prevBtn.classList.remove('disabled');
    }
    
    if (nextBtn.disabled) {
        nextBtn.classList.add('disabled');
    } else {
        nextBtn.classList.remove('disabled');
    }
}

// ===== MANEJO DE BOTONES DEL HEADER =====
function handleClose() {
    if (confirm('¿Estás seguro de que quieres cerrar el quiz?')) {
        window.location.href = '/index.html';
    }
}

function handleQuizTitle() {
    // Aquí puedes implementar la funcionalidad para mostrar información del quiz
    alert('Información del Quiz: Quizzes De Dificultad Creciente');
}

function handlePrint() {
    window.print();
}

function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: 'Quiz Verdadero/Falso',
            text: '¡Mira este quiz que estoy haciendo!',
            url: window.location.href
        });
    } else {
        // Fallback para navegadores que no soportan Web Share API
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('URL copiada al portapapeles');
        }).catch(() => {
            alert('No se pudo copiar la URL');
        });
    }
}

// ===== INICIALIZAR QUIZ =====
function initializeQuiz() {
    loadQuestions();
}

// ===== CARGAR PREGUNTAS DESDE LA API =====
async function loadQuestions() {
    try {
        console.log('Iniciando carga de preguntas...');
        console.log('outputId:', outputId);
        console.log('pdfId:', pdfId);
        console.log('fileName:', fileName);
        
        showLoading(true);
        
        const apiUrl = `/api/ai/content/${outputId}`;
        console.log('Llamando a API:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        
        console.log('Respuesta de API recibida:', response);
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        if (response.status === 401) {
            throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
        }
        
        if (response.status === 403) {
            throw new Error('No tienes permisos para acceder a este contenido.');
        }
        
        if (response.status === 404) {
            throw new Error('El contenido solicitado no fue encontrado. Verifica que el PDF se haya procesado correctamente.');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en respuesta:', errorText);
            throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Datos de respuesta completos:', responseData);
        
        if (!responseData.output) {
            throw new Error('No se encontró el campo "output" en la respuesta');
        }
        
        const { output } = responseData;
        console.log('Output extraído:', output);
        console.log('Tipo de contenido:', output.content);

    let data;
        
    if (typeof output.content === 'string') {
            try {
                data = JSON.parse(output.content);
                console.log('Contenido parseado como JSON:', data);
            } catch (parseError) {
                console.error('Error al parsear JSON:', parseError);
                console.log('Contenido que falló al parsear:', output.content);
                data = {};
            }
    } else {
      data = output.content || {};
            console.log('Contenido directo:', data);
    }

    // Normalizar estructura mínima
    if (!Array.isArray(data.preguntas)) {
            console.warn('No se encontró array de preguntas, estructura:', data);
      data = { preguntas: [] };
    }
        
        console.log('Preguntas encontradas:', data.preguntas);
        
        // Convertir las preguntas al formato que espera nuestro sistema
        questions = data.preguntas.map((pregunta, index) => {
            console.log(`Procesando pregunta ${index + 1}:`, pregunta);
            
            const respuesta = (pregunta.respuesta || '').toString().toLowerCase().includes('verd');
            const preguntaFormateada = {
                id: index + 1,
                question: pregunta.enunciado || `Pregunta ${index + 1}`,
                correctAnswer: respuesta,
                explanation: pregunta.explicacion || 'Sin explicación disponible'
            };
            
            console.log(`Pregunta ${index + 1} formateada:`, preguntaFormateada);
            return preguntaFormateada;
        });
        
        if (questions.length === 0) {
            showError('No se generaron preguntas para este PDF. Intenta con otro documento.');
            return;
        }
        
        console.log(`Preguntas cargadas exitosamente: ${questions.length}`);
        console.log('Preguntas finales:', questions);
        
        setupCurrentQuestion();
        
  } catch (error) {
        console.error('Error completo al cargar preguntas:', error);
        console.error('Stack trace:', error.stack);
        showError(`Error al cargar las preguntas: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// ===== MOSTRAR/OCULTAR LOADING =====
function showLoading(show) {
    const loadingElement = document.getElementById('loadingOverlay');
    if (loadingElement) {
        loadingElement.style.display = show ? 'flex' : 'none';
        if (show) {
            loadingElement.classList.add('show');
        } else {
            loadingElement.classList.remove('show');
        }
    }
}

// ===== MOSTRAR ERROR =====
function showError(message) {
    const questionCard = document.querySelector('.vf-question-card');
    if (questionCard) {
        const debugInfo = `
            <div class="vf-debug-info">
                <h4>Información de Debug:</h4>
                <p><strong>outputId:</strong> ${outputId || 'No definido'}</p>
                <p><strong>pdfId:</strong> ${pdfId || 'No definido'}</p>
                <p><strong>fileName:</strong> ${fileName || 'No definido'}</p>
                <p><strong>URL actual:</strong> ${window.location.href}</p>
            </div>
        `;
        
        // Mensaje específico para errores de autenticación
        let specificMessage = message;
        let specificActions = '';
        
        if (message.includes('autenticado') || message.includes('401')) {
            specificMessage = 'No estás autenticado o tu sesión ha expirado.';
            specificActions = `
                <div class="vf-auth-help">
                    <h4>¿Qué hacer?</h4>
                    <ol>
                        <li>Ve a la página de inicio</li>
                        <li>Inicia sesión nuevamente</li>
                        <li>Sube tu PDF</li>
                        <li>Selecciona "Verdadero o Falso"</li>
                    </ol>
                </div>
            `;
        }
        
        questionCard.innerHTML = `
            <div class="vf-error">
                <h3>Error</h3>
                <p>${specificMessage}</p>
                ${specificActions}
                ${debugInfo}
                <div class="vf-error-actions">
                    <button class="btn btn-primary" onclick="window.location.href='/'">Volver al Inicio</button>
                    <button class="btn" onclick="retryLoadQuestions()">Reintentar</button>
                    <button class="btn" onclick="openConsole()">Abrir Consola</button>
                </div>
            </div>
        `;
    }
}

// ===== REINTENTAR CARGA =====
function retryLoadQuestions() {
    console.log('Reintentando carga de preguntas...');
    loadQuestions();
}

// ===== ABRIR CONSOLA =====
function openConsole() {
    alert('Presiona F12 para abrir la consola del navegador y ver los logs de error.');
}

// ===== CALCULAR PUNTUACIÓN =====
function calculateScore() {
    return userAnswers.filter(answer => answer.isCorrect).length;
}

// ===== MOSTRAR RESULTADOS =====
function showResults() {
    // Ocultar navegación
    const navigation = document.querySelector('.vf-navigation');
    if (navigation) navigation.style.display = 'none';

    const score = calculateScore();
    const totalQuestions = questions.length;
    const percentage = (score / totalQuestions) * 100;

    // Determinar color según porcentaje
    let color = '#4CAF50'; // verde
    if (percentage < 50) color = '#f44336'; // rojo
    else if (percentage < 70) color = '#f18531'; // naranja

    // Seleccionar imagen según porcentaje
    let imgSrc = "/Assets/Imagenes/zorro-celebracion.png";
    if (percentage < 50) {
        imgSrc = "/Assets/Imagenes/zorro-triste.png";
    } else if (percentage < 70) {
        imgSrc = "/Assets/Imagenes/zorro-normal.png";
    } // Puedes ajustar los nombres de las imágenes según tus archivos

    // SVG círculo de progreso
    const radius = 60;
    const stroke = 10;
    const normalizedRadius = radius - stroke / 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const progress = circumference * (percentage / 100);

    const resultsHTML = `
        <div class="vf-results">
            <img width="120" src="${imgSrc}" alt="">
            <div class="vf-score-circle" style="margin: 0em 0 1.5rem 0;">
                <svg height="130" width="130">
                    <circle
                        stroke="#eee"
                        fill="none"
                        stroke-width="${stroke}"
                        r="${normalizedRadius}"
                        cx="65"
                        cy="65"
                    />
                    <circle
                        stroke="${color}"
                        fill="none"
                        stroke-width="${stroke}"
                        stroke-linecap="round"
                        r="${normalizedRadius}"
                        cx="65"
                        cy="65"
                        stroke-dasharray="${circumference} ${circumference}"
                        stroke-dashoffset="${circumference - progress}"
                        style="transition: stroke-dashoffset 0.6s;"
                    />
                    <text x="50%" y="50%" text-anchor="middle" dy="0.3em" font-size="1.5em" fill="${color}" font-weight="bold">${percentage.toFixed(0)}%</text>
                    <text x="50%" y="50%" text-anchor="middle" dy="2.0em" font-size="0.8em" fill="#999" font-weight="500">${score} de ${totalQuestions}</text>
                </svg>
            </div>
            <p class="vf-message" style="color: ${color}; font-size: 1.1rem;">
                ${
                    percentage >= 90
                        ? '¡Excelente! Eres un experto en este tema.'
                        : percentage >= 70
                        ? '¡Muy bien! Tienes un buen conocimiento del tema.'
                        : percentage >= 50
                        ? '¡Bien! Tienes conocimientos básicos del tema.'
                        : '¡Sigue estudiando! Puedes mejorar tu conocimiento del tema.'
                }
            </p>
            <div class="vf-results-actions">
                <button class="btn-purple" onclick="restartQuiz()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12C22 17.5228 17.5229 22 12 22C6.4772 22 2 17.5228 2 12C2 6.47715 6.4772 2 12 2V4C7.5817 4 4 7.58172 4 12C4 16.4183 7.5817 20 12 20C16.4183 20 20 16.4183 20 12C20 9.25022 18.6127 6.82447 16.4998 5.38451L16.5 8H14.5V2L20.5 2V4L18.0008 3.99989C20.4293 5.82434 22 8.72873 22 12Z"></path></svg>
                    Reiniciar
                </button>
                <button class="btn-white" onclick="goToFirstQuestion()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.45455 15L1 18.5V3C1 2.44772 1.44772 2 2 2H17C17.5523 2 18 2.44772 18 3V15H5.45455ZM4.76282 13H16V4H3V14.3851L4.76282 13ZM8 17H18.2372L20 18.3851V8H21C21.5523 8 22 8.44772 22 9V22.5L17.5455 19H9C8.44772 19 8 18.5523 8 18V17Z"></path></svg>
                    Ver Respuestas
                </button>
                <button class="btn-white" onclick="window.location.href='/index.html'">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5.82843 6.99955L8.36396 9.53509L6.94975 10.9493L2 5.99955L6.94975 1.0498L8.36396 2.46402L5.82843 4.99955H13C17.4183 4.99955 21 8.58127 21 12.9996C21 17.4178 17.4183 20.9996 13 20.9996H4V18.9996H13C16.3137 18.9996 19 16.3133 19 12.9996C19 9.68584 16.3137 6.99955 13 6.99955H5.82843Z"></path></svg>
                    Regresar
                </button>
            </div>
        </div>
    `;

    document.querySelector('.vf-question-card').innerHTML = resultsHTML;
}

// ===== REINICIAR QUIZ =====
function restartQuiz() {
    // Mostrar navegación
    const navigation = document.querySelector('.vf-navigation');
    if (navigation) navigation.style.display = 'flex';

    currentQuestionIndex = 0;
    userAnswers = [];
    location.reload();
}

// ===== IR A LA PRIMERA PREGUNTA =====
function goToFirstQuestion() {
    // Mostrar navegación
    const navigation = document.querySelector('.vf-navigation');
    if (navigation) navigation.style.display = 'flex';
    
    console.log('=== INICIANDO REVISIÓN DE RESPUESTAS ===');
    console.log('Preguntas totales:', questions.length);
    console.log('Respuestas del usuario:', userAnswers);
    
    if (!questions || questions.length === 0) {
        console.error('No hay preguntas disponibles');
        return;
    }
    
    if (!userAnswers || userAnswers.length === 0) {
        console.error('No hay respuestas del usuario');
        return;
    }
    
    currentQuestionIndex = 0;
    showAnsweredQuestions();
}

// ===== MOSTRAR PREGUNTAS YA CONTESTADAS =====
function showAnsweredQuestions() {
    console.log('=== MOSTRANDO PREGUNTAS CONTESTADAS ===');
    
    // Ocultar los resultados
    const resultsElement = document.querySelector('.vf-results');
    if (resultsElement) {
        console.log('Ocultando resultados...');
        resultsElement.style.display = 'none';
    }
    
    // Mostrar la interfaz de preguntas
    const questionCard = document.querySelector('.vf-question-card');
    if (questionCard) {
        console.log('Restaurando estructura de pregunta...');
        
        // Crear la estructura de la pregunta
        const questionHTML = `
            <div class="vf-question-header">
                <h2 class="vf-question-title"></h2>
                <div class="vf-question-number"></div>
            </div>
            
            <div class="vf-options">
                <div class="vf-option" data-option="true">
                    <div class="vf-option-text">Verdadero</div>
                </div>
                <div class="vf-option" data-option="false">
                    <div class="vf-option-text">Falso</div>
                </div>
            </div>
            
            <div id="vfFeedback" class="vf-feedback" style="display: none;">
                <p id="feedbackText" class="vf-feedback-text"></p>
            </div>
            
            <div id="explanationLink" class="vf-explanation-link" style="display: none;">
                Ver explicación <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </div>
            
            <div id="vfExplanation" class="vf-explanation">
                <h4>Explicación:</h4>
                <p></p>
            </div>
            
            <div id="continueContainer" class="vf-continue-container" style="display: none;">
                <button id="continueBtn" class="btn btn-primary">Continuar</button>
            </div>
            
            <div id="backToResultsContainer" class="vf-back-to-results" style="display: none;">
                <button id="backToResultsBtn" class="btn">Volver a Resultados</button>
            </div>
        `;
        
        // Insertar el HTML en la tarjeta
        questionCard.innerHTML = questionHTML;
        
        // Reconfigurar los elementos del DOM
        setupDOMElements();
        
        // Configurar la primera pregunta con las respuestas del usuario
        setupAnsweredQuestion();
        
        // Configurar eventos después de un pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
            console.log('Configurando eventos...');
            setupEventListeners();
            console.log('=== ESTRUCTURA RESTAURADA COMPLETAMENTE ===');
        }, 100);
    } else {
        console.error('No se encontró la tarjeta de pregunta');
    }
}

// ===== CONFIGURAR ELEMENTOS DEL DOM =====
function setupDOMElements() {
    console.log('=== CONFIGURANDO ELEMENTOS DEL DOM ===');
    
    // Reasignar referencias a los elementos del DOM
    const newVfOptions = document.querySelectorAll('.vf-option');
    const newVfFeedback = document.getElementById('vfFeedback');
    const newFeedbackText = document.getElementById('feedbackText');
    const newExplanationLink = document.getElementById('explanationLink');
    const newVfExplanation = document.getElementById('vfExplanation');
    const newContinueContainer = document.getElementById('continueContainer');
    const newContinueBtn = document.getElementById('continueBtn');
    
    console.log('Elementos encontrados:', {
        options: newVfOptions.length,
        feedback: !!newVfFeedback,
        feedbackText: !!newFeedbackText,
        explanationLink: !!newExplanationLink,
        explanation: !!newVfExplanation,
        continueContainer: !!newContinueContainer,
        continueBtn: !!newContinueBtn
    });
    
    // Actualizar las variables globales
    vfOptions = newVfOptions;
    vfFeedback = newVfFeedback;
    feedbackText = newFeedbackText;
    explanationLink = newExplanationLink;
    vfExplanation = newVfExplanation;
    continueContainer = newContinueContainer;
    continueBtn = newContinueBtn;
    
    console.log('Variables globales actualizadas');
    console.log('=== ELEMENTOS DEL DOM CONFIGURADOS ===');
}

// ===== CONFIGURAR PREGUNTA YA CONTESTADA =====
function setupAnsweredQuestion() {
    console.log('=== CONFIGURANDO PREGUNTA CONTESTADA ===');
    console.log('Índice actual:', currentQuestionIndex);
    console.log('Preguntas disponibles:', questions.length);
    
    if (currentQuestionIndex >= questions.length) {
        currentQuestionIndex = 0;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    console.log('Pregunta actual:', currentQuestion);
    
    // Buscar la respuesta del usuario para esta pregunta específica
    const userAnswer = userAnswers.find(answer => answer.questionId === currentQuestion.id);
    console.log('Respuesta del usuario encontrada:', userAnswer);
    
    if (!userAnswer) {
        console.error(`No se encontró respuesta para la pregunta ${currentQuestion.id}`);
        return;
    }
    
    // Actualizar el título de la pregunta
    const questionTitle = document.querySelector('.vf-question-title');
    if (questionTitle) {
        questionTitle.textContent = currentQuestion.question;
        console.log('Título actualizado:', currentQuestion.question);
    }
    
    // Actualizar el número de pregunta
    const questionNumber = document.querySelector('.vf-question-number');
    if (questionNumber) {
        questionNumber.textContent = currentQuestion.id;
        console.log('Número de pregunta actualizado:', currentQuestion.id);
    }
    
    // Configurar las opciones con las respuestas del usuario
    setupAnsweredOptions(currentQuestion, userAnswer);
    
    // Actualizar la explicación
    const explanationText = document.querySelector('#vfExplanation p');
    if (explanationText) {
        explanationText.textContent = currentQuestion.explanation;
        console.log('Explicación actualizada:', currentQuestion.explanation);
    }
    
    // Actualizar barra de progreso
    updateProgressBar();
    
    // Actualizar botones de navegación
    updateNavigationButtons();
    
    // Actualizar título del quiz con el nombre del archivo
    if (quizTitle && fileName) {
        quizTitle.textContent = `Quiz: ${fileName}`;
    }
    
    console.log('=== PREGUNTA CONFIGURADA COMPLETAMENTE ===');
}

// ===== CONFIGURAR OPCIONES YA CONTESTADAS =====
function setupAnsweredOptions(currentQuestion, userAnswer) {
    console.log('=== CONFIGURANDO OPCIONES CONTESTADAS ===');
    console.log('Pregunta:', currentQuestion);
    console.log('Respuesta del usuario:', userAnswer);
    
    if (!userAnswer) {
        console.error('No hay respuesta del usuario para esta pregunta');
        return;
    }
    
    if (!vfOptions || vfOptions.length === 0) {
        console.error('No se encontraron las opciones del DOM');
        return;
    }
    
    console.log('Opciones encontradas:', vfOptions.length);
    
    vfOptions.forEach((option, index) => {
        const isCorrect = index === 0 ? currentQuestion.correctAnswer : !currentQuestion.correctAnswer;
        const isUserAnswer = index === 0 ? userAnswer.userAnswer : !userAnswer.userAnswer;
        
        console.log(`Opción ${index}:`, {
            isCorrect: isCorrect,
            isUserAnswer: isUserAnswer,
            userAnswerValue: userAnswer.userAnswer,
            userAnswerCorrect: userAnswer.isCorrect
        });
        
        // Limpiar clases anteriores
        option.classList.remove('correct', 'incorrect', 'answered');
        
        // Configurar el dataset
        option.dataset.correct = isCorrect.toString();
        option.dataset.option = index === 0 ? 'true' : 'false';
        
        // Actualizar el texto de la opción
        const optionText = option.querySelector('.vf-option-text');
        if (optionText) {
            optionText.textContent = index === 0 ? 'Verdadero' : 'Falso';
        }
        
        // Aplicar estilos según la respuesta del usuario
        if (isUserAnswer) {
            // Opción seleccionada por el usuario
            if (userAnswer.isCorrect) {
                option.classList.add('correct');
                console.log(`Opción ${index} marcada como correcta (usuario acertó)`);
            } else {
                option.classList.add('incorrect');
                console.log(`Opción ${index} marcada como incorrecta (usuario se equivocó)`);
            }
        } else if (isCorrect) {
            // Mostrar la respuesta correcta si el usuario se equivocó
            option.classList.add('correct');
            console.log(`Opción ${index} marcada como correcta (respuesta correcta)`);
        }
        
        // Marcar como contestada
        option.classList.add('answered');
        option.style.cursor = 'default';
        option.disabled = true;
        
        // Remover event listeners para evitar respuestas adicionales
        option.onclick = null;
        
        console.log(`Opción ${index} configurada:`, {
            classes: Array.from(option.classList),
            text: optionText?.textContent,
            disabled: option.disabled
        });
    });
    
    // Mostrar feedback
    showAnsweredFeedback(userAnswer.isCorrect);
    
    // Mostrar enlace de explicación
    if (explanationLink) {
        explanationLink.style.display = 'inline-flex';
        console.log('Enlace de explicación mostrado');
    }
    
    // Mostrar botón de continuar
    if (continueContainer) {
        continueContainer.style.display = 'flex';
        console.log('Botón continuar mostrado');
    }
    
    // Mostrar botón de volver a resultados
    const backToResultsContainer = document.getElementById('backToResultsContainer');
    if (backToResultsContainer) {
        backToResultsContainer.style.display = 'flex';
        console.log('Botón volver a resultados mostrado');
    }
    
    console.log('=== OPCIONES CONFIGURADAS COMPLETAMENTE ===');
}

// ===== MOSTRAR FEEDBACK DE PREGUNTA YA CONTESTADA =====
function showAnsweredFeedback(isCorrect) {
    if (vfFeedback) {
        vfFeedback.style.display = 'block';
        
        if (isCorrect) {
            feedbackText.textContent = '¡Correcto!';
            feedbackText.className = 'vf-feedback-text';
        } else {
            feedbackText.textContent = '¡Incorrecto!';
            feedbackText.className = 'vf-feedback-text incorrect';
        }
    }
}

// ===== FUNCIONES DE UTILIDAD =====
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ===== DEBUG: VERIFICAR ESTADO DE OPCIONES =====
function debugOptionsState() {
    console.log('=== DEBUG: Estado de las opciones ===');
    vfOptions.forEach((option, index) => {
        console.log(`Opción ${index + 1}:`, {
            text: option.querySelector('.vf-option-text')?.textContent,
            classes: Array.from(option.classList),
            dataset: option.dataset,
            cursor: option.style.cursor,
            disabled: option.disabled,
            isQuestionAnswered: isQuestionAnswered
        });
    });
    console.log('=== FIN DEBUG ===');
}

// ===== EXPORTAR FUNCIONES PARA USO EXTERNO =====
window.verdaderoFalso = {
    goToNextQuestion,
    goToPreviousQuestion,
    calculateScore,
    resetQuestionState,
    restartQuiz,
    debugOptionsState // Agregar función de debug
};


