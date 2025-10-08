/**
 * Inicializador del Historial - P.I.E.P.
 * Este archivo es cargado por main.js cuando se navega a la sección historial
 */

console.log('🔧 Cargando inicializador del historial...');

// Verificar que el DOM esté listo
function initHistorial() {
  console.log('🚀 Iniciando sistema de historial...');
  
  // Verificar que CONFIG esté disponible
  if (typeof CONFIG === 'undefined') {
    console.error('❌ CONFIG no está disponible');
    return;
  }
  
  console.log('✅ CONFIG disponible:', CONFIG);
  
  // Verificar que historial-unified.js esté cargado
  if (typeof HistorialUnified === 'undefined') {
    console.log('📦 Cargando historial-unified.js...');
    
    // Cargar historial-unified.js dinámicamente
    const script = document.createElement('script');
    script.src = '/JS/historial-unified.js';
    script.type = 'text/javascript';
    
    script.onload = () => {
      console.log('✅ historial-unified.js cargado exitosamente');
      
      // Esperar un poco para que se inicialice
      setTimeout(() => {
        if (typeof HistorialUnified !== 'undefined') {
          console.log('🎯 Inicializando HistorialUnified...');
          window.historialInstance = new HistorialUnified();
        } else {
          console.error('❌ HistorialUnified no está disponible después de cargar el script');
        }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('❌ Error cargando historial-unified.js:', error);
    };
    
    document.head.appendChild(script);
  } else {
    console.log('✅ HistorialUnified ya está disponible');
    console.log('🎯 Inicializando HistorialUnified...');
    window.historialInstance = new HistorialUnified();
  }
}

// Verificar autenticación
function checkAuth() {
  console.log('🔐 Verificando autenticación...');
  
  const session = localStorage.getItem('session');
  const user = localStorage.getItem('user');
  
  if (session && user) {
    try {
      const sessionData = JSON.parse(session);
      const userData = JSON.parse(user);
      
      console.log('✅ Usuario autenticado:', {
        email: userData.email,
        name: userData.name,
        token: sessionData.access_token ? 'Presente' : 'Ausente'
      });
      
      return true;
    } catch (error) {
      console.error('❌ Error parseando datos de sesión:', error);
      return false;
    }
  } else {
    console.warn('⚠️ No hay sesión activa');
    
    // Si estamos en localhost, crear sesión demo
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('🔧 Creando sesión demo para localhost...');
      if (typeof createDemoSession === 'function') {
        createDemoSession();
        return true;
      }
    }
    
    return false;
  }
}

// Función principal de inicialización
function main() {
  console.log('📜 Inicializador del historial ejecutándose...');
  
  // Verificar autenticación
  if (!checkAuth()) {
    console.error('❌ Usuario no autenticado, no se puede cargar el historial');
    
    // Mostrar mensaje de error en el contenedor
    const contentGrid = document.getElementById('contentGrid');
    if (contentGrid) {
      contentGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
          <h3>⚠️ Sesión no válida</h3>
          <p>Por favor, inicia sesión para ver tu historial.</p>
          <button onclick="window.location.href='/login.html'" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 10px;">
            Iniciar Sesión
          </button>
        </div>
      `;
    }
    return;
  }
  
  // Inicializar historial
  initHistorial();
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

console.log('📜 Inicializador del historial cargado');