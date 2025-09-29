// Flashcards - JavaScript interactivo
let flashcardsData = [];
let currentCardIndex = 0;
let isFlipped = false;
let studyStats = {
  easy: 0,
  medium: 0,
  hard: 0
};

// Variables DOM
let flashcard, questionText, answerText, studyControls;
let cardCount, currentCardNumber, correctCount;
let progressFill, progressText, cardIndicator;
let prevBtn, nextBtn;

// Función para hacer llamadas a la API con autenticación
async function apiCall(url, options = {}) {
  const getAuthHeaders = () => {
    const session = localStorage.getItem('session');
    if (session) {
      const sessionData = JSON.parse(session);
      return {
        'Content-Type': 'application/json',
        'Authorization': sessionData.access_token ? `Bearer ${sessionData.access_token}` : ''
      };
    }
    return { 'Content-Type': 'application/json' };
  };

  const headers = getAuthHeaders();
  let finalHeaders = { ...headers, ...options.headers };
  
  if (options.body instanceof FormData) {
    delete finalHeaders['Content-Type'];
  }

  const config = {
    ...options,
    headers: finalHeaders
  };

  try {
    const baseUrl = window.location.origin;
    const response = await fetch(baseUrl + url, config);
    
    if (response.status === 401) {
      localStorage.removeItem('session');
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      window.location.replace('/login.html');
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error en API call:', error);
    throw error;
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎴 Inicializando Flashcards...');
  
  initializeElements();
  setupEventListeners();
  loadFlashcards();
});

// Inicializar elementos DOM
function initializeElements() {
  flashcard = document.getElementById('flashcard');
  questionText = document.getElementById('questionText');
  answerText = document.getElementById('answerText');
  studyControls = document.getElementById('studyControls');
  
  console.log('🔍 Inicializando elementos DOM:', {
    flashcard: !!flashcard,
    questionText: !!questionText,
    answerText: !!answerText,
    studyControls: !!studyControls
  });
  
  if (!flashcard || !questionText || !answerText) {
    console.error('❌ Elementos críticos no encontrados en el DOM');
    return;
  }
  
  cardCount = document.getElementById('cardCount');
  currentCardNumber = document.getElementById('currentCardNumber');
  correctCount = document.getElementById('correctCount');
  
  progressFill = document.getElementById('progressFill');
  progressText = document.getElementById('progressText');
  cardIndicator = document.getElementById('cardIndicator');
  
  prevBtn = document.getElementById('prevBtn');
  nextBtn = document.getElementById('nextBtn');
  
  console.log('✅ Todos los elementos DOM inicializados correctamente');
}

// Configurar event listeners
function setupEventListeners() {
  // Voltear tarjeta
  if (flashcard) {
    flashcard.addEventListener('click', flipCard);
  }

  // Navegación
  if (prevBtn) {
    prevBtn.addEventListener('click', previousCard);
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', nextCard);
  }

  // Botones de dificultad
  document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const difficulty = e.currentTarget.dataset.difficulty;
      rateDifficulty(difficulty);
    });
  });

  // Botones de acción
  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', shuffleCards);
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetStudySession);
  }

  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadFlashcards);
  }

  const backBtn = document.querySelector('.back-btn-modern');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.history.back();
    });
  }

  // Botones de resumen
  const studyAgainBtn = document.getElementById('studyAgainBtn');
  if (studyAgainBtn) {
    studyAgainBtn.addEventListener('click', resetStudySession);
  }

  const backToHistoryBtn = document.getElementById('backToHistoryBtn');
  if (backToHistoryBtn) {
    backToHistoryBtn.addEventListener('click', () => {
      // Navegación SPA preferida
      if (window.cargarSeccion) {
        window.cargarSeccion('historial');
      } else {
        // Fallback a la página unificada si no estamos en el SPA
        window.location.href = '/Pages/historial-unified.html';
      }
    });
  }

  const backToHistoryFromEmpty = document.getElementById('backToHistoryFromEmpty');
  if (backToHistoryFromEmpty) {
    backToHistoryFromEmpty.addEventListener('click', () => {
      // Navegación SPA preferida
      if (window.cargarSeccion) {
        window.cargarSeccion('historial');
      } else {
        // Fallback a la página unificada si no estamos en el SPA
        window.location.href = '/Pages/historial-unified.html';
      }
    });
  }

  const retryBtn = document.getElementById('retryBtn');
  if (retryBtn) {
    retryBtn.addEventListener('click', loadFlashcards);
  }

  // Teclas de navegación
  document.addEventListener('keydown', handleKeyPress);
}

// Manejo de teclas
function handleKeyPress(e) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    flipCard();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    previousCard();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextCard();
  } else if (e.key === '1') {
    rateDifficulty('easy');
  } else if (e.key === '2') {
    rateDifficulty('medium');
  } else if (e.key === '3') {
    rateDifficulty('hard');
  }
}

// Cargar flashcards
async function loadFlashcards() {
  try {
    showLoading();
    
    // Primero verificar si hay datos del historial en sessionStorage
    const historialData = sessionStorage.getItem('currentFlashcards');
    if (historialData) {
      console.log('📥 Cargando flashcards desde historial...');
      try {
        const flashcardData = JSON.parse(historialData);
        await processFlashcardData(flashcardData);
        // Limpiar sessionStorage después de usar
        sessionStorage.removeItem('currentFlashcards');
        return;
      } catch (error) {
        console.warn('⚠️ Error al procesar datos del historial, intentando desde API:', error);
        sessionStorage.removeItem('currentFlashcards');
      }
    }
    
    // Si no hay datos del historial, usar el método original con URL
    const urlParams = new URLSearchParams(window.location.search);
    const outputId = urlParams.get('id');
    
    if (!outputId) {
      throw new Error('ID de contenido no encontrado en la URL');
    }

    console.log('📥 Cargando flashcards desde API para ID:', outputId);
    
    const response = await apiCall(`/api/ai/content/${outputId}`);
    
    if (!response || !response.ok) {
      throw new Error(`Error al cargar flashcards: ${response?.status || 'Sin respuesta'}`);
    }
    
    const data = await response.json();
    await processFlashcardData(data);
  } catch (error) {
    console.error('❌ Error al cargar flashcards:', error);
    showError(error.message);
  }
}

// Función para procesar datos de flashcards (desde API o historial)
async function processFlashcardData(data) {
  try {
    console.log('📄 Procesando datos de flashcards:', data);
    
    // Si los datos vienen del historial, ya tienen la estructura correcta
    if (data.content && data.pdf_title) {
      console.log('📋 Datos del historial detectados');
      const content = data.content;
      await processFlashcardContent(content);
      
      // Actualizar título del documento si es posible
      const metaElement = document.getElementById('flashcardsMeta');
      if (metaElement && data.pdf_title) {
        metaElement.textContent = `Estudiando: ${data.pdf_title}`;
      }
      return;
    }
    
    console.log('📊 Estructura de datos de API:', {
      hasSuccess: !!data.success,
      hasContent: !!data.content,
      hasOutput: !!data.output,
      keys: Object.keys(data)
    });
    
    // Validar diferentes estructuras de respuesta
    let content = null;
    if (data.success && data.content) {
      content = data.content;
    } else if (data.output && data.output.content) {
      content = data.output.content;
    } else if (data.content) {
      content = data.content;
    } else if (data.output) {
      content = data.output;
    } else {
      console.error('❌ Estructura de datos no reconocida:', data);
      throw new Error('Contenido no encontrado o inválido');
    }
    
    console.log('📋 Contenido extraído:', content);
    await processFlashcardContent(content);
    
  } catch (error) {
    console.error('❌ Error procesando flashcards:', error);
    showError(error.message);
  }
}

// Función para procesar el contenido de flashcards
async function processFlashcardContent(content) {
  try {
    // Procesar flashcards
    let cards = [];
    
    console.log('🔍 Buscando flashcards en contenido:', Object.keys(content || {}));
    
    if (content && content.flashcards && Array.isArray(content.flashcards)) {
      cards = content.flashcards;
      console.log('✅ Encontradas flashcards en content.flashcards');
    } else if (content && content.tarjetas && Array.isArray(content.tarjetas)) {
      cards = content.tarjetas;
      console.log('✅ Encontradas tarjetas en content.tarjetas');
    } else if (content && content.cards && Array.isArray(content.cards)) {
      cards = content.cards;
      console.log('✅ Encontradas cards en content.cards');
    } else if (Array.isArray(content)) {
      // El contenido es directamente un array de flashcards
      cards = content;
      console.log('✅ Contenido es array directo de flashcards');
    } else {
      // Intentar extraer de otros formatos
      console.log('🔍 Buscando flashcards en formato alternativo...');
      cards = extractFlashcardsFromContent(content);
    }
    
    console.log('🎯 Total de tarjetas encontradas:', cards.length);

    if (!cards || cards.length === 0) {
      showEmptyState();
      return;
    }

    flashcardsData = cards.map((card, index) => ({
      id: index + 1,
      question: card.pregunta || card.question || card.frente || card.front || 'Pregunta no disponible',
      answer: card.respuesta || card.answer || card.reverso || card.back || 'Respuesta no disponible',
      difficulty: null,
      studied: false
    }));

    console.log('🎴 Flashcards procesadas:', flashcardsData.length);
    
    initializeStudySession();
    hideLoading();
    
  } catch (error) {
    console.error('❌ Error cargando flashcards:', error);
    showError(error.message);
  }
}

// Extraer flashcards de contenido alternativo
function extractFlashcardsFromContent(content) {
  const cards = [];
  
  console.log('🔍 Extrayendo de contenido alternativo:', content);
  
  // Intentar con diferentes estructuras
  if (typeof content === 'object' && content !== null) {
    Object.keys(content).forEach(key => {
      const lowerKey = key.toLowerCase();
      console.log(`🔑 Examinando clave: ${key}`);
      
      if (lowerKey.includes('flashcard') || 
          lowerKey.includes('tarjeta') || 
          lowerKey.includes('card') ||
          lowerKey.includes('pregunta') ||
          lowerKey.includes('question')) {
        const value = content[key];
        console.log(`📝 Valor para ${key}:`, value);
        
        if (Array.isArray(value)) {
          cards.push(...value);
          console.log(`✅ Agregadas ${value.length} tarjetas de ${key}`);
        } else if (typeof value === 'object' && value !== null) {
          // Si el valor es un objeto, podría ser una sola flashcard
          cards.push(value);
          console.log(`✅ Agregada 1 tarjeta de ${key}`);
        }
      }
    });
    
    // Si no encontramos nada específico, intentar parsear texto
    if (cards.length === 0) {
      console.log('🔤 Intentando parsear desde texto o markdown...');
      cards.push(...parseTextToFlashcards(content));
    }
  } else if (typeof content === 'string') {
    // Si el contenido es un string, intentar parsearlo
    console.log('📄 Parseando contenido de texto...');
    cards.push(...parseTextToFlashcards(content));
  }
  
  console.log(`📊 Extracción completada: ${cards.length} tarjetas`);
  return cards;
}

// Parsear texto a flashcards
function parseTextToFlashcards(content) {
  const cards = [];
  
  try {
    // Intentar parsear JSON
    if (typeof content === 'string' && content.trim().startsWith('{')) {
      const parsed = JSON.parse(content);
      return extractFlashcardsFromContent(parsed);
    }
    
    // Si es un objeto, buscar propiedades de texto que contengan flashcards
    if (typeof content === 'object') {
      Object.values(content).forEach(value => {
        if (typeof value === 'string' && value.includes('Pregunta:') || value.includes('P:')) {
          const parsedCards = parseMarkdownFlashcards(value);
          cards.push(...parsedCards);
        }
      });
    }
    
    // Si es texto, intentar parsearlo como markdown
    if (typeof content === 'string') {
      const parsedCards = parseMarkdownFlashcards(content);
      cards.push(...parsedCards);
    }
  } catch (error) {
    console.warn('⚠️ Error parseando contenido:', error);
  }
  
  return cards;
}

// Parsear flashcards desde formato markdown o texto
function parseMarkdownFlashcards(text) {
  const cards = [];
  
  // Patrones para buscar flashcards en texto
  const patterns = [
    /(?:^|\n)(?:Pregunta|P):\s*(.+?)\n(?:Respuesta|R):\s*(.+?)(?=\n(?:Pregunta|P):|$)/gims,
    /(?:^|\n)(?:Question|Q):\s*(.+?)\n(?:Answer|A):\s*(.+?)(?=\n(?:Question|Q):|$)/gims,
    /(?:^|\n)\*\*(.+?)\*\*\n(.+?)(?=\n\*\*|$)/gims
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      cards.push({
        pregunta: match[1].trim(),
        respuesta: match[2].trim()
      });
    }
  });
  
  return cards;
}

// Inicializar sesión de estudio
function initializeStudySession() {
  currentCardIndex = 0;
  isFlipped = false;
  studyStats = { easy: 0, medium: 0, hard: 0 };
  
  updateStats();
  displayCurrentCard();
  updateProgress();
  updateNavigation();
  
  // Mostrar área de estudio
  document.querySelector('.flashcard-study-area').style.display = 'flex';
  document.getElementById('studySummary').style.display = 'none';
}

// Mostrar tarjeta actual
function displayCurrentCard() {
  if (!flashcardsData || flashcardsData.length === 0) return;
  
  const currentCard = flashcardsData[currentCardIndex];
  
  console.log('📋 Mostrando tarjeta:', currentCard);
  
  if (questionText) {
    questionText.textContent = currentCard.question;
    questionText.innerHTML = currentCard.question; // También como HTML por si acaso
    console.log('✅ Pregunta configurada:', currentCard.question);
    console.log('🔍 Elemento questionText:', questionText, 'visible:', questionText.offsetParent !== null);
  } else {
    console.error('❌ questionText no existe');
  }
  
  if (answerText) {
    answerText.textContent = currentCard.answer;
    answerText.innerHTML = currentCard.answer; // También como HTML por si acaso
    console.log('✅ Respuesta configurada:', currentCard.answer);
    console.log('🔍 Elemento answerText:', answerText, 'visible:', answerText.offsetParent !== null);
    
    // Verificar estilos del elemento
    const computedStyle = window.getComputedStyle(answerText);
    console.log('🎨 Estilos de answerText:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      color: computedStyle.color,
      fontSize: computedStyle.fontSize
    });
  } else {
    console.error('❌ answerText no existe');
  }
  
  // Reset flip state
  isFlipped = false;
  if (flashcard) {
    flashcard.classList.remove('flipped');
    console.log('🔄 Flashcard reseteada, clase flipped removida');
  }
  
  // Ocultar controles de estudio
  if (studyControls) {
    studyControls.style.display = 'none';
  }
  
  updateStats();
  updateProgress();
  updateNavigation();
}

// Voltear tarjeta
function flipCard() {
  if (!flashcardsData || flashcardsData.length === 0) return;
  if (!flashcard) return;
  
  isFlipped = !isFlipped;
  
  console.log('🔄 Volteando tarjeta. Estado:', isFlipped ? 'Respuesta' : 'Pregunta');
  console.log('🔍 Clases actuales de flashcard:', flashcard.className);
  
  if (isFlipped) {
    flashcard.classList.add('flipped');
    console.log('👀 Mostrando respuesta:', flashcardsData[currentCardIndex].answer);
    console.log('🔍 Clases después de agregar flipped:', flashcard.className);
    
    // Verificar inmediatamente si la respuesta es visible
    setTimeout(() => {
      if (answerText) {
        const answerStyle = window.getComputedStyle(answerText);
        const answerParent = answerText.closest('.flashcard-back');
        const parentStyle = answerParent ? window.getComputedStyle(answerParent) : null;
        
        console.log('📊 Estado de visibilidad después del flip:', {
          answerText: {
            display: answerStyle.display,
            visibility: answerStyle.visibility,
            opacity: answerStyle.opacity,
            transform: answerStyle.transform,
            backfaceVisibility: answerStyle.backfaceVisibility
          },
          flashcardBack: parentStyle ? {
            display: parentStyle.display,
            visibility: parentStyle.visibility,
            opacity: parentStyle.opacity,
            transform: parentStyle.transform,
            backfaceVisibility: parentStyle.backfaceVisibility
          } : 'No encontrado'
        });
        
        console.log('📋 Contenido actual de answerText:', answerText.textContent);
      }
      
      if (studyControls) {
        studyControls.style.display = 'block';
        console.log('✅ Controles de estudio mostrados');
      }
    }, 300);
  } else {
    flashcard.classList.remove('flipped');
    console.log('👀 Mostrando pregunta:', flashcardsData[currentCardIndex].question);
    console.log('🔍 Clases después de remover flipped:', flashcard.className);
    if (studyControls) {
      studyControls.style.display = 'none';
    }
  }
}

// Calificar dificultad
function rateDifficulty(difficulty) {
  if (!flashcardsData || flashcardsData.length === 0) return;
  
  const currentCard = flashcardsData[currentCardIndex];
  currentCard.difficulty = difficulty;
  currentCard.studied = true;
  studyStats[difficulty]++;
  
  // Avanzar automáticamente a la siguiente tarjeta
  setTimeout(() => {
    nextCard();
  }, 500);
}

// Tarjeta anterior
function previousCard() {
  if (currentCardIndex > 0) {
    currentCardIndex--;
    displayCurrentCard();
  }
}

// Siguiente tarjeta
function nextCard() {
  if (currentCardIndex < flashcardsData.length - 1) {
    currentCardIndex++;
    displayCurrentCard();
  } else {
    // Fin de la sesión
    showStudySummary();
  }
}

// Mezclar tarjetas
function shuffleCards() {
  if (!flashcardsData || flashcardsData.length === 0) return;
  
  // Algoritmo Fisher-Yates shuffle
  for (let i = flashcardsData.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [flashcardsData[i], flashcardsData[j]] = [flashcardsData[j], flashcardsData[i]];
  }
  
  // Reinicializar sesión
  resetStudySession();
  
  showSuccess('¡Tarjetas mezcladas!');
}

// Reiniciar sesión de estudio
function resetStudySession() {
  currentCardIndex = 0;
  isFlipped = false;
  studyStats = { easy: 0, medium: 0, hard: 0 };
  
  // Reset all cards
  flashcardsData.forEach(card => {
    card.difficulty = null;
    card.studied = false;
  });
  
  initializeStudySession();
}

// Descargar flashcards
function downloadFlashcards() {
  if (!flashcardsData || flashcardsData.length === 0) return;
  
  try {
    let content = 'Tarjetas de Estudio - StudyAI\n';
    content += '=================================\n\n';
    
    flashcardsData.forEach((card, index) => {
      content += `Tarjeta ${index + 1}:\n`;
      content += `Pregunta: ${card.question}\n`;
      content += `Respuesta: ${card.answer}\n`;
      if (card.difficulty) {
        content += `Dificultad: ${card.difficulty}\n`;
      }
      content += '\n---\n\n';
    });
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards-study-ai.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('¡Flashcards descargadas!');
  } catch (error) {
    console.error('Error descargando flashcards:', error);
    showError('Error al descargar las flashcards');
  }
}

// Actualizar estadísticas
function updateStats() {
  if (cardCount) {
    cardCount.textContent = flashcardsData.length;
  }
  if (currentCardNumber) {
    currentCardNumber.textContent = currentCardIndex + 1;
  }
  if (correctCount) {
    const studied = flashcardsData.filter(card => card.studied).length;
    correctCount.textContent = studied;
  }
}

// Actualizar progreso
function updateProgress() {
  const studied = flashcardsData.filter(card => card.studied).length;
  const total = flashcardsData.length;
  const percentage = total > 0 ? (studied / total) * 100 : 0;
  
  if (progressFill) {
    progressFill.style.width = percentage + '%';
  }
  if (progressText) {
    progressText.textContent = `${studied} / ${total}`;
  }
  if (cardIndicator) {
    cardIndicator.textContent = `${currentCardIndex + 1} / ${total}`;
  }
}

// Actualizar navegación
function updateNavigation() {
  if (prevBtn) {
    prevBtn.disabled = currentCardIndex === 0;
  }
  if (nextBtn) {
    const isLastCard = currentCardIndex === flashcardsData.length - 1;
    nextBtn.textContent = isLastCard ? 'Finalizar' : 'Siguiente';
  }
}

// Mostrar resumen de estudio
function showStudySummary() {
  const studySummary = document.getElementById('studySummary');
  const flashcardStudyArea = document.querySelector('.flashcard-study-area');
  
  if (studySummary && flashcardStudyArea) {
    flashcardStudyArea.style.display = 'none';
    studySummary.style.display = 'block';
    
    // Actualizar estadísticas del resumen
    document.getElementById('totalStudied').textContent = flashcardsData.length;
    document.getElementById('easyCards').textContent = studyStats.easy;
    document.getElementById('mediumCards').textContent = studyStats.medium;
    document.getElementById('hardCards').textContent = studyStats.hard;
    
    // Guardar sesión de estudio en el historial
    saveStudySession();
  }
}

// Estados de UI
function showLoading() {
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const emptyState = document.getElementById('emptyState');
  const studyArea = document.querySelector('.flashcard-study-area');
  
  if (loadingState) loadingState.style.display = 'flex';
  if (errorState) errorState.style.display = 'none';
  if (emptyState) emptyState.style.display = 'none';
  if (studyArea) studyArea.style.display = 'none';
}

function hideLoading() {
  const loadingState = document.getElementById('loadingState');
  if (loadingState) loadingState.style.display = 'none';
}

function showError(message) {
  const errorState = document.getElementById('errorState');
  const loadingState = document.getElementById('loadingState');
  const studyArea = document.querySelector('.flashcard-study-area');
  
  if (errorState) {
    errorState.style.display = 'flex';
    const errorP = errorState.querySelector('p');
    if (errorP) {
      errorP.textContent = message || 'Error al cargar las flashcards';
    }
  }
  if (loadingState) loadingState.style.display = 'none';
  if (studyArea) studyArea.style.display = 'none';
}

function showEmptyState() {
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const studyArea = document.querySelector('.flashcard-study-area');
  
  if (emptyState) emptyState.style.display = 'flex';
  if (loadingState) loadingState.style.display = 'none';
  if (studyArea) studyArea.style.display = 'none';
}

// Funciones de notificación
function showSuccess(message) {
  // Crear notificación temporal
  const notification = document.createElement('div');
  notification.className = 'success-notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    z-index: 1000;
    font-weight: 500;
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Guardar sesión de estudio en el historial
async function saveStudySession() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const outputId = urlParams.get('id');
    
    if (!outputId) {
      console.warn('❌ No se puede guardar sesión: ID de contenido no encontrado');
      return;
    }
    
    // Calcular puntuación basada en dificultad
    const totalCards = flashcardsData.length;
    const easyScore = studyStats.easy * 100; // Tarjetas fáciles = 100 puntos c/u
    const mediumScore = studyStats.medium * 70; // Tarjetas medias = 70 puntos c/u
    const hardScore = studyStats.hard * 40; // Tarjetas difíciles = 40 puntos c/u
    const maxScore = totalCards * 100;
    const finalScore = Math.round(((easyScore + mediumScore + hardScore) / maxScore) * 100);
    
    // Crear resumen detallado de la sesión
    const sessionDetails = {
      total_cards: totalCards,
      cards_studied: studyStats.easy + studyStats.medium + studyStats.hard,
      difficulty_breakdown: {
        easy: studyStats.easy,
        medium: studyStats.medium, 
        hard: studyStats.hard
      },
      score: finalScore,
      completion_time: new Date().toISOString(),
      cards_details: flashcardsData.map(card => ({
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty,
        studied: card.studied
      }))
    };
    
    console.log('💾 Guardando sesión de estudio:', {
      outputId,
      sessionDetails
    });
    
    const requestBody = {
      output_id: parseInt(outputId),
      interaction_type: 'flashcards_study',
      score: finalScore
    };
    
    console.log('📤 Enviando request body:', requestBody);
    
    const response = await apiCall('/api/study/progress', {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 Response status:', response?.status);
    
    if (response && response.ok) {
      const result = await response.json();
      console.log('✅ Sesión de estudio guardada exitosamente:', result);
      
      // También guardar localmente por si acaso
      const sessionData = {
        id: result.progress?.id || Date.now(),
        type: 'flashcards',
        session_details: sessionDetails,
        saved_at: new Date().toISOString()
      };
      
      // Guardar en localStorage como backup
      const savedSessions = JSON.parse(localStorage.getItem('flashcard_sessions') || '[]');
      savedSessions.push(sessionData);
      localStorage.setItem('flashcard_sessions', JSON.stringify(savedSessions));
      
      showSuccess('¡Sesión guardada en el historial!');
    } else {
      const errorText = await response?.text();
      console.error('❌ Error en response:', errorText);
      throw new Error(`Error ${response?.status}: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error guardando sesión de estudio:', error);
    
    // Guardar localmente como fallback
    try {
      const sessionData = {
        id: Date.now(),
        type: 'flashcards',
        error: error.message,
        session_details: {
          total_cards: flashcardsData.length,
          stats: studyStats,
          saved_at: new Date().toISOString()
        }
      };
      
      const failedSessions = JSON.parse(localStorage.getItem('failed_sessions') || '[]');
      failedSessions.push(sessionData);
      localStorage.setItem('failed_sessions', JSON.stringify(failedSessions));
      
      console.log('💾 Sesión guardada localmente como fallback');
    } catch (localError) {
      console.error('❌ Error guardando localmente:', localError);
    }
  }
}

// CSS para animaciones (agregar al head si no existe)
if (!document.querySelector('#flashcards-animations')) {
  const style = document.createElement('style');
  style.id = 'flashcards-animations';
  style.textContent = `
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `;
  document.head.appendChild(style);
}

// Función de prueba para diagnosticar el problema
function testFlashcardDisplay() {
  console.log('🧪 Iniciando test de flashcards...');
  
  // Verificar elementos DOM
  const elements = {
    flashcard: document.getElementById('flashcard'),
    questionText: document.getElementById('questionText'),
    answerText: document.getElementById('answerText'),
    flashcardFront: document.querySelector('.flashcard-front'),
    flashcardBack: document.querySelector('.flashcard-back')
  };
  
  console.log('📋 Elementos encontrados:', elements);
  
  // Crear datos de prueba
  const testCard = {
    question: "¿Cuál es la capital de Francia?",
    answer: "París es la capital de Francia y una de las ciudades más importantes del mundo."
  };
  
  // Configurar datos de prueba
  if (elements.questionText) {
    elements.questionText.textContent = testCard.question;
    console.log('✅ Pregunta configurada:', elements.questionText.textContent);
  }
  
  if (elements.answerText) {
    elements.answerText.textContent = testCard.answer;
    console.log('✅ Respuesta configurada:', elements.answerText.textContent);
  }
  
  // Probar flip
  setTimeout(() => {
    if (elements.flashcard) {
      console.log('🔄 Aplicando flip...');
      elements.flashcard.classList.add('flipped');
      
      setTimeout(() => {
        console.log('🔍 Estado después del flip:');
        if (elements.answerText) {
          const answerStyle = window.getComputedStyle(elements.answerText);
          const backStyle = window.getComputedStyle(elements.flashcardBack);
          
          console.log('📊 Estilos de respuesta:', {
            display: answerStyle.display,
            visibility: answerStyle.visibility,
            opacity: answerStyle.opacity,
            color: answerStyle.color,
            fontSize: answerStyle.fontSize,
            transform: backStyle.transform,
            backfaceVisibility: backStyle.backfaceVisibility
          });
          
          console.log('📋 Contenido visible:', elements.answerText.textContent);
          console.log('📐 Dimensiones:', {
            width: elements.answerText.offsetWidth,
            height: elements.answerText.offsetHeight,
            parent: elements.flashcardBack.offsetWidth + 'x' + elements.flashcardBack.offsetHeight
          });
        }
      }, 600);
    }
  }, 1000);
}

// Exportar funciones para uso global
window.flashcardsApp = {
  loadFlashcards,
  resetStudySession,
  shuffleCards,
  downloadFlashcards,
  testFlashcardDisplay
};

console.log('🎴 Flashcards JavaScript cargado correctamente');