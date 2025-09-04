// Script de debug temporal para diagnosticar problemas del home
console.log('🐛 DEBUG: Script de debug cargado');

// Función para diagnosticar el estado del home
window.debugHome = function() {
  console.log('🔍 DIAGNÓSTICO DEL HOME:');
  console.log('=======================');
  
  // Verificar elementos DOM
  const uploadBox = document.querySelector('.upload-box');
  const fileInput = document.querySelector('.file-input');
  const cards = document.querySelectorAll('.card');
  const loadingOverlay = document.getElementById('loadingOverlay');
  
  console.log('📋 ELEMENTOS DOM:');
  console.log('- uploadBox:', uploadBox ? '✅ Encontrado' : '❌ No encontrado');
  console.log('- fileInput:', fileInput ? '✅ Encontrado' : '❌ No encontrado');
  console.log('- cards:', cards.length, 'encontradas');
  console.log('- loadingOverlay:', loadingOverlay ? '✅ Encontrado' : '❌ No encontrado');
  
  // Verificar estado de las cards
  if (cards.length > 0) {
    console.log('📝 ESTADO DE LAS CARDS:');
    cards.forEach((card, index) => {
      const isDisabled = card.classList.contains('disabled');
      console.log(`- Card ${index + 1}:`, isDisabled ? '❌ Deshabilitada' : '✅ Habilitada');
    });
  }
  
  // Verificar variables globales
  console.log('🌍 VARIABLES GLOBALES:');
  console.log('- homeInitialized:', window.homeInitialized);
  console.log('- carouselInstance:', window.carouselInstance ? '✅ Existe' : '❌ No existe');
  console.log('- initializeHomeIfNeeded:', window.initializeHomeIfNeeded ? '✅ Existe' : '❌ No existe');
  
  // Verificar sistema de navegación
  console.log('🧭 SISTEMA DE NAVEGACIÓN:');
  console.log('- app disponible:', window.app ? '✅ Sí' : '❌ No');
  console.log('- app.loadSection:', window.app?.loadSection ? '✅ Sí' : '❌ No');
  console.log('- cargarSeccion global:', window.cargarSeccion ? '✅ Sí' : '❌ No');
  
  // Verificar elementos del carousel
  console.log('🎠 CAROUSEL:');
  const track = document.getElementById('carouselTrack');
  const slides = document.querySelectorAll('.carousel-slide');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const indicators = document.querySelectorAll('.indicator');
  
  console.log('- track:', track ? '✅ Encontrado' : '❌ No encontrado');
  console.log('- slides:', slides.length, 'encontradas');
  console.log('- prevBtn:', prevBtn ? '✅ Encontrado' : '❌ No encontrado');
  console.log('- nextBtn:', nextBtn ? '✅ Encontrado' : '❌ No encontrado');
  console.log('- indicators:', indicators.length, 'encontrados');
  
  if (track) {
    console.log('- track transform:', track.style.transform || 'none');
  }
  
  if (window.carouselInstance) {
    console.log('- carousel currentSlide:', window.carouselInstance.currentSlide);
    console.log('- carousel totalSlides:', window.carouselInstance.totalSlides);
  }
  
  console.log('=======================');
  console.log('🏁 Fin del diagnóstico');
};

// Función para testear el carousel manualmente
window.testCarousel = function() {
  console.log('🎠 PROBANDO CAROUSEL:');
  
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (prevBtn && nextBtn) {
    console.log('✅ Botones encontrados, simulando clics...');
    
    // Simular clic en nextBtn
    console.log('➡️ Simulando clic en siguiente...');
    nextBtn.click();
    
    setTimeout(() => {
      console.log('⬅️ Simulando clic en anterior...');
      prevBtn.click();
    }, 1000);
  } else {
    console.log('❌ Botones del carousel no encontrados');
  }
  
  // Verificar si hay instancia del carousel
  if (window.carouselInstance) {
    console.log('✅ Instancia del carousel encontrada');
    try {
      console.log('🔄 Intentando nextSlide() directamente...');
      window.carouselInstance.nextSlide();
    } catch (error) {
      console.error('❌ Error al ejecutar nextSlide():', error);
    }
  } else {
    console.log('❌ No hay instancia del carousel');
  }
};

// Ejecutar diagnóstico automáticamente después de 2 segundos
setTimeout(() => {
  console.log('🚀 Ejecutando diagnóstico automático...');
  window.debugHome();
}, 2000);